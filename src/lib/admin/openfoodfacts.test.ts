import { describe, expect, it } from "vitest";
import { mapOffProduct } from "./openfoodfacts";

describe("Open Food Facts mapping", () => {
  it("uses per-serving values, converts sodium g→mg, flags allergens as contains", () => {
    const d = mapOffProduct("0853584002034", {
      product_name: "Gluten free bread",
      brands: "Canyon Bakehouse, Llc",
      serving_quantity: 57,
      product_quantity: 28.35,
      nutriments: {
        "energy-kcal_serving": 130,
        proteins_serving: 3,
        fiber_serving: 2,
        carbohydrates_serving: 23,
        "added-sugars_serving": 0.208,
        sodium_serving: 0.21,
        "saturated-fat_serving": 0.5,
      },
      allergens_tags: ["en:eggs", "en:milk"],
    });
    expect(d).toMatchObject({ name: "Gluten free bread", brand: "Canyon Bakehouse", unit_wt_oz: 1, scaled: false });
    expect(d.nutrition).toMatchObject({ calories: 130, protein_g: 3, fiber_g: 2, carbs_g: 23, added_sugar_g: 0.2, sodium_mg: 210 });
    expect(d.free_from).toEqual({ vegan: false, dairy_free: false });
    expect(d.allergens).toMatch(/eggs, milk/);
  });

  it("scales per-100 g values to the serving and never uses total sugars as added sugar", () => {
    const d = mapOffProduct("1", {
      serving_quantity: "30",
      nutriments: { "energy-kcal_100g": 500, proteins_100g: 20, salt_100g: 1, sugars_100g: 30 },
    });
    expect(d.scaled).toBe(true);
    expect(d.nutrition).toMatchObject({ calories: 150, protein_g: 6, sodium_mg: 120, added_sugar_g: null });
  });
});
