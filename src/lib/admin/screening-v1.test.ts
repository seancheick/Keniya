import { describe, expect, it } from "vitest";
import { snack } from "./__fixtures__/snacks";
import { eligibleFor, screenResult } from "./rules";
import { DEFAULT_BOX_RULES, DEFAULT_SETTINGS, inheritParentRules, type BoxSlug } from "./types";

// Keniya Screening Standard v1.0 (owner 2026-10-18): every box answers PASS, FAIL or HOLD.
const policy = DEFAULT_SETTINGS.policy;
const rules = inheritParentRules(DEFAULT_BOX_RULES);
const screen = (slug: BoxSlug, over: Parameters<typeof snack>[0]) => eligibleFor(slug, snack(over), rules[slug], policy);

describe("PASS / FAIL / HOLD", () => {
  it("a broken rule is FAIL, missing data is HOLD, a broken rule beats missing data", () => {
    expect(screenResult([])).toBe("PASS");
    expect(screenResult(["NUTRITION_MISSING", "PREGNANCY_CHECK_BLANK"])).toBe("HOLD");
    expect(screenResult(["SODIUM_OVER"])).toBe("FAIL");
    expect(screenResult(["NUTRITION_MISSING", "SODIUM_OVER"])).toBe("FAIL");
    expect(screenResult(["OTHER"])).toBe("HOLD");
  });
  it("eligibleFor carries the result", () => {
    expect(screen("heart", {}).result).toBe("PASS");
    expect(screen("heart", { sodium_mg: null }).result).toBe("HOLD");
    expect(screen("heart", { ingredients: null }).result).toBe("HOLD");
    expect(screen("blood_sugar", { pregnancy_checks: {} }).result).toBe("HOLD"); // P8 single-serve unknown
  });
  it("a hard limit can't be outweighed by good nutrition (190 mg sodium roasted chickpeas in Heart)", () => {
    const chickpeas = { protein_g: 6, fiber_g: 6, carbs_g: 15, sodium_mg: 190, sat_fat_g: 0.5, ingredients: "Chickpeas, sunflower oil, sea salt" };
    const heart = screen("heart", chickpeas);
    expect(heart.result).toBe("FAIL");
    expect(heart.reasons).toContain("190 mg sodium (max 140 mg)");
    expect(screen("blood_sugar", chickpeas).result).toBe("PASS");
  });
});

describe("pregnancy-family policies", () => {
  it("sodium ≤360 mg per pack in Pregnancy and Postpartum, inherited by GDM", () => {
    for (const slug of ["pregnancy_comfort", "postpartum", "gestational_diabetes"] as const) {
      expect(rules[slug].sodiumMax).toBe(360);
      expect(screen(slug, { protein_g: 6, carbs_g: 12, sodium_mg: 360 }).result).toBe("PASS");
      expect(screen(slug, { protein_g: 6, carbs_g: 12, sodium_mg: 390 }).result).toBe("FAIL");
    }
  });
  it("cured or dried meat is out of the pregnancy family (Keniya policy), not out of Heart", () => {
    const jerky = { protein_g: 9, carbs_g: 3, sodium_mg: 130, sat_fat_g: 1, ingredients: "Beef, water, salt, spices", name: "Beef jerky" };
    const p = screen("pregnancy_comfort", { ...jerky, ingredients: "Beef jerky (beef, salt, spices)" });
    expect(p.result).toBe("FAIL");
    expect(p.reasons.join(" ")).toMatch(/Cured or dried meat|jerky/i);
    expect(screen("heart", { ...jerky, roles: { UF: false, NS: false, WG: false, MF: false, CT: false, WHOLE_FOOD: true } }).result).not.toBe("FAIL");
  });
  it("a caffeine estimate over the limit holds for the maker's value; a label value over it fails", () => {
    // 85 g dark chocolate bar, no caffeine printed: worst-case estimate 68 mg > 50 mg.
    const bar = { unit_wt_oz: 3, caffeine_mg: null, ingredients: "Dark chocolate (cocoa mass, sugar, cocoa butter), almonds" };
    const est = screen("pregnancy_comfort", bar);
    expect(est.result).toBe("HOLD");
    expect(est.codes).toContain("CAFFEINE_ESTIMATE_HOLD");
    expect(screen("pregnancy_comfort", { ...bar, caffeine_mg: 60 }).result).toBe("FAIL");
  });
});
