import { stepsFrom, type ChainStep } from "@/lib/look/chain";

/** Visible pause on each chip while a captured (zero-unit) look plays. */
export const DEMO_STEP_MS = 500;

export type PlaybackStep = {
  id: ChainStep;
  status: string;
  imageUrl: string | null;
};

export type PlaybackJob = {
  status: "running" | "success" | "error";
  fromStep: ChainStep;
  currentStep: ChainStep;
  selfiePreviewUrl: string;
  currentImageUrl: string;
  finalImageUrl: string | null;
  samplePhoto?: boolean;
  demoMode: boolean;
  steps: PlaybackStep[];
};

export function isCapturedPlayback(job: {
  demoMode: boolean;
  samplePhoto?: boolean;
}): boolean {
  return Boolean(job.samplePhoto || job.demoMode);
}

export function capturedStepsReady(job: PlaybackJob): boolean {
  if (!isCapturedPlayback(job)) return false;
  return stepsFrom(job.fromStep).every((id) => {
    const step = job.steps.find((entry) => entry.id === id);
    if (!step) return false;
    if (step.status === "skipped") return true;
    return Boolean(step.imageUrl);
  });
}

export function demoPlaybackFrame<T extends PlaybackJob>(
  finalJob: T,
  runningIndex: number,
): T {
  const queue = stepsFrom(finalJob.fromStep);
  if (runningIndex >= queue.length) {
    return { ...finalJob, status: "success" };
  }
  const current = queue[runningIndex]!;
  const previous = runningIndex === 0 ? null : queue[runningIndex - 1]!;
  const previousUrl = previous
    ? (finalJob.steps.find((step) => step.id === previous)?.imageUrl ??
      finalJob.selfiePreviewUrl)
    : finalJob.selfiePreviewUrl;

  const steps = finalJob.steps.map((step) => {
    const index = queue.indexOf(step.id);
    if (index < 0) return step;
    if (index < runningIndex) {
      return { ...step, status: step.status === "skipped" ? "skipped" : "success" };
    }
    if (index === runningIndex) {
      return { ...step, status: "running", imageUrl: previousUrl };
    }
    return { ...step, status: "pending", imageUrl: null };
  });

  return {
    ...finalJob,
    status: "running",
    currentStep: current,
    currentImageUrl: previousUrl,
    finalImageUrl: null,
    steps,
  };
}

export function demoPlaybackQueue(fromStep: ChainStep): ChainStep[] {
  return stepsFrom(fromStep);
}

export function prefetchUrls(urls: Array<string | null | undefined>): void {
  if (typeof window === "undefined") return;
  for (const url of urls) {
    if (!url || url.startsWith("data:")) continue;
    const image = new Image();
    image.src = url;
  }
}
