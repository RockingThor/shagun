import {
  type CatalogItem,
  type Category,
  type Occasion,
} from "@/data/catalog";
import { lookFromItems, type LookIds } from "@/lib/look/chain";
import { OCCASION_LOOKS } from "@/lib/look/defaults";

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

function requireItem(
  catalog: CatalogItem[],
  id: string,
  category: Category,
): CatalogItem {
  const item = catalog.find((entry) => entry.id === id);
  if (!item || item.category !== category) {
    throw new Error(`Catalog is missing ${category} "${id}"`);
  }
  return item;
}

function comboOf(
  outfit: CatalogItem,
  earrings: CatalogItem,
  hairstyle: CatalogItem,
  lip: CatalogItem,
): Omit<PickedLook, "ids" | "withinBudget" | "leftover"> {
  const items = [outfit, hairstyle, earrings, lip];
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
 * Return the captured occasion look (the combination that has real YouCam
 * renders). Budget only decides the within-budget flag.
 */
export function pickLook(
  catalog: CatalogItem[],
  occasion: Occasion,
  budget: number,
): PickedLook {
  const ids = OCCASION_LOOKS[occasion];
  const combo = comboOf(
    requireItem(catalog, ids.outfitId, "outfit"),
    requireItem(catalog, ids.earringId, "earrings"),
    requireItem(catalog, ids.hairId, "hairstyle"),
    requireItem(catalog, ids.lipId, "lip"),
  );
  return toPicked(combo, budget);
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
