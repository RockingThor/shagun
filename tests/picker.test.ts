import { describe, expect, it } from "vitest";
import { catalog, type CatalogItem, type Occasion } from "@/data/catalog";
import { pickLook, remainingBudget } from "@/lib/look/picker";

function minComplete(occasion: Occasion) {
  const cat = (category: CatalogItem["category"]) =>
    catalog.filter(
      (item) => item.category === category && item.occasions.includes(occasion),
    );
  const cheapest = (items: CatalogItem[]) =>
    items.reduce((min, item) => (item.priceInr < min.priceInr ? item : min));
  const items = [
    cheapest(cat("outfit")),
    cheapest(cat("earrings")),
    cheapest(cat("hairstyle")),
    cheapest(cat("lip")),
  ];
  return items.reduce((sum, item) => sum + item.priceInr, 0);
}

describe("pickLook", () => {
  it("returns one item in each category that suits the occasion", () => {
    const look = pickLook(catalog, "diwali", 10000);
    expect(look.items).toHaveLength(4);
    expect(look.outfit.category).toBe("outfit");
    expect(look.earrings.category).toBe("earrings");
    expect(look.hairstyle.category).toBe("hairstyle");
    expect(look.lip.category).toBe("lip");
    for (const item of look.items) {
      expect(item.occasions).toContain("diwali");
    }
    expect(look.total).toBe(
      look.outfit.priceInr +
        look.earrings.priceInr +
        look.hairstyle.priceInr +
        look.lip.priceInr,
    );
  });

  it("stays within a generous Diwali budget and spends close to the cap", () => {
    const look = pickLook(catalog, "diwali", 10000);
    expect(look.withinBudget).toBe(true);
    expect(look.total).toBeLessThanOrEqual(10000);
    expect(look.total).toBeGreaterThan(8000);
    expect(look.ids.outfitId).toBe(look.outfit.id);
  });

  it("prefers the Banarasi lehenga for a wedding guest when the budget allows", () => {
    const look = pickLook(catalog, "wedding-guest", 16000);
    expect(look.withinBudget).toBe(true);
    expect(look.outfit.id).toBe("banarasi-lehenga");
  });

  it("keeps the office-party look in ivory/navy rather than a lehenga", () => {
    const look = pickLook(catalog, "office-party", 16000);
    expect(["ivory-cape", "navy-coord"]).toContain(look.outfit.id);
    expect(look.outfit.occasions).toContain("office-party");
  });

  it("returns the cheapest complete look and flags over-budget when the cap is tight", () => {
    const floor = minComplete("sangeet");
    const look = pickLook(catalog, "sangeet", floor - 1);
    expect(look.withinBudget).toBe(false);
    expect(look.total).toBe(floor);
  });

  it("computes remaining budget for a swap without counting the swapped item", () => {
    const look = pickLook(catalog, "diwali", 10000);
    const remaining = remainingBudget(10000, look.items, look.earrings);
    expect(remaining).toBe(10000 - (look.total - look.earrings.priceInr));
  });
});
