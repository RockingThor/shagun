import type { CatalogItem, Occasion } from "@/data/catalog";
import type { LookIds } from "@/lib/look/chain";

export type CartLook = {
  id: string;
  occasion: Occasion;
  budget: number;
  ids: LookIds;
  items: CatalogItem[];
  total: number;
  beforeUrl: string;
  afterUrl: string;
  addedAt: number;
};

export const CART_KEY = "shagun-cart-v1";

export function readCart(): CartLook[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLook[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartLook[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("shagun-cart"));
}
