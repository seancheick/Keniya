import { describe, expect, it } from "vitest";
import { mapFdcFood, packageOz } from "./fdc";

describe("USDA FoodData Central mapping", () => {
  it("reads label nutrients per serving", () => {
    const d = mapFdcFood("041570054712", {
      fdcId: 1,
      description: "WHOLE NATURAL ALMONDS",
      brandOwner: "Blue Diamond Growers",
      servingSize: 28,
      servingSizeUnit: "g",
      packageWeight: "1.5 oz/42 g",
      labelNutrients: {
        calories: { value: 170 },
        protein: { value: 6 },
        fiber: { value: 3.5 },
        carbohydrates: { value: 6 },
        addedSugar: { value: 0 },
        sodium: { value: 0 },
        saturatedFat: { value: 1 },
      },
    });
    expect(d).toMatchObject({ name: "Whole Natural Almonds", brand: "Blue Diamond Growers", unit_wt_oz: 1.5, scaled: false });
    expect(d.nutrition).toMatchObject({ calories: 170, protein_g: 6, fiber_g: 3.5, carbs_g: 6, added_sugar_g: 0, sodium_mg: 0, caffeine_mg: null });
  });

  it("falls back to per-100 g values scaled to a gram serving", () => {
    const d = mapFdcFood("1", {
      fdcId: 2,
      servingSize: 30,
      servingSizeUnit: "g",
      foodNutrients: [{ nutrientNumber: "539", value: 10 }, { nutrientNumber: "307", value: 400 }],
    });
    expect(d.scaled).toBe(true);
    expect(d.nutrition).toMatchObject({ added_sugar_g: 3, sodium_mg: 120 });
  });

  it("parses package weight", () => {
    expect(packageOz("35 g")).toBe(1.23);
    expect(packageOz("2.12 OZ (60g)")).toBe(2.12);
    expect(packageOz(undefined)).toBeNull();
  });
});

import { mergeDrafts } from "./lookup";
import type { OffDraft } from "./openfoodfacts";

describe("merging lookups", () => {
  const blank: OffDraft = { upc: "1", name: null, brand: null, nutrition: {}, unit_wt_oz: null, serving: null, ingredients: null, allergens: null, free_from: {}, imageUrl: null, scaled: false };
  it("USDA wins; Open Food Facts fills gaps and is listed", () => {
    const m = mergeDrafts(
      { ...blank, name: "Almonds", nutrition: { protein_g: 6, added_sugar_g: null } },
      { ...blank, name: "Amandes", nutrition: { protein_g: 7, added_sugar_g: 0 }, allergens: "Contains: nuts", free_from: { tree_nut_free: false } },
    )!;
    expect(m).toMatchObject({ name: "Almonds", allergens: "Contains: nuts", source: "USDA + Open Food Facts" });
    expect(m.nutrition).toMatchObject({ protein_g: 6, added_sugar_g: 0 });
    expect(m.fromOff).toEqual(["added_sugar_g", "allergens"]);
    expect(m.free_from).toEqual({ tree_nut_free: false });
  });
  it("either alone", () => {
    expect(mergeDrafts(null, null)).toBeNull();
    expect(mergeDrafts(null, blank)!.source).toBe("Open Food Facts");
  });
});
