import { describe, expect, it } from "vitest";
import { catalog } from "@/data/catalog";
import {
  CHAIN_STEPS,
  UNITS_PER_LOOK,
  categoryToStep,
  sourceStep,
  stepsFrom,
  unitsFrom,
  withSwappedItem,
  type LookIds,
} from "@/lib/look/chain";

const look: LookIds = {
  outfitId: "marigold-anarkali",
  earringId: "temple-jhumkas",
  hairId: "gajra-waves",
  lipId: "sindoor-rose",
};

describe("chaining order", () => {
  it("runs clothes, then earrings, then hair, then lipstick", () => {
    expect(CHAIN_STEPS).toEqual(["clothes", "earrings", "hair", "lipstick"]);
    expect(UNITS_PER_LOOK).toBe(6);
  });

  it("starts a full look from clothes and feeds each step from the previous result", () => {
    expect(stepsFrom()).toEqual(CHAIN_STEPS);
    expect(sourceStep("clothes")).toBe("selfie");
    expect(sourceStep("earrings")).toBe("clothes");
    expect(sourceStep("hair")).toBe("earrings");
    expect(sourceStep("lipstick")).toBe("hair");
  });
});

describe("partial re-render", () => {
  it("re-renders only from the swapped step onward", () => {
    expect(stepsFrom("clothes")).toEqual(CHAIN_STEPS);
    expect(stepsFrom("earrings")).toEqual(["earrings", "hair", "lipstick"]);
    expect(stepsFrom("hair")).toEqual(["hair", "lipstick"]);
    expect(stepsFrom("lipstick")).toEqual(["lipstick"]);
  });

  it("charges only the remaining units when swapping a later item", () => {
    expect(unitsFrom("clothes")).toBe(6);
    expect(unitsFrom("earrings")).toBe(4);
    expect(unitsFrom("hair")).toBe(3);
    expect(unitsFrom("lipstick")).toBe(1);
  });

  it("maps a swapped catalog item to the correct chain step", () => {
    const hoops = catalog.find((item) => item.id === "gold-hoops")!;
    const coral = catalog.find((item) => item.id === "festive-coral")!;
    expect(categoryToStep(hoops.category)).toBe("earrings");
    expect(withSwappedItem(look, hoops)).toEqual({
      ...look,
      earringId: "gold-hoops",
    });
    expect(withSwappedItem(look, coral).lipId).toBe("festive-coral");
    expect(withSwappedItem(look, coral).outfitId).toBe(look.outfitId);
  });
});
