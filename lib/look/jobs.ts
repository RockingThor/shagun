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
  sourceStep,
  stepsFrom,
  type ChainStep,
  type LookIds,
} from "@/lib/look/chain";
import {
  mergePriorHints,
  rewindIfPriorsMissing,
  type PriorHint,
} from "@/lib/look/prior";
import { SAMPLE_PHOTO_HASH, isSamplePhoto } from "@/lib/look/sample";
import { pickLook, type PickedLook } from "@/lib/look/picker";
import {
  getCachedFrame,
  getCachedStep,
  setCachedFrame,
  setCachedStep,
} from "@/lib/youcam/cache";
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
import {
  DURABLE_TTL,
  durableGetBytes,
  durableGetJson,
  durableSetBytes,
  durableSetJson,
} from "@/lib/store/durable";
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
  samplePhoto: boolean;
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

type UploadMeta = Omit<StoredUpload, "bytes">;

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

function jobKey(id: string): string {
  return `job:${id}`;
}

function uploadMetaKey(hash: string): string {
  return `upload-meta:${hash}`;
}

function uploadBytesKey(hash: string): string {
  return `upload:${hash}`;
}

function catalogFileKey(itemId: string): string {
  return `catalog-file:${itemId}`;
}

async function persistJob(job: LookJob): Promise<void> {
  memory.jobs.set(job.id, job);
  // Captured/demo looks are resolved in one response and played on the client.
  // Writing them to Blobs only adds serverless latency on every poll.
  if (job.demoMode || job.samplePhoto) return;
  const slim: LookJob = {
    ...job,
    selfiePreviewUrl: job.selfiePreviewUrl.startsWith("data:")
      ? ""
      : job.selfiePreviewUrl,
  };
  await durableSetJson(jobKey(job.id), slim, DURABLE_TTL.job);
}

export async function getJob(id: string): Promise<LookJob | undefined> {
  const local = memory.jobs.get(id);
  if (local) return local;
  const stored = await durableGetJson<LookJob>(jobKey(id));
  if (!stored) return undefined;
  if (!stored.selfiePreviewUrl) {
    const upload = await getUpload(stored.imageHash);
    stored.selfiePreviewUrl =
      upload?.previewUrl ||
      (stored.samplePhoto || isSamplePhoto(stored.imageHash)
        ? DEMO_SELFIE
        : stored.selfiePreviewUrl);
  }
  memory.jobs.set(id, stored);
  return stored;
}

export async function storeUpload(file: StoredUpload): Promise<StoredUpload> {
  memory.uploads.set(file.hash, file);
  const meta: UploadMeta = {
    hash: file.hash,
    contentType: file.contentType,
    fileName: file.fileName,
    previewUrl: file.previewUrl.startsWith("data:") ? "" : file.previewUrl,
    youcamFileId: file.youcamFileId,
  };
  await durableSetJson(uploadMetaKey(file.hash), meta, DURABLE_TTL.upload);
  await durableSetBytes(uploadBytesKey(file.hash), file.bytes, DURABLE_TTL.upload);
  return file;
}

export async function getUpload(hash: string): Promise<StoredUpload | undefined> {
  const local = memory.uploads.get(hash);
  if (local) return local;
  const meta = await durableGetJson<UploadMeta>(uploadMetaKey(hash));
  const bytes = await durableGetBytes(uploadBytesKey(hash));
  if (!meta || !bytes) return undefined;
  const previewUrl =
    meta.previewUrl ||
    `data:${meta.contentType};base64,${bytes.toString("base64")}`;
  const stored: StoredUpload = { ...meta, bytes, previewUrl };
  memory.uploads.set(hash, stored);
  return stored;
}

