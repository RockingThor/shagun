import {
  CHAIN_STEPS,
  stepIndex,
  type ChainStep,
  type StepLike,
} from "@/lib/look/chain";

export type PriorHint = {
  id: ChainStep;
  status?: string | null;
  imageUrl?: string | null;
  dstId?: string | null;
};

export function mergePriorHints(
  steps: Record<ChainStep, StepLike>,
  hints: PriorHint[] | undefined,
): void {
  if (!hints?.length) return;
  for (const hint of hints) {
    const state = steps[hint.id];
    if (!state) continue;
    if (hint.imageUrl) state.imageUrl = hint.imageUrl;
    if (hint.dstId) state.dstId = hint.dstId;
    if (hint.status === "skipped") {
      state.status = "skipped";
      continue;
    }
    if (
      (hint.imageUrl || hint.dstId) &&
      (state.status === "pending" || !state.status)
    ) {
      state.status = "success";
    }
  }
}

/**
 * If a swap asks to start at `fromStep` but an earlier frame is missing,
 * rewind to that earlier step instead of feeding the bare selfie downstream.
 */
export function rewindIfPriorsMissing(
  steps: Record<ChainStep, StepLike>,
  fromStep: ChainStep,
): ChainStep {
  for (const step of CHAIN_STEPS) {
    if (stepIndex(step) >= stepIndex(fromStep)) break;
    const state = steps[step];
    if (state?.status === "skipped") continue;
    const usable = Boolean(state?.imageUrl) || Boolean(state?.dstId);
    if (!usable) return step;
  }
  return fromStep;
}

export function isUsableStep(state?: StepLike | null): boolean {
  if (!state) return false;
  if (state.status === "error" || state.status === "pending") return false;
  return Boolean(state.dstId) || Boolean(state.imageUrl);
}
