import { describe, expect, it } from "vitest";
import { catalog } from "@/data/catalog";
import {
  CHAIN_STEPS,
  EARLOBE_NOTE,
  UNITS_PER_LOOK,
  categoryToStep,
  isEarlobeError,
  resolveSourceStep,
  skipEarrings,
  sourceStep,
  stepsFrom,
  unitsFrom,
  withSwappedItem,
  type LookIds,
  type StepLike,
} from "@/lib/look/chain";

const look: LookIds = {
  outfitId: "marigold-anarkali",
  earringId: "temple-jhumkas",
  hairId: "side-sweep",
  lipId: "sindoor-rose",
};

describe("chaining order", () => {
  it("runs clothes, then hair, then earrings, then lipstick", () => {
    expect(CHAIN_STEPS).toEqual(["clothes", "hair", "earrings", "lipstick"]);
    expect(UNITS_PER_LOOK).toBe(6);
  });

  it("starts a full look from clothes and feeds each step from the previous result", () => {
    expect(stepsFrom()).toEqual(CHAIN_STEPS);
    expect(sourceStep("clothes")).toBe("selfie");
    expect(sourceStep("hair")).toBe("clothes");
    expect(sourceStep("earrings")).toBe("hair");
    expect(sourceStep("lipstick")).toBe("earrings");
  });
});

describe("partial re-render", () => {
  it("re-renders only from the swapped step onward", () => {
    expect(stepsFrom("clothes")).toEqual(CHAIN_STEPS);
    expect(stepsFrom("hair")).toEqual(["hair", "earrings", "lipstick"]);
    expect(stepsFrom("earrings")).toEqual(["earrings", "lipstick"]);
    expect(stepsFrom("lipstick")).toEqual(["lipstick"]);
  });

  it("charges only the remaining units when swapping a later item", () => {
    expect(unitsFrom("clothes")).toBe(6);
    expect(unitsFrom("hair")).toBe(4);
    expect(unitsFrom("earrings")).toBe(2);
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

describe("earring skip", () => {
  it("detects the earlobe alignment error from YouCam", () => {
    expect(isEarlobeError("earlobe alignment not confident.")).toBe(true);
    expect(isEarlobeError("Earlobe Alignment Not Confident")).toBe(true);
    expect(isEarlobeError("no face")).toBe(false);
  });

  it("skips earrings and keeps the hair frame so the UI is never blank", () => {
    const skipped = skipEarrings("/demo/looks/diwali-hair.jpg");
    expect(skipped.status).toBe("skipped");
    expect(skipped.imageUrl).toBe("/demo/looks/diwali-hair.jpg");
    expect(skipped.note).toBe(EARLOBE_NOTE);
  });

  it("feeds lipstick from hair when earrings were skipped", () => {
    const steps: Record<string, StepLike> = {
      clothes: { status: "success", imageUrl: "/c.jpg", dstId: "c" },
      hair: { status: "success", imageUrl: "/h.jpg", dstId: "h" },
      earrings: { status: "skipped", imageUrl: "/h.jpg" },
      lipstick: { status: "pending" },
    };
    expect(
      resolveSourceStep(
        steps as Record<(typeof CHAIN_STEPS)[number], StepLike>,
        "lipstick",
      ),
    ).toBe("hair");
    expect(
      resolveSourceStep(
        steps as Record<(typeof CHAIN_STEPS)[number], StepLike>,
        "earrings",
      ),
    ).toBe("hair");
  });

  it("does not treat a success-without-image step as a usable source", () => {
    const steps: Record<string, StepLike> = {
      clothes: { status: "success" },
      hair: { status: "pending" },
      earrings: { status: "pending" },
      lipstick: { status: "pending" },
    };
    expect(
      resolveSourceStep(
        steps as Record<(typeof CHAIN_STEPS)[number], StepLike>,
        "hair",
      ),
    ).toBe("selfie");
  });
});
