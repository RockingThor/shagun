import { describe, expect, it } from "vitest";
import { demoImageFor } from "@/lib/demo-renders";
import { OCCASION_LOOKS } from "@/lib/look/defaults";

describe("demoImageFor", () => {
  it("serves the captured Diwali chain for the default Diwali look", () => {
    const look = OCCASION_LOOKS.diwali;
    expect(demoImageFor(look, "clothes", "diwali")).toBe(
      "/demo/looks/diwali-clothes.jpg",
    );
    expect(demoImageFor(look, "hair", "diwali")).toBe(
      "/demo/looks/diwali-hair.jpg",
    );
    expect(demoImageFor(look, "earrings", "diwali")).toBe(
      "/demo/looks/diwali-earrings.jpg",
    );
    expect(demoImageFor(look, "lipstick", "diwali")).toBe(
      "/demo/looks/diwali-lipstick.jpg",
    );
  });

  it("reuses the clothes frame when a swap no longer matches a captured look", () => {
    const swapped = {
      ...OCCASION_LOOKS.diwali,
      earringId: "gold-hoops",
    };
    expect(demoImageFor(swapped, "clothes", "diwali")).toBe(
      "/demo/looks/diwali-clothes.jpg",
    );
    expect(demoImageFor(swapped, "hair", "diwali")).toBe(
      "/demo/looks/diwali-hair.jpg",
    );
    expect(demoImageFor(swapped, "earrings", "diwali")).toBe(
      "/demo/looks/diwali-hair.jpg",
    );
  });
});
