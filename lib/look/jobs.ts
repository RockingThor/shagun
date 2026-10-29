import { readFile } from "node:fs/promises";
import path from "node:path";
import { catalog, itemById, type CatalogItem, type Occasion } from "@/data/catalog";
import { DEMO_SELFIE, demoImageFor } from "@/lib/demo-renders";
import { hashBytes, hashLookCacheKey } from "@/lib/look/cache-key";
import {
  CHAIN_STEPS,
  EARLOBE_NOTE,
  STEP_META,
  isEarlobeError,
  lookIdForStep,
  resolveSourceStep,
  skipEarrings,
  stepsFrom,
  type ChainStep,
  type LookIds,
} from "@/lib/look/chain";
import { pickLook, type PickedLook } from "@/lib/look/picker";
import { getCachedStep, setCachedStep } from "@/lib/youcam/cache";
import {
  createYouCamTask,
  getYouCamTask,
  uploadToYouCam,
  YouCamApiError,
} from "@/lib/youcam/client";
import { youcamConfig } from "@/lib/youcam/config";
import {
  clothesPayload,
  earringPayload,
  hairPayload,
  hairTemplateId,
  lipstickPayload,
} from "@/lib/youcam/payloads";
import { fetchAsJpeg, prepareJpeg } from "@/lib/youcam/prepare";
import type { ImageSource } from "@/lib/youcam/types";

