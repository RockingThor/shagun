import { createHash } from "node:crypto";
import {
  CHAIN_STEPS,
  lookIdForStep,
  stepIndex,
  type ChainStep,
  type LookIds,
} from "@/lib/look/chain";

/**
 * Canonical cache key: selfie image hash plus every item applied up to
 * `throughStep`. Swapping lipstick must not invalidate the clothes result.
 */
export function lookCacheKey(
  imageHash: string,
  look: LookIds,
  throughStep: ChainStep,
): string {
  const through = stepIndex(throughStep);
  const itemPart = CHAIN_STEPS.slice(0, through + 1)
    .map((step) => `${step}:${lookIdForStep(look, step)}`)
    .join("|");
  return `${imageHash}|${throughStep}|${itemPart}`;
}

export function hashLookCacheKey(
  imageHash: string,
  look: LookIds,
  throughStep: ChainStep,
): string {
  return createHash("sha256")
    .update(lookCacheKey(imageHash, look, throughStep))
    .digest("hex");
}

export function hashBytes(bytes: Uint8Array | Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}
