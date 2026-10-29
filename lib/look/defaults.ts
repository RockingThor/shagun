import { itemById, type Occasion } from "@/data/catalog";
import type { LookIds } from "@/lib/look/chain";

/** Captured YouCam chains in public/demo/looks — keep in sync with the asset README. */
export const OCCASION_LOOKS: Record<Occasion, LookIds> = {
  diwali: {
    outfitId: "marigold-anarkali",
    hairId: "side-sweep",
    earringId: "temple-jhumkas",
    lipId: "sindoor-rose",
  },
  sangeet: {
    outfitId: "navy-coord",
    hairId: "gajra-waves",
    earringId: "kundan-chandbali",
    lipId: "festive-coral",
  },
  "office-party": {
    outfitId: "ivory-cape",
    hairId: "sleek-part",
    earringId: "gold-hoops",
    lipId: "marigold-nude",
  },
  "wedding-guest": {
    outfitId: "banarasi-lehenga",
    hairId: "bridal-bun",
    earringId: "pearl-drops",
    lipId: "berry-wine",
  },
};

export const DEMO_SELFIE = "/demo/selfie.jpg";

export function occasionLookIds(occasion: Occasion): LookIds {
  return OCCASION_LOOKS[occasion];
}

export function assertOccasionLook(occasion: Occasion): LookIds {
  const ids = OCCASION_LOOKS[occasion];
  for (const id of Object.values(ids)) {
    if (!itemById(id)) {
      throw new Error(`Occasion look ${occasion} references missing item ${id}`);
    }
  }
  return ids;
}
