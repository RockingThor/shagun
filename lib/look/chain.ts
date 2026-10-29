import type { CatalogItem, Category } from "@/data/catalog";

export const CHAIN_STEPS = ["clothes", "hair", "earrings", "lipstick"] as const;
export type ChainStep = (typeof CHAIN_STEPS)[number];

export const STEP_CATEGORY: Record<ChainStep, Category> = {
  clothes: "outfit",
  hair: "hairstyle",
  earrings: "earrings",
  lipstick: "lip",
};

export const STEP_META: Record<
  ChainStep,
  { label: string; api: string; units: number; detail: string }
> = {
  clothes: {
    label: "Clothes VTO",
    api: "cloth-v4",
    units: 2,
    detail: "Drape the outfit on the chest-up selfie.",
  },
  hair: {
    label: "Hairstyle transfer",
    api: "hair-transfer",
    units: 2,
    detail: "Restyle hair before jewellery, or earrings get redrawn away.",
  },
  earrings: {
    label: "Earrings 2D VTO",
    api: "2d-vto/earring",
    units: 1,
    detail: "Place the jewellery once the ears are visible.",
  },
  lipstick: {
    label: "Makeup VTO lipstick",
    api: "makeup-vto",
    units: 1,
    detail: "Tint the lips with the chosen hex shade.",
  },
};

export const UNITS_PER_LOOK = CHAIN_STEPS.reduce(
  (sum, step) => sum + STEP_META[step].units,
  0,
);

export const EARLOBE_NOTE =
  "Earrings were skipped because this hairstyle covers the ears. Try an updo so the lobes show — failed earring tasks are not charged.";

export type LookIds = {
  outfitId: string;
  earringId: string;
  hairId: string;
  lipId: string;
};

export function lookIdForStep(look: LookIds, step: ChainStep): string {
  switch (step) {
    case "clothes":
      return look.outfitId;
    case "earrings":
      return look.earringId;
    case "hair":
      return look.hairId;
    case "lipstick":
      return look.lipId;
  }
}

export function lookFromItems(items: {
  outfit: CatalogItem;
  earrings: CatalogItem;
  hairstyle: CatalogItem;
  lip: CatalogItem;
}): LookIds {
  return {
    outfitId: items.outfit.id,
    earringId: items.earrings.id,
    hairId: items.hairstyle.id,
    lipId: items.lip.id,
  };
}

export function stepIndex(step: ChainStep): number {
  return CHAIN_STEPS.indexOf(step);
}

export function stepsFrom(from?: ChainStep | null): ChainStep[] {
  if (!from) return [...CHAIN_STEPS];
  const index = stepIndex(from);
  if (index < 0) return [...CHAIN_STEPS];
  return CHAIN_STEPS.slice(index);
}

export function sourceStep(forStep: ChainStep): ChainStep | "selfie" {
  const index = stepIndex(forStep);
  if (index <= 0) return "selfie";
  return CHAIN_STEPS[index - 1];
}

export function categoryToStep(category: Category): ChainStep {
  switch (category) {
    case "outfit":
      return "clothes";
    case "earrings":
      return "earrings";
    case "hairstyle":
      return "hair";
    case "lip":
      return "lipstick";
  }
}

export function unitsFrom(from: ChainStep): number {
  return stepsFrom(from).reduce((sum, step) => sum + STEP_META[step].units, 0);
}

export function withSwappedItem(look: LookIds, item: CatalogItem): LookIds {
  switch (item.category) {
    case "outfit":
      return { ...look, outfitId: item.id };
    case "earrings":
      return { ...look, earringId: item.id };
    case "hairstyle":
      return { ...look, hairId: item.id };
    case "lip":
      return { ...look, lipId: item.id };
  }
}

export function isEarlobeError(message?: string | null): boolean {
  if (!message) return false;
  return message.toLowerCase().includes("earlobe alignment not confident");
}

export type StepLike = {
  status: string;
  imageUrl?: string | null;
  dstId?: string | null;
};

export function resolveSourceStep(
  steps: Record<ChainStep, StepLike>,
  forStep: ChainStep,
): ChainStep | "selfie" {
  let prev = sourceStep(forStep);
  while (prev !== "selfie") {
    const state = steps[prev];
    const usable =
      state &&
      (state.status === "success" ||
        state.status === "cached" ||
        state.status === "skipped") &&
      (Boolean(state.dstId) || Boolean(state.imageUrl));
    if (usable && state.status !== "skipped") return prev;
    prev = sourceStep(prev);
  }
  return "selfie";
}

export function skipEarrings(
  hairImageUrl?: string | null,
): { status: "skipped"; imageUrl?: string; note: string } {
  return {
    status: "skipped",
    imageUrl: hairImageUrl ?? undefined,
    note: EARLOBE_NOTE,
  };
}
