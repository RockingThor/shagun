import type { Occasion } from "@/data/catalog";
import {
  CHAIN_STEPS,
  lookIdForStep,
  type ChainStep,
  type LookIds,
} from "@/lib/look/chain";
import { DEMO_SELFIE, OCCASION_LOOKS } from "@/lib/look/defaults";

export { DEMO_SELFIE };

export function occasionStepImage(
  occasion: Occasion,
  step: ChainStep | "selfie",
): string {
  if (step === "selfie") return DEMO_SELFIE;
  return `/demo/looks/${occasion}-${step}.jpg`;
}

function matchesThrough(
  captured: LookIds,
  look: LookIds,
  step: ChainStep,
): boolean {
  for (const chainStep of CHAIN_STEPS) {
    if (lookIdForStep(captured, chainStep) !== lookIdForStep(look, chainStep)) {
      return false;
    }
    if (chainStep === step) return true;
  }
  return false;
}

/**
 * Use the real captured render for this look+step when we have one.
 * Otherwise reuse the longest matching prefix so the UI never goes blank.
 */
export function demoImageFor(
  look: LookIds,
  step: ChainStep | "selfie",
  preferredOccasion?: Occasion,
): string {
  if (step === "selfie") return DEMO_SELFIE;

  if (preferredOccasion) {
    const captured = OCCASION_LOOKS[preferredOccasion];
    if (matchesThrough(captured, look, step)) {
      return occasionStepImage(preferredOccasion, step);
    }
  }

  for (const [occasion, captured] of Object.entries(OCCASION_LOOKS) as Array<
    [Occasion, LookIds]
  >) {
    if (matchesThrough(captured, look, step)) {
      return occasionStepImage(occasion, step);
    }
  }

  const index = CHAIN_STEPS.indexOf(step);
  for (let i = index; i >= 0; i -= 1) {
    const earlier = CHAIN_STEPS[i]!;
    for (const [occasion, captured] of Object.entries(OCCASION_LOOKS) as Array<
      [Occasion, LookIds]
    >) {
      if (matchesThrough(captured, look, earlier)) {
        return occasionStepImage(occasion, earlier);
      }
    }
  }
  return DEMO_SELFIE;
}
