import { describe, expect, it } from "vitest";
import { snack } from "./__fixtures__/snacks";
import { eligibleFor, giTolerabilityFlags, nutFatException } from "./rules";
import { DEFAULT_BOX_RULES, DEFAULT_SETTINGS, inheritParentRules, type BoxRules, type BoxSlug } from "./types";

const elig = (slug: BoxSlug, p: ReturnType<typeof snack>, rules: BoxRules = DEFAULT_BOX_RULES[slug]) => eligibleFor(slug, p, rules, DEFAULT_SETTINGS.policy);
const nut = (ingredients: string, sat_fat_g = 3) =>
  snack({ roles: { NS: true }, calories: 170, protein_g: 6, fiber_g: 3, carbs_g: 6, added_sugar_g: 1, sodium_mg: 0, sat_fat_g, ingredients });

describe("Heart saturated-fat allowance needs evidence the fat is intrinsic", () => {
  it("plain almonds keep the 4 g allowance", () => {
    expect(nutFatException(nut("dry roasted almonds, sea salt"))).toBe(true);
    expect(elig("heart", nut("dry roasted almonds, sea salt")).fits).toBe(true);
  });
  it("chocolate-coated almonds are held to the ordinary 2 g", () => {
    const p = nut("dark chocolate (cocoa mass, sugar, cocoa butter), almonds, sea salt");
    expect(nutFatException(p)).toBe(false);
    expect(elig("heart", p).reasons.join(" ")).toMatch(/3 g saturated fat \(max 2 g/);
  });
  it("nuts first but with butter or cheese added: ordinary limit", () => {
    expect(nutFatException(nut("cashews, butter, salt"))).toBe(false);
    expect(nutFatException(nut("almonds, cheddar cheese powder"))).toBe(false);
  });
  it("partially hydrogenated oil is rejected in Heart only", () => {
    const p = nut("peanuts, partially hydrogenated soybean oil, salt", 1.5);
    expect(elig("heart", p).reasons).toContain("Partially hydrogenated oil (trans fat): not in the Heart box");
    expect(elig("glp1", p).reasons.join(" ")).not.toMatch(/hydrogenated/);
  });
});

describe("GDM can't diverge from its parents", () => {
  const live = (over: Partial<Record<BoxSlug, Partial<BoxRules>>>) =>
    inheritParentRules(Object.fromEntries(Object.entries(DEFAULT_BOX_RULES).map(([k, v]) => [k, { ...v, ...(over[k as BoxSlug] ?? {}) }])) as Record<BoxSlug, BoxRules>);
  it("raising GDM's own carb limit doesn't loosen it", () => {
    expect(live({ gestational_diabetes: { carbsMax: 30 } }).gestational_diabetes.carbsMax).toBe(15);
  });
  it("tightening Blood Sugar flows into GDM", () => {
    const r = live({ blood_sugar: { addedSugarMax: 2, carbsMax: 12 } });
    expect(r.gestational_diabetes.addedSugarMax).toBe(2);
    expect(r.gestational_diabetes.carbsMax).toBe(12);
    const p = snack({ carbs_g: 14, added_sugar_g: 1, caffeine_mg: 0, protein_g: 6 });
    expect(elig("gestational_diabetes", p, r.gestational_diabetes).fits).toBe(false);
  });
  it("tightening Pregnancy caffeine flows into GDM", () => {
    expect(live({ pregnancy_comfort: { caffeineMax: 20 } }).gestational_diabetes.caffeineMax).toBe(20);
  });
  it("a GDM-eligible product is Pregnancy- and Blood Sugar-eligible", () => {
    const p = snack({ carbs_g: 12, added_sugar_g: 2, caffeine_mg: 0, protein_g: 6, ingredients: "almonds, oats" });
    const r = live({});
    expect(elig("gestational_diabetes", p, r.gestational_diabetes).fits).toBe(true);
    expect(elig("pregnancy_comfort", p, r.pregnancy_comfort).fits).toBe(true);
    expect(elig("blood_sugar", p, r.blood_sugar).fits).toBe(true);
  });
});

describe("caffeine screening estimates", () => {
  const choc = (oz: number, ingredients: string) => snack({ caffeine_mg: null, unit_wt_oz: oz, ingredients, carbs_g: 10, added_sugar_g: 3 });
  it("a small chocolate estimate passes (15 g bar → 12 mg vs a 25 mg half-cap)", () => {
    expect(elig("pregnancy_comfort", choc(15 / 28.3495, "coconut, dark chocolate")).fits).toBe(true);
  });
  it("an estimate above half the per-pack cap waits for the manufacturer value", () => {
    const pocky = choc(0.51, "wheat flour, sugar, cocoa powder, milk powder");
    expect(elig("pregnancy_comfort", pocky).reasons.join(" ")).toMatch(/Estimated caffeine 34 mg is over half the 50 mg limit/);
  });
  it("the same amount from the label passes", () => {
    expect(elig("pregnancy_comfort", snack({ caffeine_mg: 34, ingredients: "wheat flour, cocoa powder" })).fits).toBe(true);
  });
});

describe("GLP-1 GI-tolerability flags (review only)", () => {
  it("flags concentrated fiber, sugar alcohols and fatty picks", () => {
    expect(giTolerabilityFlags(snack({ fiber_g: 9 }))).toEqual(["9 g fiber"]);
    expect(giTolerabilityFlags(snack({ fiber_g: 6, ingredients: "almonds, chicory root fiber" }))[0]).toMatch(/added fiber/);
    expect(giTolerabilityFlags(snack({ fiber_g: 2, ingredients: "almonds, maltitol" }))).toEqual(["sugar alcohol"]);
    expect(giTolerabilityFlags(snack({ fiber_g: 2, sat_fat_g: 5 }))).toEqual(["5 g saturated fat"]);
    expect(giTolerabilityFlags(snack({ fiber_g: 3, sat_fat_g: 1, ingredients: "oats" }))).toEqual([]);
  });
  it("never blocks eligibility", () => {
    expect(elig("glp1", snack({ protein_g: 10, fiber_g: 9, carbs_g: 15, sat_fat_g: 1, ingredients: "whey, chicory root" })).fits).toBe(true);
  });
});
