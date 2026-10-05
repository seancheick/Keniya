import { describe, expect, it } from "vitest";
import { gingerChews, popcorn, settings, snack } from "./__fixtures__/snacks";
import { checkLineup, fitsBoxes, isReady, shipsUnderPolicy, type Pick } from "./rules";
import { DEFAULT_BOX_RULES } from "./types";

describe("product fit (workbook v4 formulas)", () => {
  it("popcorn: pregnancy ✓, carb ✓ via fiber-forward + portioned treat, heart ✓ via whole grain", () => {
    const f = fitsBoxes(popcorn());
    expect(f.pregnancy_comfort.fits).toBe(true);
    expect(f.blood_sugar).toMatchObject({ fits: true, via: ["Fiber-forward", "Portioned treat"] });
    expect(f.heart.via).toContain("Whole grain");
  });

  it("ginger candy no longer qualifies for Heart via low sodium alone", () => {
    const f = fitsBoxes(gingerChews());
    expect(f.heart.fits).toBe(false);
    expect(f.heart.reasons[0]).toMatch(/No heart role/);
    // 9 g added sugar is over the portioned-treat limit (8 g), and it has no protein or fiber.
    expect(f.blood_sugar.fits).toBe(false);
  });

  it("portioned treat needs added sugar ≤ 8 g", () => {
    const treat = snack({ protein_g: 1, fiber_g: 1, calories: 150, added_sugar_g: 8, carbs_g: 20 });
    expect(fitsBoxes(treat).blood_sugar.via).toEqual(["Portioned treat"]);
    const tooSweet = snack({ protein_g: 1, fiber_g: 1, calories: 150, added_sugar_g: 9, carbs_g: 20 });
    expect(fitsBoxes(tooSweet).blood_sugar.fits).toBe(false);
  });

  it("missing nutrition makes a product ineligible everywhere", () => {
    const f = fitsBoxes(snack({ sodium_mg: null, fiber_g: null }));
    for (const b of Object.values(f)) {
      expect(b.fits).toBe(false);
      expect(b.reasons.join()).toMatch(/Missing nutrition: fiber, sodium/);
    }
  });

  it("pregnancy: P7c is info only; a blank blocking check fails; caffeine must be present", () => {
    const base = popcorn();
    expect(fitsBoxes({ ...base, pregnancy_checks: { ...base.pregnancy_checks, P7c: "FAIL" } }).pregnancy_comfort.fits).toBe(true);
    const blank = fitsBoxes({ ...base, pregnancy_checks: { ...base.pregnancy_checks, P8: "" } }).pregnancy_comfort;
    expect(blank.reasons).toEqual(["Not yet checked: P8"]);
    expect(fitsBoxes({ ...base, caffeine_mg: null }).pregnancy_comfort.reasons).toContain("Caffeine value missing");
  });

  it("rejected products fit nothing and show the reason", () => {
    const f = fitsBoxes(snack({ status: "Rejected" }), "Contains aloe");
    expect(f.heart.reasons[0]).toBe("Rejected: Contains aloe");
  });

  it("drinks: unsweetened low-sodium beverage fits carb and heart", () => {
    const tea = snack({ type: "Beverage", form: "Tea", calories: 0, protein_g: 0, fiber_g: 0, carbs_g: 0, added_sugar_g: 0, sodium_mg: 0 });
    const f = fitsBoxes(tea);
    expect(f.blood_sugar.via).toEqual(["Unsweetened drink"]);
    expect(f.heart.via).toEqual(["Unsweetened low-sodium drink"]);
  });

  it("shipping policy: liquids and heavy items don't ship", () => {
    expect(shipsUnderPolicy(snack({ form: "Liquid" }), settings.policy).ok).toBe(false);
    expect(shipsUnderPolicy(snack({ unit_wt_oz: 4 }), settings.policy).reason).toMatch(/over the 3.5 oz/);
    expect(shipsUnderPolicy(snack({ unit_wt_oz: 3.2, form: "Puree" }), settings.policy).ok).toBe(true);
  });
});

describe("lineup checks", () => {
  const heartRules = DEFAULT_BOX_RULES.heart;
  const heartLineup = (): Pick[] => [
    ...Array.from({ length: 4 }, () => ({ snack: snack({ roles: { NS: true }, categories: ["Savory"] }), category: "Savory" })),
    ...Array.from({ length: 2 }, () => ({ snack: snack({ categories: ["Protein"] }), category: "Protein" })),
    ...Array.from({ length: 4 }, () => ({ snack: snack({ roles: { MF: true }, fiber_g: 4, categories: ["Sweet"] }), category: "Sweet" })),
    ...Array.from({ length: 2 }, () => ({ snack: snack({ categories: ["Comfort"], roles: { WG: true } }), category: "Comfort" })),
    ...Array.from({ length: 2 }, () => ({
      snack: snack({ type: "Beverage", form: "Tea", calories: 0, protein_g: 0, fiber_g: 0, carbs_g: 0, added_sugar_g: 0, sodium_mg: 0, unit_wt_oz: 0.1, categories: ["Hydration"] }),
      category: "Hydration",
    })),
  ];

  it("a valid heart lineup is READY", () => {
    const checks = checkLineup("heart", heartRules, heartLineup(), settings, 6);
    expect(checks.filter((c) => c.level === "block" && !c.pass)).toEqual([]);
    expect(isReady(checks)).toBe(true);
  });

  it("flags category ranges, sodium cap and weight with deficits", () => {
    const picks = heartLineup();
    for (let i = 0; i < 3; i++) picks[i].snack = { ...picks[i].snack, sodium_mg: 400 };
    picks[13] = { snack: snack({ unit_wt_oz: 20, categories: ["Savory"], roles: { NS: true } }), category: "Savory" };
    const checks = checkLineup("heart", heartRules, picks, settings, 6);
    const failing = Object.fromEntries(checks.filter((c) => !c.pass).map((c) => [c.key, c.deficit]));
    expect(failing.sodium).toBe(1);
    expect(failing["cat:Hydration"]).toBeUndefined(); // one tea left is still within 1–2
    expect(failing.weight).toBeGreaterThan(0);
    expect(isReady(checks)).toBe(false);
  });

  it("a pre-approved pick still counts as not clinically approved", () => {
    const picks = heartLineup();
    picks[0] = { ...picks[0], snack: { ...picks[0].snack, status: "Pre-approved" } };
    const checks = checkLineup("heart", heartRules, picks, settings, 6);
    expect(checks.find((c) => c.key === "approved")!.value).toBe("1 (need ≤ 0)");
    expect(isReady(checks)).toBe(true); // a warning, not a blocker
  });

  it("duplicates and unapproved picks", () => {
    const picks = heartLineup();
    picks[1] = picks[0];
    picks[2] = { ...picks[2], snack: { ...picks[2].snack, status: "Candidate" } };
    const checks = checkLineup("heart", heartRules, picks, settings, 6);
    expect(checks.find((c) => c.key === "unique")!.pass).toBe(false);
    const approved = checks.find((c) => c.key === "approved")!;
    expect(approved).toMatchObject({ pass: false, level: "warn" });
  });
});
