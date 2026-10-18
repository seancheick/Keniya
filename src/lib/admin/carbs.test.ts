import { describe, expect, it } from "vitest";
import { snack } from "./__fixtures__/snacks";
import { netCarbs } from "./carbs";
import { eligibleFor, highFiberReview, reasonCode } from "./rules";
import { DEFAULT_BOX_RULES, DEFAULT_SETTINGS, type BoxSlug } from "./types";

const review = (slug: BoxSlug, p: ReturnType<typeof snack>) => highFiberReview(slug, p, DEFAULT_BOX_RULES[slug], DEFAULT_SETTINGS.policy);
const elig = (slug: BoxSlug, p: ReturnType<typeof snack>) => eligibleFor(slug, p, DEFAULT_BOX_RULES[slug], DEFAULT_SETTINGS.policy);
// A protein- and fiber-forward bar so only the carb limit is in play.
const bar = (carbs_g: number, fiber_g: number | null, extra: Partial<ReturnType<typeof snack>> = {}) =>
  snack({ calories: 190, protein_g: 10, fiber_g, carbs_g, added_sugar_g: 2, sodium_mg: 120, sat_fat_g: 1.5, caffeine_mg: 0, ingredients: "almonds, chicory root fiber, whey", ...extra });

describe("net carbs", () => {
  it("total − fiber; sugar alcohols and allulose are never subtracted", () => {
    expect(netCarbs({ carbs_g: 23, fiber_g: 9 })).toMatchObject({ net: 14, issue: null });
    expect(netCarbs({ carbs_g: 20, fiber_g: 3 }).net).toBe(17); // with 6 g sugar alcohols on the label
  });
  it("explicit 0 g fiber is a valid value", () => {
    expect(netCarbs({ carbs_g: 12, fiber_g: 0 })).toMatchObject({ net: 12, issue: null });
  });
  it("missing fiber stays unknown", () => {
    expect(netCarbs({ carbs_g: 18, fiber_g: null })).toMatchObject({ net: null, issue: "FIBER_MISSING" });
  });
  it("fiber over total carbs is invalid, never zero", () => {
    expect(netCarbs({ carbs_g: 10, fiber_g: 12 })).toMatchObject({ net: null, issue: "INVALID_NUTRITION" });
    expect(netCarbs({ carbs_g: -1, fiber_g: 0 })).toMatchObject({ net: null, issue: "INVALID_NUTRITION" });
  });
  it("judged per sealed pack: a 2-serving pack is entered as the whole pack and still fails single-serve", () => {
    const pack = bar(18, 6, { pregnancy_checks: { P8: "FAIL" } });
    expect(netCarbs(pack).net).toBe(12);
    expect(elig("blood_sugar", pack).reasons).toContain("Multi-serve pack (P8)");
  });
});

describe("high-fiber review (internal, never eligibility)", () => {
  it("Product A 12/3: eligible; no review needed", () => {
    expect(elig("blood_sugar", bar(12, 3)).fits).toBe(true);
    expect(review("blood_sugar", bar(12, 3))).toBe(false);
  });
  it("Product B 23/9 → 14 net: review only, still not eligible; GDM never", () => {
    const b = bar(23, 9);
    expect(elig("blood_sugar", b).fits).toBe(false);
    expect(elig("blood_sugar", b).codes).toEqual(["CARBS_OVER"]);
    expect(review("blood_sugar", b)).toBe(true);
    expect(review("glp1", b)).toBe(true); // 23 g is over GLP-1's 20 g total limit too
    expect(review("gestational_diabetes", b)).toBe(false);
  });
  it("Product C 27/13 → 14 net: over the 25 g ceiling, excluded from review", () => {
    expect(review("blood_sugar", bar(27, 13))).toBe(false);
  });
  it("Product D 18/unknown: incomplete data, no review", () => {
    expect(review("blood_sugar", bar(18, null))).toBe(false);
  });
  it("invalid fiber never reaches review", () => {
    expect(review("blood_sugar", bar(20, 22))).toBe(false);
  });
  it("sugar alcohols aren't subtracted: 20 total / 3 fiber stays 17 net, no review", () => {
    expect(review("blood_sugar", bar(20, 3, { sugar_alcohols_g: 6 }))).toBe(false);
  });
  it("allulose bar (Magic Spoon 17/7) is reviewed through fiber only", () => {
    const ms = bar(17, 7, { ingredients: "casein, allulose, almond butter, tapioca fiber" });
    expect(netCarbs(ms).net).toBe(10);
    expect(review("blood_sugar", ms)).toBe(true);
  });
  it("any other failure keeps a product off the review list", () => {
    expect(review("blood_sugar", bar(23, 9, { added_sugar_g: 6 }))).toBe(false);
  });
  it("GLP-1 dual limit: ≤20 net and ≤25 total", () => {
    expect(review("glp1", bar(24, 5))).toBe(true);
    expect(review("glp1", bar(26, 9))).toBe(false);
  });
});

describe("reason codes", () => {
  it("classify the engine's reason texts", () => {
    expect(reasonCode("23 g carbs (max 15 g)")).toBe("CARBS_OVER");
    expect(reasonCode("6 g added sugar (treat) (max 5 g)")).toBe("ADDED_SUGAR_OVER");
    expect(reasonCode("Synthetic dye (Red 40): Keniya standard")).toBe("DYE");
    expect(reasonCode("Caffeine value missing")).toBe("CAFFEINE_UNKNOWN");
    expect(reasonCode("Current ingredients: licorice root (P7a)")).toBe("SAFETY_FINDING");
  });
});
