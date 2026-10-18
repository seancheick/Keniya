import { describe, expect, it } from "vitest";
import { snack } from "./__fixtures__/snacks";
import { checkLineup, derivedPregnancyChecks, eligibleFor, fitsBoxes } from "./rules";
import { DEFAULT_BOX_RULES, DEFAULT_SETTINGS } from "./types";

const policy = DEFAULT_SETTINGS.policy;
const all = { P1: "PASS", P2: "PASS", P7a: "PASS", P7b: "PASS", P8: "PASS" };

describe("data checks P3–P6 fill themselves", () => {
  it("PASS when the data is on the label; ingredient checks come from the ingredient screen", () => {
    const s = snack({ caffeine_mg: null, ingredients: "almonds, sea salt", allergens: "Contains almonds", pregnancy_checks: {} });
    expect(derivedPregnancyChecks(s)).toEqual({ P1: "PASS", P2: "PASS", P7a: "PASS", P7b: "PASS", P3: "PASS", P4: "PASS", P5: "PASS", P6: "PASS" });
    // P8 (one pack = one serving) is read from the label, never derived.
    expect(fitsBoxes(s).pregnancy_comfort.reasons).toEqual(["Not yet checked: P8"]);
    expect(fitsBoxes({ ...s, pregnancy_checks: { P8: "PASS" } }).pregnancy_comfort.fits).toBe(true);
  });
  it("no ingredient-derived PASS without ingredients, or for a check with a finding", () => {
    expect(derivedPregnancyChecks(snack({ ingredients: null, pregnancy_checks: {} }))).not.toHaveProperty("P2");
    const raw = derivedPregnancyChecks(snack({ ingredients: "raw milk cheese, salt", pregnancy_checks: {} }));
    expect(raw).not.toHaveProperty("P1");
    expect(raw).not.toHaveProperty("P2");
    expect(raw.P7a).toBe("PASS");
    expect(derivedPregnancyChecks(snack({ ingredients: "almonds, maltitol", pregnancy_checks: {} }))).not.toHaveProperty("P7b");
  });
  it("a stored FAIL always wins over the derived PASS", () => {
    const s = snack({ ingredients: "almonds", allergens: "Contains almonds", pregnancy_checks: { ...all, P6: "FAIL" } });
    expect(fitsBoxes(s).pregnancy_comfort.reasons).toEqual(["Failed P6"]);
  });
  it("no allergen statement leaves P6 for a person", () => {
    const s = snack({ ingredients: "almonds", allergens: null, pregnancy_checks: all });
    expect(fitsBoxes(s).pregnancy_comfort.reasons).toEqual(["Not yet checked: P6"]);
  });
});

describe("chocolate no longer stalls pregnancy picks", () => {
  // Unreal dark chocolate coconut bar, 15 g, no caffeine on the label.
  const bar = snack({
    calories: 70, protein_g: 0.5, fiber_g: 1, carbs_g: 8, added_sugar_g: 3, sodium_mg: 0, sat_fat_g: 4.5,
    caffeine_mg: null, unit_wt_oz: 15 / 28.3495, ingredients: "Organic Coconut, Organic Cassava Syrup, Dark Chocolate (chocolate liquor, cane sugar, cocoa butter, vanilla)",
    allergens: "Contains coconut", pregnancy_checks: all,
  });
  it("estimated ≤12 mg passes the 50 mg pack cap", () => {
    expect(eligibleFor("pregnancy_comfort", bar, DEFAULT_BOX_RULES.pregnancy_comfort, policy).fits).toBe(true);
  });
  it("box-level caffeine and chocolate count are warnings", () => {
    const picks = Array.from({ length: 5 }, () => ({ snack: { ...bar, id: Math.random().toString() }, category: "Sweet" }));
    const checks = checkLineup("pregnancy_comfort", DEFAULT_BOX_RULES.pregnancy_comfort, picks, DEFAULT_SETTINGS, 0);
    expect(checks.find((c) => c.key === "chocolate")).toMatchObject({ level: "warn", pass: false, deficit: 1 });
    expect(checks.find((c) => c.key === "boxcaffeine")).toMatchObject({ level: "warn", pass: true });
    expect(checks.find((c) => c.key === "caffeine")).toMatchObject({ pass: true });
  });
});

describe("synthetic dyes are rejected in every box", () => {
  it("Albanese gummies", () => {
    const g = snack({ ingredients: "corn syrup, sugar, gelatin, FD&C Red #40, FD&C Yellow #5", pregnancy_checks: all, allergens: "None" });
    for (const slug of ["pregnancy_comfort", "heart", "glp1"] as const)
      expect(eligibleFor(slug, g, DEFAULT_BOX_RULES[slug], policy).reasons.join()).toMatch(/Synthetic dye/);
  });
});

describe("Blood Sugar / GDM treats may carry up to 5 g added sugar", () => {
  // Unreal dark chocolate peanut butter cup, 15 g: a treat-only pick (no protein/fiber anchor).
  const cup = snack({
    calories: 80, protein_g: 1, fiber_g: 1, carbs_g: 7, added_sugar_g: 5, sodium_mg: 40, sat_fat_g: 3,
    ingredients: "dark chocolate, organic peanuts, organic cane sugar", allergens: "Contains peanuts", pregnancy_checks: all,
  });
  it("a treat at 5 g passes; 5.5 g fails", () => {
    expect(eligibleFor("blood_sugar", cup, DEFAULT_BOX_RULES.blood_sugar, policy).fits).toBe(true);
    expect(eligibleFor("blood_sugar", { ...cup, added_sugar_g: 5.5 }, DEFAULT_BOX_RULES.blood_sugar, policy).reasons.join()).toMatch(/max 5 g/);
  });
  it("a core (protein-anchored) pick stays at 3 g, even if tagged a treat", () => {
    const bar = snack({ protein_g: 8, carbs_g: 12, added_sugar_g: 4, roles: { CT: true }, pregnancy_checks: all });
    expect(eligibleFor("blood_sugar", bar, DEFAULT_BOX_RULES.blood_sugar, policy).reasons.join()).toMatch(/4 g added sugar \(max 3 g\)/);
  });
});
