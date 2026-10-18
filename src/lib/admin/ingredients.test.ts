import { describe, expect, it } from "vitest";
import { resolveCaffeine } from "./caffeine";
import { ingredientsHash, screenIngredients, suggestedFails, syntheticDye, unresolved, withScreeningFails } from "./ingredients";

// Real labels photographed in store (2026-10-17).
const GUMMIES =
  "CORN SYRUP, SUGAR, WATER, GELATIN, CITRIC ACID, NATURAL AND ARTIFICIAL FLAVORS, PECTIN, VEGETABLE OIL (COCONUT, CANOLA) AND CARNAUBA LEAF WAX (TO PREVENT STICKING), FD&C YELLOW #5, FD&C RED #40, FD&C BLUE #1, FD&C YELLOW #6.";
const POCKY =
  "WHEAT FLOUR, SUGAR, VEGETABLE OIL (FULLY HYDROGENATED PALM KERNEL OIL, PALM OIL, FULLY HYDROGENATED PALM OIL, FULLY HYDROGENATED RAPESEED OIL), WHOLE MILK POWDER, LACTOSE, MODIFIED FOOD STARCH, INULIN, VEGETABLE SHORTENING (PALM OIL, FULLY HYDROGENATED PALM OIL), COCOA POWDER, WHOLE WHEAT FLOUR, ARTIFICIAL FLAVOR, SOY LECITHIN, SALT, CORN STARCH, BAKER'S YEAST, SODIUM BICARBONATE.";
const UNREAL_COCONUT = "Organic Coconut, Organic Cassava Syrup, Dark Chocolate (chocolate liquor, cane sugar, cocoa butter, vanilla).";
const MAGIC_SPOON =
  "Casein, Allulose, Almond Butter, Tapioca Fiber, Palm Kernel and Palm Oil, Whey Protein Concentrate, Inulin, Glycerin, Freeze Dried Blueberries, Tapioca Starch, Natural Flavor, Salt, Cream (Cream, Natural Flavor), Sunflower Lecithin, Stevia Leaf Extract, Monkfruit Extract.";
const MADEGOOD =
  "Pure Gluten Free Oats, Sunflower oil, Cane Sugar, Invert Cane Sugar, Tapioca Fibre, Palm Fruit Oil, Dried Blueberries (Blueberries, Apple Juice Concentrate, Sunflower Oil), Natural Flavor, Sea Salt, Mushroom Powder, Rosemary Extract, Mixed Tocopherols, Vanilla Extract.";

const codes = (t: string) => screenIngredients(t).map((f) => f.code);

describe("ingredient screening (real labels)", () => {
  it("synthetic dyes are a Keniya reject", () => {
    expect(syntheticDye(GUMMIES)?.evidence).toMatch(/FD&C/i);
    expect(screenIngredients(GUMMIES).find((f) => f.code === "synthetic_dye")?.severity).toBe("reject");
  });
  it("chocolate is cocoa, not a caffeine source needing a person", () => {
    expect(codes(POCKY)).toContain("cocoa");
    expect(codes(UNREAL_COCONUT)).toEqual(["cocoa"]);
    expect(codes(POCKY)).not.toContain("caffeine_source");
  });
  it("sweeteners are customer-preference info only", () => {
    const f = screenIngredients(MAGIC_SPOON);
    expect(f.filter((x) => x.code === "sweetener").map((x) => x.severity)).toEqual(["info"]);
    expect(suggestedFails(f)).toEqual({});
  });
  it("a clean label flags nothing", () => {
    expect(codes(MADEGOOD)).toEqual([]);
  });
  it("no false alarms", () => {
    expect(codes("Organic Cassava Syrup, sea salt")).toEqual([]);
    expect(codes("Contains 2 g sugar alcohol (erythritol)")).toEqual(["sugar_alcohol"]);
    expect(codes("potato, sunflower oil, red wine vinegar, natural rum flavor")).toEqual([]);
    expect(codes("beet juice color, annatto, spirulina extract, turmeric")).toEqual([]);
    expect(codes("ginger root, peppermint tea")).toEqual([]);
  });
  it("pregnancy fails and reviews", () => {
    expect(suggestedFails(screenIngredients("raw milk cheese, salt"))).toEqual({ P2: "raw milk" });
    expect(suggestedFails(screenIngredients("sugar, licorice root extract"))).toEqual({ P7a: "licorice root" });
    expect(suggestedFails(screenIngredients("almonds, maltitol"))).toEqual({ P7b: "maltitol" });
    expect(screenIngredients("beef, salt, celery powder, beef jerky seasoning").map((f) => [f.code, f.severity])).toEqual([["cured_meat", "review"]]);
    expect(codes("chocolate, rum, sugar")).toContain("alcohol");
    expect(codes("organic black tea, ginger")).toEqual(["caffeine_source"]);
  });
  it("database watchlist rows add P7a fails; 'monitor' rows are review", () => {
    const f = screenIngredients("oats, bitter orange peel, sage", [
      { ingredient: "bitter orange", category: "avoid" },
      { ingredient: "sage", category: "monitor" },
    ]);
    expect(f.map((x) => [x.evidence.toLowerCase(), x.severity])).toEqual([
      ["bitter orange", "pregnancy_fail"],
      ["sage", "review"],
    ]);
  });
});

