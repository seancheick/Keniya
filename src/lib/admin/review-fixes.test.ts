import { describe, expect, it } from "vitest";
import { snack } from "./__fixtures__/snacks";
import { ingredientsHash } from "./ingredients";
import { eligibleFor, nutFatException } from "./rules";
import { DEFAULT_BOX_RULES, DEFAULT_SETTINGS, inheritParentRules, type BoxRules, type BoxSlug } from "./types";

const elig = (slug: BoxSlug, p: ReturnType<typeof snack>, rules: BoxRules = DEFAULT_BOX_RULES[slug]) => eligibleFor(slug, p, rules, DEFAULT_SETTINGS.policy);
const PASS = Object.fromEntries(["P1", "P2", "P3", "P4", "P5", "P6", "P7b", "P8"].map((k) => [k, "PASS"]));

describe("clinician decisions take effect", () => {
  const ing = "almonds, licorice root extract";
  const base = snack({ pregnancy_checks: PASS, caffeine_mg: 0, ingredients: ing }); // P7a left blank
  it("an open finding fails a blank check at evaluation time; an accept unblocks it", () => {
    expect(elig("pregnancy_comfort", base).fits).toBe(false);
    const resolutions = [{ finding_key: "watchlist:licorice root", ingredients_hash: ingredientsHash(ing), decision: "accept" as const }];
    expect(elig("pregnancy_comfort", { ...base, pregnancy_checks: { ...PASS, P7a: "PASS" }, resolutions }).fits).toBe(true);
  });
  it("confirm_fail on a review finding is a decided fail, not a pending decision", () => {
    const herb = "almonds, ashwagandha root extract";
    const p = { ...base, pregnancy_checks: { ...PASS, P7a: "PASS" }, ingredients: herb };
    expect(elig("pregnancy_comfort", p).reasons.join(" ")).toMatch(/Needs clinician decision/);
    const confirmed = { ...p, resolutions: [{ finding_key: "botanical:ashwagandha", ingredients_hash: ingredientsHash(herb), decision: "confirm_fail" as const }] };
    const r = elig("pregnancy_comfort", confirmed);
    expect(r.fits).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/confirmed fail by the PharmaGuide Team/);
    expect(r.reasons.join(" ")).not.toMatch(/Needs clinician decision/);
  });
});

describe("GDM inheritance: null is strict for exception allowances", () => {
  const live = (over: Partial<Record<BoxSlug, Partial<BoxRules>>>) =>
    inheritParentRules(Object.fromEntries(Object.entries(DEFAULT_BOX_RULES).map(([k, v]) => [k, { ...v, ...(over[k as BoxSlug] ?? {}) }])) as Record<BoxSlug, BoxRules>);
  it("Blood Sugar dropping the treat allowance drops it for GDM", () => {
    const r = live({ blood_sugar: { treatAddedSugarMax: null } });
    expect(r.gestational_diabetes.treatAddedSugarMax).toBeNull();
    const treat = snack({ protein_g: 1, fiber_g: 0, carbs_g: 12, added_sugar_g: 5, calories: 120, caffeine_mg: 0, ingredients: "sugar, cocoa butter" });
    expect(elig("blood_sugar", treat, r.blood_sugar).fits).toBe(false);
    expect(elig("gestational_diabetes", treat, r.gestational_diabetes).fits).toBe(false);
  });
  it("ordinary ceilings still take the strictest number", () => {
    expect(live({ blood_sugar: { carbsMax: 12 } }).gestational_diabetes.carbsMax).toBe(12);
  });
});

describe("nut and seed butters keep the nut/seed allowance", () => {
  const nb = (ingredients: string) => snack({ roles: { NS: true }, sat_fat_g: 3, ingredients });
  it("peanut or almond butter isn't added saturated fat", () => {
    expect(nutFatException(nb("peanut butter (peanuts, salt)"))).toBe(true);
    expect(nutFatException(nb("almonds, almond butter, sea salt"))).toBe(true);
  });
  it("dairy butter still voids it", () => {
    expect(nutFatException(nb("peanuts, butter, salt"))).toBe(false);
  });
});
