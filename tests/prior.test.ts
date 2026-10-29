import { describe, expect, it } from "vitest";
import { CHAIN_STEPS, type StepLike } from "@/lib/look/chain";
import { mergePriorHints, rewindIfPriorsMissing } from "@/lib/look/prior";

function steps(
  partial: Partial<Record<(typeof CHAIN_STEPS)[number], StepLike>>,
): Record<(typeof CHAIN_STEPS)[number], StepLike> {
  return {
    clothes: { status: "pending" },
    hair: { status: "pending" },
    earrings: { status: "pending" },
    lipstick: { status: "pending" },
    ...partial,
  };
}

describe("mergePriorHints", () => {
  it("copies client step URLs onto pending priors so a swap can reuse them", () => {
    const state = steps({});
    mergePriorHints(state, [
      { id: "clothes", status: "success", imageUrl: "https://cdn.example/c.jpg", dstId: "c" },
      { id: "hair", status: "success", imageUrl: "https://cdn.example/h.jpg" },
    ]);
    expect(state.clothes.imageUrl).toBe("https://cdn.example/c.jpg");
    expect(state.clothes.dstId).toBe("c");
    expect(state.clothes.status).toBe("success");
    expect(state.hair.imageUrl).toBe("https://cdn.example/h.jpg");
  });
});

describe("rewindIfPriorsMissing", () => {
  it("rewinds a lipstick swap to clothes when earlier frames were lost", () => {
    expect(rewindIfPriorsMissing(steps({}), "lipstick")).toBe("clothes");
  });

  it("keeps the requested step when earlier frames are present", () => {
    const state = steps({
      clothes: { status: "success", imageUrl: "/c.jpg", dstId: "c" },
      hair: { status: "success", imageUrl: "/h.jpg", dstId: "h" },
      earrings: { status: "success", imageUrl: "/e.jpg", dstId: "e" },
    });
    expect(rewindIfPriorsMissing(state, "lipstick")).toBe("lipstick");
  });

  it("skips a skipped earring step and does not treat it as missing", () => {
    const state = steps({
      clothes: { status: "success", imageUrl: "/c.jpg" },
      hair: { status: "success", imageUrl: "/h.jpg" },
      earrings: { status: "skipped", imageUrl: "/h.jpg" },
    });
    expect(rewindIfPriorsMissing(state, "lipstick")).toBe("lipstick");
  });

  it("rewinds to hair rather than silently feeding the selfie", () => {
    const state = steps({
      clothes: { status: "success", imageUrl: "/c.jpg" },
      hair: { status: "success" },
    });
    expect(rewindIfPriorsMissing(state, "earrings")).toBe("hair");
  });
});
