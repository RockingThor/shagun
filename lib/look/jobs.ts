import { readFile } from "node:fs/promises";
import path from "node:path";
import { catalog, itemById, type CatalogItem, type Occasion } from "@/data/catalog";
import { portraitSvg } from "@/lib/demo-portrait";
import { hashBytes, hashLookCacheKey } from "@/lib/look/cache-key";
import {
  CHAIN_STEPS,
  STEP_META,
  lookIdForStep,
  sourceStep,
  stepsFrom,
  type ChainStep,
  type LookIds,
} from "@/lib/look/chain";
import { pickLook, type PickedLook } from "@/lib/look/picker";
import { getCachedStep, setCachedStep } from "@/lib/youcam/cache";
import {
  createYouCamTask,
  getYouCamTask,
  refFields,
  sourceFields,
  uploadToYouCam,
  YouCamApiError,
} from "@/lib/youcam/client";
import type { ImageSource } from "@/lib/youcam/types";
import { hairTemplateOverride, youcamConfig } from "@/lib/youcam/config";

export type StepState = {
  id: ChainStep;
  status: "pending" | "running" | "success" | "error" | "cached";
  imageUrl?: string;
  dstId?: string;
  youcamTaskId?: string;
  error?: string;
  units: number;
  startedAt?: number;
};

export type LookJob = {
  id: string;
  createdAt: number;
  demoMode: boolean;
  occasion: Occasion;
  budget: number;
  look: LookIds;
  picked: PickedLook;
  imageHash: string;
  selfiePreviewUrl: string;
  fromStep: ChainStep;
  currentStep: ChainStep;
  status: "running" | "success" | "error";
  error?: string;
  steps: Record<ChainStep, StepState>;
  unitsUsed: number;
};

type StoredUpload = {
  hash: string;
  bytes: Buffer;
  contentType: string;
  fileName: string;
  previewUrl: string;
  youcamFileId?: string;
};

type Memory = {
  jobs: Map<string, LookJob>;
  uploads: Map<string, StoredUpload>;
  catalogYouCamIds: Map<string, string>;
};

const globalForJobs = globalThis as typeof globalThis & {
  __shagunJobs?: Memory;
};

const memory: Memory =
  globalForJobs.__shagunJobs ??
  (globalForJobs.__shagunJobs = {
    jobs: new Map(),
    uploads: new Map(),
    catalogYouCamIds: new Map(),
  });

const DEMO_SELFIE_HASH = "demo-selfie";

