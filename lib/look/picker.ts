import {
  type CatalogItem,
  type Category,
  type Occasion,
} from "@/data/catalog";
import { lookFromItems, type LookIds } from "@/lib/look/chain";

export type PickedLook = {
  ids: LookIds;
  outfit: CatalogItem;
  earrings: CatalogItem;
  hairstyle: CatalogItem;
  lip: CatalogItem;
  items: CatalogItem[];
  total: number;
  withinBudget: boolean;
  leftover: number;
};

function byCategory(
  catalog: CatalogItem[],
  category: Category,
  occasion: Occasion,
): CatalogItem[] {
  return catalog.filter(
    (item) => item.category === category && item.occasions.includes(occasion),
  );
}

function cohesionScore(items: CatalogItem[]): number {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.palette) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  let best = 0;
  for (const count of counts.values()) best = Math.max(best, count);
  return best;
}

function comboOf(
  outfit: CatalogItem,
  earrings: CatalogItem,
  hairstyle: CatalogItem,
  lip: CatalogItem,
): Omit<PickedLook, "ids" | "withinBudget" | "leftover"> {
  const items = [outfit, earrings, hairstyle, lip];
  return {
    outfit,
    earrings,
    hairstyle,
    lip,
    items,
    total: items.reduce((sum, item) => sum + item.priceInr, 0),
  };
}

function toPicked(
  combo: Omit<PickedLook, "ids" | "withinBudget" | "leftover">,
  budget: number,
): PickedLook {
  return {
    ...combo,
    ids: lookFromItems(combo),
    withinBudget: combo.total <= budget,
    leftover: budget - combo.total,
  };
}

/**
 * Pick one outfit, earrings, hairstyle and lip that all suit `occasion`.
 * Prefers the highest spend that still fits `budget`, with a cohesion bonus
 * for shared palette tags. If nothing fits, returns the cheapest complete look
 * and marks it over budget.
 */
export function pickLook(
  catalog: CatalogItem[],
  occasion: Occasion,
  budget: number,
): PickedLook {
  const outfits = byCategory(catalog, "outfit", occasion);
  const earrings = byCategory(catalog, "earrings", occasion);
  const hairstyles = byCategory(catalog, "hairstyle", occasion);
  const lips = byCategory(catalog, "lip", occasion);

  if (
    outfits.length === 0 ||
    earrings.length === 0 ||
    hairstyles.length === 0 ||
    lips.length === 0
  ) {
    throw new Error(`No complete look for occasion "${occasion}"`);
  }

  let cheapest: ReturnType<typeof comboOf> | null = null;
  let bestFit: ReturnType<typeof comboOf> | null = null;
  let bestScore = -Infinity;

  for (const outfit of outfits) {
    for (const earring of earrings) {
      for (const hairstyle of hairstyles) {
        for (const lip of lips) {
          const combo = comboOf(outfit, earring, hairstyle, lip);
          if (!cheapest || combo.total < cheapest.total) cheapest = combo;
          if (combo.total > budget) continue;
          const leftover = budget - combo.total;
          const score =
            combo.total + cohesionScore(combo.items) * 350 - leftover * 0.02;
          if (score > bestScore) {
            bestScore = score;
            bestFit = combo;
          }
        }
      }
    }
  }

  const chosen = bestFit ?? cheapest;
  if (!chosen) {
    throw new Error(`No complete look for occasion "${occasion}"`);
  }
  return toPicked(chosen, budget);
}

export function lookTotal(items: CatalogItem[]): number {
  return items.reduce((sum, item) => sum + item.priceInr, 0);
}

export function remainingBudget(
  budget: number,
  lookItems: CatalogItem[],
  swapping: CatalogItem,
): number {
  const others = lookItems
    .filter((item) => item.category !== swapping.category)
    .reduce((sum, item) => sum + item.priceInr, 0);
  return budget - others;
}
