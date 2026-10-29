import { describe, expect, it } from "vitest";
import { catalog } from "@/data/catalog";
import { OCCASION_LOOKS } from "@/lib/look/defaults";
import { pickLook, remainingBudget } from "@/lib/look/picker";

describe("pickLook", () => {
  it("returns the captured Diwali look that has real YouCam renders", () => {
    const look = pickLook(catalog, "diwali", 14000);
    expect(look.ids).toEqual(OCCASION_LOOKS.diwali);
    expect(look.outfit.id).toBe("marigold-anarkali");
    expect(look.hairstyle.id).toBe("side-sweep");
    expect(look.earrings.id).toBe("temple-jhumkas");
    expect(look.lip.id).toBe("sindoor-rose");
    expect(look.withinBudget).toBe(true);
    expect(look.hairstyle.name).toBe("Classic Side Sweep");
    expect(look.hairstyle.youcamTemplateId).toBe("female_boho_side_braid");
  });

  it("returns the captured looks for the other occasions", () => {
    expect(pickLook(catalog, "sangeet", 14000).ids).toEqual(OCCASION_LOOKS.sangeet);
    expect(pickLook(catalog, "office-party", 14000).ids).toEqual(
      OCCASION_LOOKS["office-party"],
    );
    expect(pickLook(catalog, "wedding-guest", 14000).ids).toEqual(
      OCCASION_LOOKS["wedding-guest"],
    );
    expect(pickLook(catalog, "sangeet", 14000).hairstyle.name).toBe("Gajra Bun");
    expect(pickLook(catalog, "sangeet", 14000).hairstyle.youcamTemplateId).toBe(
      "female_messy_bun",
    );
  });

  it("still returns the captured look when the budget is below its total", () => {
    const look = pickLook(catalog, "wedding-guest", 8000);
    expect(look.ids).toEqual(OCCASION_LOOKS["wedding-guest"]);
    expect(look.withinBudget).toBe(false);
    expect(look.outfit.id).toBe("banarasi-lehenga");
  });

  it("computes remaining budget for a swap without counting the swapped item", () => {
    const look = pickLook(catalog, "diwali", 14000);
    const remaining = remainingBudget(14000, look.items, look.earrings);
    expect(remaining).toBe(14000 - (look.total - look.earrings.priceInr));
  });
});