export type StepState = {
  id: ChainStep;
  status: "pending" | "running" | "success" | "error" | "cached" | "skipped";
  imageUrl?: string;
  dstId?: string;
  youcamTaskId?: string;
  error?: string;
  note?: string;
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
  note?: string;
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
  const items = [outfit, hairstyle, earrings, lip];
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

async function uploadJpeg(input: {
  bytes: Buffer;
  contentType?: string;
  fileName: string;
}): Promise<string> {
  const jpeg = await prepareJpeg(input.bytes);
  return uploadToYouCam({
    bytes: jpeg.bytes,
    contentType: jpeg.contentType,
    fileName: input.fileName.replace(/\.[^.]+$/, ".jpg"),
  });
}

async function youcamIdForCatalog(item: CatalogItem): Promise<ImageSource> {
  const cached = memory.catalogYouCamIds.get(item.id);
  if (cached) return { fileId: cached };
  const file = await readPublicFile(item.image);
  if (!isRaster(file.contentType)) {
    throw new Error(
      `${item.name} needs a JPG or PNG at ${item.image} for live YouCam VTO.`,
    );
  }
  const fileId = await uploadJpeg(file);
  memory.catalogYouCamIds.set(item.id, fileId);
  return { fileId };
}

async function sourceFor(
  job: LookJob,
  step: ChainStep,
): Promise<ImageSource> {
  const prev = resolveSourceStep(job.steps, step);
  if (prev === "selfie") {
    const upload = memory.uploads.get(job.imageHash);
    if (upload?.youcamFileId) return { fileId: upload.youcamFileId };
    if (upload && isRaster(upload.contentType)) {
      upload.youcamFileId = await uploadJpeg(upload);
      return { fileId: upload.youcamFileId };
    }
    if (job.imageHash === DEMO_SELFIE_HASH) {
      const file = await readPublicFile(DEMO_SELFIE);
      const fileId = await uploadJpeg(file);
      const stored = memory.uploads.get(DEMO_SELFIE_HASH);
      if (stored) stored.youcamFileId = fileId;
      return { fileId };
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
  if (step === "clothes") return clothesPayload(source, ref!, item.garmentCategory);
  if (step === "hair") {
    const template = hairTemplateId(item);
    if (!template) throw new Error(`${item.name} is missing a hair template_id`);
    return hairPayload(source, template);
  }
  if (step === "earrings") return earringPayload(source, ref!);
  return lipstickPayload(source, item, config.lipShape);
}

function featurePath(step: ChainStep): string {
  const config = youcamConfig();
  if (step === "clothes") return config.clothesPath;
  if (step === "earrings") return config.earringPath;
  if (step === "hair") return config.hairPath;
  return config.makeupPath;
}

function applyEarringSkip(job: LookJob, reason?: string) {
  const skipped = skipEarrings(job.steps.hair.imageUrl);
  const state = job.steps.earrings;
  state.status = "skipped";
  state.imageUrl = skipped.imageUrl;
  state.note = skipped.note;
  state.error = reason;
  job.note = skipped.note;
}

async function startLiveStep(
  job: LookJob,
  step: ChainStep,
): Promise<StepState["status"]> {
  const state = job.steps[step];
  const item = itemById(lookIdForStep(job.look, step));
  if (!item) throw new Error(`Missing item for ${step}`);

  if (step === "earrings") {
    const hairItem = itemById(job.look.hairId);
    if (hairItem && hairItem.exposesEars === false) {
      applyEarringSkip(job);
      return "skipped";
    }
  }

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
  if (step === "clothes" || step === "earrings") {
    ref = await youcamIdForCatalog(item);
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
  const message = parsed.errorMessage || parsed.error;
  if (parsed.taskStatus === "success" && parsed.url) {
    state.status = "success";
    state.imageUrl = parsed.url;
    try {
      const jpeg = await fetchAsJpeg(parsed.url);
      state.dstId = await uploadJpeg(jpeg);
    } catch {
      state.dstId = parsed.dstId;
    }
    job.unitsUsed += state.units;
    setCachedStep(hashLookCacheKey(job.imageHash, job.look, step), {
      imageUrl: parsed.url,
      dstId: state.dstId,
    });
    return state.status;
  }
  if (step === "earrings" && isEarlobeError(message)) {
    applyEarringSkip(job, message);
    return "skipped";
  }
  state.status = "error";
  state.error = message || `YouCam ${step} ended with status ${parsed.taskStatus}`;
  job.status = "error";
  job.error = state.error;
  return state.status;
}

function demoUrl(job: LookJob, step: ChainStep | "selfie"): string {
  return demoImageFor(job.look, step, job.occasion);
}

function advanceDemo(job: LookJob) {
  const queue = stepsFrom(job.fromStep);
  const elapsed = Date.now() - job.createdAt;
  const slice = 700;
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
      const previous = resolveSourceStep(job.steps, step);
      state.imageUrl =
        previous === "selfie" ? job.selfiePreviewUrl : job.steps[previous].imageUrl;
      return;
    }
    state.status = "success";
    state.imageUrl = demoUrl(job, step);
    job.unitsUsed = queue
      .slice(0, index + 1)
      .reduce((sum, id) => sum + STEP_META[id].units, 0);
  });
  const last = queue[queue.length - 1]!;
  if (elapsed >= queue.length * slice) {
    job.status = "success";
    job.currentStep = last;
    job.steps[last].imageUrl = demoUrl(job, last);
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
  await ensureDemoSelfie();
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
    DEMO_SELFIE;

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
    prior.imageUrl = config.demoMode ? demoUrl(job, step) : undefined;
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
    if (
      state.status === "success" ||
      state.status === "cached" ||
      state.status === "skipped"
    ) {
      continue;
    }
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
      if (step === "earrings" && isEarlobeError(message)) {
        applyEarringSkip(job, message);
        continue;
      }
      state.status = "error";
      state.error = message;
      job.status = "error";
      job.error = message;
      return job;
    }
    if (after === "skipped") continue;
    if (after !== "success" && after !== "cached") {
      return job;
    }
  }

  const last = queue[queue.length - 1]!;
  const lastStatus = job.steps[last].status;
  if (
    lastStatus === "success" ||
    lastStatus === "cached" ||
    lastStatus === "skipped"
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
  const earringSkipped = job.steps.earrings.status === "skipped";

  return {
    jobId: job.id,
    status: job.status,
    demoMode: job.demoMode,
    error: job.error ?? null,
    note: job.note ?? (earringSkipped ? EARLOBE_NOTE : null),
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
    unitsPlanned: queue.reduce((sum, step) => {
      if (step === "earrings" && earringSkipped) return sum;
      return sum + STEP_META[step].units;
    }, 0),
    steps: CHAIN_STEPS.map((id) => ({
      id,
      label: STEP_META[id].label,
      api: STEP_META[id].api,
      detail: STEP_META[id].detail,
      units: STEP_META[id].units,
      status: job.steps[id].status,
      imageUrl: job.steps[id].imageUrl ?? null,
      error: job.steps[id].error ?? null,
      note: job.steps[id].note ?? null,
    })),
  };
}

export function hashBuffer(bytes: Buffer): string {
  return hashBytes(bytes);
}

async function ensureDemoSelfie(): Promise<void> {
  if (memory.uploads.has(DEMO_SELFIE_HASH)) return;
  try {
    const file = await readPublicFile(DEMO_SELFIE);
    memory.uploads.set(DEMO_SELFIE_HASH, {
      hash: DEMO_SELFIE_HASH,
      bytes: file.bytes,
      contentType: file.contentType,
      fileName: file.fileName,
      previewUrl: DEMO_SELFIE,
    });
  } catch {
    memory.uploads.set(DEMO_SELFIE_HASH, {
      hash: DEMO_SELFIE_HASH,
      bytes: Buffer.from([]),
      contentType: "image/jpeg",
      fileName: "selfie.jpg",
      previewUrl: DEMO_SELFIE,
    });
  }
}