function newId(): string {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptySteps(): Record<ChainStep, StepState> {
  return Object.fromEntries(
    CHAIN_STEPS.map((id) => [
      id,
      { id, status: "pending" as const, units: STEP_META[id].units },
    ]),
  ) as Record<ChainStep, StepState>;
}

export function getJob(id: string): LookJob | undefined {
  return memory.jobs.get(id);
}

export function storeUpload(file: StoredUpload): StoredUpload {
  memory.uploads.set(file.hash, file);
  return file;
}

export function getUpload(hash: string): StoredUpload | undefined {
  return memory.uploads.get(hash);
}

export function demoSelfieHash(): string {
  return DEMO_SELFIE_HASH;
}

function lookItems(ids: LookIds): PickedLook {
  const outfit = itemById(ids.outfitId);
  const earrings = itemById(ids.earringId);
  const hairstyle = itemById(ids.hairId);
  const lip = itemById(ids.lipId);
  if (!outfit || !earrings || !hairstyle || !lip) {
    throw new Error("Look references an unknown catalog item");
  }
  const items = [outfit, earrings, hairstyle, lip];
  const total = items.reduce((sum, item) => sum + item.priceInr, 0);
  return {
    ids,
    outfit,
    earrings,
    hairstyle,
    lip,
    items,
    total,
    withinBudget: true,
    leftover: 0,
  };
}

function demoPortraitUrl(look: LookIds, step: ChainStep | "selfie"): string {
  const params = new URLSearchParams({
    outfit: look.outfitId,
    earrings: look.earringId,
    hair: look.hairId,
    lip: look.lipId,
    step,
  });
  return `/api/demo/portrait?${params.toString()}`;
}

async function readPublicFile(publicPath: string): Promise<{
  bytes: Buffer;
  contentType: string;
  fileName: string;
}> {
  const relative = publicPath.replace(/^\//, "");
  const bytes = await readFile(path.join(process.cwd(), "public", relative));
  const ext = path.extname(relative).toLowerCase();
  const contentType =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".svg"
          ? "image/svg+xml"
          : "image/jpeg";
  return { bytes, contentType, fileName: path.basename(relative) };
}

function isRaster(contentType: string): boolean {
  return (
    contentType === "image/jpeg" ||
    contentType === "image/jpg" ||
    contentType === "image/png" ||
    contentType === "image/webp"
  );
}

async function youcamIdForCatalog(item: CatalogItem): Promise<ImageSource> {
  const cached = memory.catalogYouCamIds.get(item.id);
  if (cached) return { fileId: cached };
  const file = await readPublicFile(item.image);
  if (!isRaster(file.contentType)) {
    throw new Error(
      `${item.name} is still a placeholder SVG. Replace ${item.image} with a JPG or PNG before live YouCam VTO.`,
    );
  }
  const fileId = await uploadToYouCam(file);
  memory.catalogYouCamIds.set(item.id, fileId);
  return { fileId };
}

async function sourceFor(
  job: LookJob,
  step: ChainStep,
): Promise<ImageSource> {
  const prev = sourceStep(step);
  if (prev === "selfie") {
    const upload = memory.uploads.get(job.imageHash);
    if (upload?.youcamFileId) return { fileId: upload.youcamFileId };
    if (upload && isRaster(upload.contentType)) {
      upload.youcamFileId = await uploadToYouCam({
        bytes: upload.bytes,
        contentType: upload.contentType,
        fileName: upload.fileName,
      });
      return { fileId: upload.youcamFileId };
    }
    if (job.imageHash === DEMO_SELFIE_HASH) {
      throw new Error(
        "Live mode needs a real JPG/PNG selfie. The illustrated sample is demo-only.",
      );
    }
    throw new Error("Selfie is missing or is not a JPG/PNG.");
  }
  const previous = job.steps[prev];
  if (previous.dstId) return { fileId: previous.dstId };
  if (previous.imageUrl) return { url: previous.imageUrl };
  throw new Error(`Missing chained result from ${prev}`);
}

function payloadForStep(
  step: ChainStep,
  source: ImageSource,
  item: CatalogItem,
  ref: ImageSource | undefined,
): Record<string, unknown> {
  const config = youcamConfig();
  const src = sourceFields(source);
  if (step === "clothes") {
    return {
      ...src,
      ...refFields(ref!),
      garment_category: item.garmentCategory ?? "upper_body",
    };
  }
  if (step === "earrings") {
    return {
      ...src,
      ...refFields(ref!, { array: true }),
    };
  }
  if (step === "hair") {
    const template =
      hairTemplateOverride(item.id) ?? item.youcamTemplateId;
    if (template) return { ...src, template_id: template };
    return { ...src, ...refFields(ref!) };
  }
  const hex = item.lipHex ?? item.swatch;
  const texture = item.lipTexture ?? "matte";
  const palette: Record<string, unknown> = {
    color: hex,
    texture,
    colorIntensity: 70,
  };
  if (texture === "gloss") {
    palette.gloss = 70;
    palette.transparencyIntensity = 35;
  }
  return {
    ...src,
    version: "1.0",
    effects: [
      {
        category: "lip_color",
        shape: { name: config.lipShape },
        style: { type: "full" },
        palettes: [palette],
      },
    ],
  };
}

function featurePath(step: ChainStep): string {
  const config = youcamConfig();
  if (step === "clothes") return config.clothesPath;
  if (step === "earrings") return config.earringPath;
  if (step === "hair") return config.hairPath;
  return config.makeupPath;
}

function needsRef(step: ChainStep): boolean {
  return step === "clothes" || step === "earrings" || step === "hair";
}

async function startLiveStep(
  job: LookJob,
  step: ChainStep,
): Promise<StepState["status"]> {
  const state = job.steps[step];
  const item = itemById(lookIdForStep(job.look, step));
  if (!item) throw new Error(`Missing item for ${step}`);

  const cacheKey = hashLookCacheKey(job.imageHash, job.look, step);
  const cached = getCachedStep(cacheKey);
  if (cached) {
    state.status = "cached";
    state.imageUrl = cached.imageUrl;
    state.dstId = cached.dstId;
    return state.status;
  }

  const source = await sourceFor(job, step);
  let ref: ImageSource | undefined;
  if (needsRef(step)) {
    if (step === "hair" && (hairTemplateOverride(item.id) || item.youcamTemplateId)) {
      ref = undefined;
    } else {
      ref = await youcamIdForCatalog(item);
    }
  }
  const body = payloadForStep(step, source, item, ref);
  state.youcamTaskId = await createYouCamTask(featurePath(step), body);
  state.status = "running";
  state.startedAt = Date.now();
  return state.status;
}

async function pollLiveStep(
  job: LookJob,
  step: ChainStep,
): Promise<StepState["status"]> {
  const state = job.steps[step];
  if (!state.youcamTaskId) {
    return startLiveStep(job, step);
  }
  const parsed = await getYouCamTask(featurePath(step), state.youcamTaskId);
  if (parsed.taskStatus === "running" || parsed.taskStatus === "pending") {
    state.status = "running";
    return state.status;
  }
  if (parsed.taskStatus === "success" && parsed.url) {
    state.status = "success";
    state.imageUrl = parsed.url;
    state.dstId = parsed.dstId;
    job.unitsUsed += state.units;
    setCachedStep(hashLookCacheKey(job.imageHash, job.look, step), {
      imageUrl: parsed.url,
      dstId: parsed.dstId,
    });
    return state.status;
  }
  state.status = "error";
  state.error =
    parsed.error || `YouCam ${step} ended with status ${parsed.taskStatus}`;
  job.status = "error";
  job.error = state.error;
  return state.status;
}

function advanceDemo(job: LookJob) {
  const queue = stepsFrom(job.fromStep);
  const elapsed = Date.now() - job.createdAt;
  const slice = 900;
  queue.forEach((step, index) => {
    const state = job.steps[step];
    const opensAt = index * slice;
    const doneAt = opensAt + slice;
    if (elapsed < opensAt) {
      state.status = "pending";
      return;
    }
    if (elapsed < doneAt) {
      state.status = "running";
      state.startedAt = job.createdAt + opensAt;
      job.currentStep = step;
      const previous = sourceStep(step);
      state.imageUrl =
        previous === "selfie"
          ? job.selfiePreviewUrl
          : job.steps[previous].imageUrl;
      return;
    }
    state.status = "success";
    state.imageUrl = demoPortraitUrl(job.look, step);
    job.unitsUsed = queue
      .slice(0, index + 1)
      .reduce((sum, id) => sum + STEP_META[id].units, 0);
  });
  const last = queue[queue.length - 1]!;
  if (elapsed >= queue.length * slice) {
    job.status = "success";
    job.currentStep = last;
    job.steps[last].imageUrl = demoPortraitUrl(job.look, last);
  }
}

export async function createLookJob(input: {
  imageHash: string;
  occasion: Occasion;
  budget: number;
  look?: LookIds;
  fromStep?: ChainStep;
  selfiePreviewUrl?: string;
}): Promise<LookJob> {
  ensureDemoSelfie();
  const config = youcamConfig();
  const picked = input.look
    ? lookItems(input.look)
    : pickLook(catalog, input.occasion, input.budget);
  picked.withinBudget = picked.total <= input.budget;
  picked.leftover = input.budget - picked.total;

  const fromStep = input.fromStep ?? "clothes";
  const upload = memory.uploads.get(input.imageHash);
  const selfiePreviewUrl =
    input.selfiePreviewUrl ||
    upload?.previewUrl ||
    (input.imageHash === DEMO_SELFIE_HASH
      ? demoPortraitUrl(picked.ids, "selfie")
      : "/demo/selfie.svg");

  const job: LookJob = {
    id: newId(),
    createdAt: Date.now(),
    demoMode: config.demoMode,
    occasion: input.occasion,
    budget: input.budget,
    look: picked.ids,
    picked,
    imageHash: input.imageHash,
    selfiePreviewUrl,
    fromStep,
    currentStep: fromStep,
    status: "running",
    steps: emptySteps(),
    unitsUsed: 0,
  };

  for (const step of CHAIN_STEPS) {
    if (stepsFrom(fromStep).includes(step)) continue;
    const prior = job.steps[step];
    prior.status = "success";
    prior.imageUrl = config.demoMode
      ? demoPortraitUrl(job.look, step)
      : undefined;
    const cached = getCachedStep(
      hashLookCacheKey(job.imageHash, job.look, step),
    );
    if (cached) {
      prior.imageUrl = cached.imageUrl;
      prior.dstId = cached.dstId;
      prior.status = "cached";
    }
  }

  if (config.demoMode) {
    advanceDemo(job);
  } else {
    try {
      await startLiveStep(job, fromStep);
      job.currentStep = fromStep;
    } catch (error) {
      job.status = "error";
      job.error = error instanceof Error ? error.message : "Could not start YouCam";
      job.steps[fromStep].status = "error";
      job.steps[fromStep].error = job.error;
    }
  }

  memory.jobs.set(job.id, job);
  return job;
}

export async function tickJob(job: LookJob): Promise<LookJob> {
  if (job.status !== "running") return job;
  if (job.demoMode) {
    advanceDemo(job);
    return job;
  }

  const queue = stepsFrom(job.fromStep);
  for (const step of queue) {
    const state = job.steps[step];
    if (state.status === "success" || state.status === "cached") continue;
    if (state.status === "error") {
      job.status = "error";
      return job;
    }
    job.currentStep = step;
    let after: StepState["status"];
    try {
      after =
        state.status === "pending"
          ? await startLiveStep(job, step)
          : await pollLiveStep(job, step);
    } catch (error) {
      const message =
        error instanceof YouCamApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "YouCam request failed";
      state.status = "error";
      state.error = message;
      job.status = "error";
      job.error = message;
      return job;
    }
    if (after !== "success" && after !== "cached") {
      return job;
    }
  }

  const last = queue[queue.length - 1]!;
  if (
    job.steps[last].status === "success" ||
    job.steps[last].status === "cached"
  ) {
    job.status = "success";
    job.currentStep = last;
  }
  return job;
}

export function serializeJob(job: LookJob) {
  const queue = stepsFrom(job.fromStep);
  const last = queue[queue.length - 1]!;
  const currentImage =
    job.steps[job.currentStep].imageUrl ||
    [...queue]
      .reverse()
      .map((step) => job.steps[step].imageUrl)
      .find(Boolean) ||
    job.selfiePreviewUrl;

  return {
    jobId: job.id,
    status: job.status,
    demoMode: job.demoMode,
    error: job.error ?? null,
    occasion: job.occasion,
    budget: job.budget,
    look: job.look,
    items: job.picked.items,
    total: job.picked.total,
    withinBudget: job.picked.withinBudget,
    leftover: job.picked.leftover,
    fromStep: job.fromStep,
    currentStep: job.currentStep,
    selfiePreviewUrl: job.selfiePreviewUrl,
    currentImageUrl: currentImage,
    finalImageUrl:
      job.status === "success" ? job.steps[last].imageUrl ?? null : null,
    unitsUsed: job.unitsUsed,
    unitsPlanned: queue.reduce((sum, step) => sum + STEP_META[step].units, 0),
    steps: CHAIN_STEPS.map((id) => ({
      id,
      label: STEP_META[id].label,
      api: STEP_META[id].api,
      detail: STEP_META[id].detail,
      units: STEP_META[id].units,
      status: job.steps[id].status,
      imageUrl: job.steps[id].imageUrl ?? null,
      error: job.steps[id].error ?? null,
    })),
  };
}

export function hashBuffer(bytes: Buffer): string {
  return hashBytes(bytes);
}

function ensureDemoSelfie(): void {
  if (memory.uploads.has(DEMO_SELFIE_HASH)) return;
  const svg = Buffer.from(
    portraitSvg({
      look: {
        outfitId: "ivory-cape",
        earringId: "pearl-drops",
        hairId: "sleek-part",
        lipId: "marigold-nude",
      },
      step: "selfie",
      caption: "Sample selfie",
    }),
  );
  memory.uploads.set(DEMO_SELFIE_HASH, {
    hash: DEMO_SELFIE_HASH,
    bytes: svg,
    contentType: "image/svg+xml",
    fileName: "selfie.svg",
    previewUrl: "/demo/selfie.svg",
  });
}