export function demoSelfieHash(): string {
  return SAMPLE_PHOTO_HASH;
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

function contentTypeFor(relative: string): string {
  const ext = path.extname(relative).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  return "image/jpeg";
}

function siteOrigin(): string {
  return (
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ""
  ).replace(/\/$/, "");
}

async function readPublicFile(publicPath: string): Promise<{
  bytes: Buffer;
  contentType: string;
  fileName: string;
}> {
  const relative = publicPath.replace(/^\//, "");
  const contentType = contentTypeFor(relative);
  const fileName = path.basename(relative);
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", relative));
    return { bytes, contentType, fileName };
  } catch {
    const origin = siteOrigin();
    if (!origin) {
      throw new Error(`Missing public file ${publicPath}`);
    }
    const response = await fetch(`${origin}/${relative}`);
    if (!response.ok) {
      throw new Error(`Missing public file ${publicPath}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    return { bytes, contentType, fileName };
  }
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
  const stored = await durableGetJson<{ fileId: string }>(catalogFileKey(item.id));
  if (stored?.fileId) {
    memory.catalogYouCamIds.set(item.id, stored.fileId);
    return { fileId: stored.fileId };
  }
  const file = await readPublicFile(item.image);
  if (!isRaster(file.contentType)) {
    throw new Error(
      `${item.name} needs a JPG or PNG at ${item.image} for live YouCam VTO.`,
    );
  }
  const fileId = await uploadJpeg(file);
  memory.catalogYouCamIds.set(item.id, fileId);
  await durableSetJson(catalogFileKey(item.id), { fileId }, DURABLE_TTL.catalog);
  return { fileId };
}

async function sourceFromPrevious(
  job: LookJob,
  previous: StepState,
  prevStep: ChainStep,
): Promise<ImageSource> {
  if (previous.dstId) return { fileId: previous.dstId };
  const cacheKey = hashLookCacheKey(job.imageHash, job.look, prevStep);
  const frame = await getCachedFrame(cacheKey);
  if (frame) {
    previous.dstId = await uploadJpeg({
      bytes: frame,
      fileName: `${prevStep}.jpg`,
    });
    return { fileId: previous.dstId };
  }
  if (previous.imageUrl) {
    try {
      const jpeg = await fetchAsJpeg(previous.imageUrl);
      previous.dstId = await uploadJpeg(jpeg);
      await setCachedFrame(cacheKey, jpeg.bytes);
      return { fileId: previous.dstId };
    } catch {
      return { url: previous.imageUrl };
    }
  }
  throw new Error(
    `Missing the ${prevStep} frame. Generate the look again so earlier steps are not dropped.`,
  );
}

async function sourceFor(
  job: LookJob,
  step: ChainStep,
): Promise<ImageSource> {
  const prev = resolveSourceStep(job.steps, step);
  if (prev === "selfie") {
    if (step !== "clothes") {
      throw new Error(
        `Missing the ${sourceStep(step)} frame. Generate the look again so earlier steps are not dropped.`,
      );
    }
    const upload = await getUpload(job.imageHash);
    if (upload?.youcamFileId) return { fileId: upload.youcamFileId };
    if (upload && isRaster(upload.contentType) && upload.bytes.length > 0) {
      upload.youcamFileId = await uploadJpeg(upload);
      await storeUpload(upload);
      return { fileId: upload.youcamFileId };
    }
    throw new Error("Selfie is missing or is not a JPG/PNG.");
  }
  return sourceFromPrevious(job, job.steps[prev], prev);
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

function friendlyError(error: unknown): string {
  const message =
    error instanceof YouCamApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "YouCam request failed";
  if (/corrupt header|unsupported image|vipsjpeg|input buffer/i.test(message)) {
    return "That photo could not be read. Use a JPG or PNG chest-up selfie, or try the sample photo.";
  }
  if (/selfie is missing/i.test(message)) {
    return "Upload a chest-up selfie, or try the sample photo.";
  }
  return message;
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
  if (job.samplePhoto) {
    throw new Error("Sample photo must not call YouCam");
  }
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
  const cached = await getCachedStep(cacheKey);
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
    const cacheKey = hashLookCacheKey(job.imageHash, job.look, step);
    try {
      const jpeg = await fetchAsJpeg(parsed.url);
      state.dstId = await uploadJpeg(jpeg);
      await setCachedFrame(cacheKey, jpeg.bytes);
    } catch {
      state.dstId = parsed.dstId;
    }
    if (!job.samplePhoto) job.unitsUsed += state.units;
    await setCachedStep(cacheKey, {
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

function completeDemo(job: LookJob) {
  const queue = stepsFrom(job.fromStep);
  for (const step of queue) {
    const state = job.steps[step];
    state.status = "success";
    state.imageUrl = demoUrl(job, step);
    state.startedAt = job.createdAt;
  }
  const last = queue[queue.length - 1]!;
  job.status = "success";
  job.currentStep = last;
  job.steps[last].imageUrl = demoUrl(job, last);
  if (!job.samplePhoto) {
    job.unitsUsed = queue.reduce((sum, id) => sum + STEP_META[id].units, 0);
  }
}

async function hydratePriors(
  job: LookJob,
  hints: PriorHint[] | undefined,
): Promise<void> {
  const queue = stepsFrom(job.fromStep);
  mergePriorHints(job.steps, hints);

  for (const step of CHAIN_STEPS) {
    if (queue.includes(step)) continue;
    const prior = job.steps[step];
    if (job.demoMode && !prior.imageUrl) {
      prior.status = "success";
      prior.imageUrl = demoUrl(job, step);
    }
    if (job.demoMode) continue;
    const cached = await getCachedStep(
      hashLookCacheKey(job.imageHash, job.look, step),
    );
    if (cached) {
      prior.imageUrl = cached.imageUrl;
      prior.dstId = cached.dstId;
      if (prior.status === "pending") prior.status = "cached";
    }
  }

  if (job.demoMode) return;

  const rewound = rewindIfPriorsMissing(job.steps, job.fromStep);
  if (rewound === job.fromStep) return;
  job.fromStep = rewound;
  job.currentStep = rewound;
  for (const later of stepsFrom(rewound)) {
    const state = job.steps[later];
    if (state.status === "success" || state.status === "cached") continue;
    if (state.status === "skipped") continue;
    state.status = "pending";
    state.error = undefined;
  }
}

export async function createLookJob(input: {
  imageHash: string;
  occasion: Occasion;
  budget: number;
  look?: LookIds;
  fromStep?: ChainStep;
  selfiePreviewUrl?: string;
  priorSteps?: PriorHint[];
}): Promise<LookJob> {
  await ensureDemoSelfie();
  const config = youcamConfig();
  const samplePhoto = isSamplePhoto(input.imageHash);
  const picked = input.look
    ? lookItems(input.look)
    : pickLook(catalog, input.occasion, input.budget);
  picked.withinBudget = picked.total <= input.budget;
  picked.leftover = input.budget - picked.total;

  const requestedFrom = input.fromStep ?? "clothes";
  const upload = await getUpload(input.imageHash);
  const selfiePreviewUrl =
    input.selfiePreviewUrl ||
    upload?.previewUrl ||
    DEMO_SELFIE;

  const job: LookJob = {
    id: newId(),
    createdAt: Date.now(),
    demoMode: config.demoMode || samplePhoto,
    samplePhoto,
    occasion: input.occasion,
    budget: input.budget,
    look: picked.ids,
    picked,
    imageHash: input.imageHash,
    selfiePreviewUrl,
    fromStep: requestedFrom,
    currentStep: requestedFrom,
    status: "running",
    steps: emptySteps(),
    unitsUsed: 0,
  };

  await hydratePriors(job, input.priorSteps);

  if (job.demoMode) {
    completeDemo(job);
  } else {
    try {
      await startLiveStep(job, job.fromStep);
      job.currentStep = job.fromStep;
    } catch (error) {
      job.status = "error";
      job.error = friendlyError(error);
      job.steps[job.fromStep].status = "error";
      job.steps[job.fromStep].error = job.error;
    }
  }

  await persistJob(job);
  return job;
}

export async function tickJob(job: LookJob): Promise<LookJob> {
  if (job.status !== "running") return job;
  if (job.demoMode) {
    completeDemo(job);
    await persistJob(job);
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
      await persistJob(job);
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
      const message = friendlyError(error);
      if (step === "earrings" && isEarlobeError(message)) {
        applyEarringSkip(job, message);
        continue;
      }
      state.status = "error";
      state.error = message;
      job.status = "error";
      job.error = message;
      await persistJob(job);
      return job;
    }
    if (after === "skipped") continue;
    if (after !== "success" && after !== "cached") {
      await persistJob(job);
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
  await persistJob(job);
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
    samplePhoto: job.samplePhoto,
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
    unitsPlanned: job.samplePhoto
      ? 0
      : queue.reduce((sum, step) => {
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
      dstId: job.steps[id].dstId ?? null,
      error: job.steps[id].error ?? null,
      note: job.steps[id].note ?? null,
    })),
  };
}

export function hashBuffer(bytes: Buffer): string {
  return hashBytes(bytes);
}

export function resetLookMemoryForTests(): void {
  memory.jobs.clear();
  memory.uploads.clear();
  memory.catalogYouCamIds.clear();
}

async function ensureDemoSelfie(): Promise<void> {
  if (memory.uploads.has(SAMPLE_PHOTO_HASH)) return;
  // Sample looks never upload this file to YouCam; keep a stub so create is free.
  memory.uploads.set(SAMPLE_PHOTO_HASH, {
    hash: SAMPLE_PHOTO_HASH,
    bytes: Buffer.from([]),
    contentType: "image/jpeg",
    fileName: "selfie.jpg",
    previewUrl: DEMO_SELFIE,
  });
}
