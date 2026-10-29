import { describe, expect, it } from "vitest";
import { hashLookCacheKey, lookCacheKey } from "@/lib/look/cache-key";
import type { LookIds } from "@/lib/look/chain";

const selfieA = "hash-a";
const selfieB = "hash-b";

const look: LookIds = {
  outfitId: "marigold-anarkali",
  earringId: "temple-jhumkas",
  hairId: "gajra-waves",
  lipId: "sindoor-rose",
};

describe("lookCacheKey", () => {
  it("is stable for the same image hash, items and step", () => {
    expect(lookCacheKey(selfieA, look, "lipstick")).toBe(
      lookCacheKey(selfieA, look, "lipstick"),
    );
    expect(hashLookCacheKey(selfieA, look, "earrings")).toBe(
      hashLookCacheKey(selfieA, look, "earrings"),
    );
  });

  it("changes when the selfie hash changes", () => {
    expect(lookCacheKey(selfieA, look, "clothes")).not.toBe(
      lookCacheKey(selfieB, look, "clothes"),
    );
  });

  it("does not invalidate earlier steps when a later item is swapped", () => {
    const swappedLip: LookIds = { ...look, lipId: "festive-coral" };
    expect(lookCacheKey(selfieA, look, "clothes")).toBe(
      lookCacheKey(selfieA, swappedLip, "clothes"),
    );
    expect(lookCacheKey(selfieA, look, "earrings")).toBe(
      lookCacheKey(selfieA, swappedLip, "earrings"),
    );
    expect(lookCacheKey(selfieA, look, "hair")).toBe(
      lookCacheKey(selfieA, swappedLip, "hair"),
    );
    expect(lookCacheKey(selfieA, look, "lipstick")).not.toBe(
      lookCacheKey(selfieA, swappedLip, "lipstick"),
    );
  });

  it("invalidates earrings and every later step when earrings change", () => {
    const swapped: LookIds = { ...look, earringId: "gold-hoops" };
    expect(lookCacheKey(selfieA, look, "clothes")).toBe(
      lookCacheKey(selfieA, swapped, "clothes"),
    );
    expect(lookCacheKey(selfieA, look, "earrings")).not.toBe(
      lookCacheKey(selfieA, swapped, "earrings"),
    );
    expect(lookCacheKey(selfieA, look, "hair")).not.toBe(
      lookCacheKey(selfieA, swapped, "hair"),
    );
    expect(lookCacheKey(selfieA, look, "lipstick")).not.toBe(
      lookCacheKey(selfieA, swapped, "lipstick"),
    );
  });

  it("includes only parameters applied through the requested step", () => {
    expect(lookCacheKey(selfieA, look, "clothes")).toBe(
      `${selfieA}|clothes|clothes:marigold-anarkali`,
    );
    expect(lookCacheKey(selfieA, look, "earrings")).toContain(
      "earrings:temple-jhumkas",
    );
    expect(lookCacheKey(selfieA, look, "clothes")).not.toContain("earrings:");
  });
});