describe("caffeine resolution", () => {
  it("label value wins", () => {
    expect(resolveCaffeine({ labelMg: 12, ingredients: POCKY, unitOz: 0.51 })).toMatchObject({ mg: 12, source: "label" });
  });
  it("no caffeine-bearing ingredient → 0", () => {
    expect(resolveCaffeine({ labelMg: null, ingredients: MADEGOOD, unitOz: 1.06 })).toMatchObject({ mg: 0, source: "none_present" });
  });
  it("chocolate → worst-case estimate far under the 50 mg pregnancy cap", () => {
    // Unreal coconut bar 15 g: 15 × 0.8 = 12 mg max.
    expect(resolveCaffeine({ labelMg: null, ingredients: UNREAL_COCONUT, unitOz: 15 / 28.3495 })).toMatchObject({ mg: 12, source: "estimate_max" });
    // Pocky pack ~14.5 g with cocoa powder: 14.5 × 2.3 → 34 mg max.
    expect(resolveCaffeine({ labelMg: null, ingredients: POCKY, unitOz: 0.51 }).mg).toBeLessThan(50);
  });
  it("coffee/tea or missing data stays unknown", () => {
    expect(resolveCaffeine({ labelMg: null, ingredients: "black tea, ginger", unitOz: 0.1 }).mg).toBeNull();
    expect(resolveCaffeine({ labelMg: null, ingredients: "", unitOz: 1 }).mg).toBeNull();
    expect(resolveCaffeine({ labelMg: null, ingredients: UNREAL_COCONUT, unitOz: null }).mg).toBeNull();
  });
});

describe("withScreeningFails", () => {
  it("a current finding overrides an older PASS; clean ingredients keep decisions", () => {
    expect(withScreeningFails({ P2: "", P7a: "PASS" }, "sugar, maltitol, licorice root, rum")).toEqual({ P2: "FAIL", P7a: "FAIL", P7b: "FAIL" });
    expect(withScreeningFails({ P1: "PASS" }, "oats, honey")).toEqual({ P1: "PASS" });
  });
  it("an accepted resolution on the same ingredients keeps the PASS; an edit voids it", () => {
    const ing = "oats, licorice root";
    const r = [{ finding_key: "watchlist:licorice root", ingredients_hash: ingredientsHash(ing), decision: "accept" as const }];
    expect(withScreeningFails({ P7a: "PASS" }, ing, [], r)).toEqual({ P7a: "PASS" });
    expect(withScreeningFails({ P7a: "PASS" }, `${ing}, sugar`, [], r)).toEqual({ P7a: "FAIL" });
  });
});

describe("finding kinds", () => {
  it("dyes and sugar alcohols are brand standards; dyes can't be accepted", () => {
    const f = screenIngredients("sugar, maltitol, Red 40, licorice root");
    expect(f.map((x) => [x.code, x.kind])).toEqual([["synthetic_dye", "brand"], ["watchlist", "safety"], ["sugar_alcohol", "brand"]]);
    const all = f.map((x) => ({ finding_key: x.key, ingredients_hash: ingredientsHash("sugar, maltitol, Red 40, licorice root"), decision: "accept" as const }));
    expect(unresolved(f, "sugar, maltitol, Red 40, licorice root", all).map((x) => x.code)).toEqual(["synthetic_dye"]);
  });
});
