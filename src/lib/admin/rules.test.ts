import { describe, expect, it } from "vitest";
import { gingerChews, popcorn, settings, snack } from "./__fixtures__/snacks";
import { checkLineup, eligibleFor, fitsBoxes, isReady, packBlockers, shipsUnderPolicy, type Pick } from "./rules";
import { DEFAULT_BOX_RULES } from "./types";

describe("product fit (workbook v4 formulas)", () => {
  it("popcorn: pregnancy ✓, carb ✓ via portioned treat (fiber alone isn't fiber-forward), heart ✓ via whole grain", () => {
    const f = fitsBoxes(popcorn());
    expect(f.pregnancy_comfort.fits).toBe(true);
    expect(f.blood_sugar).toMatchObject({ fits: true, via: ["Portioned treat"] });
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

describe("final eligibility (qualifies + gates)", () => {
  const policy = settings.policy;
  it("blocks a high-sodium seed pack from Heart even though its roles qualify it", () => {
    const seeds = snack({ roles: { NS: true, UF: true }, sodium_mg: 2142, sat_fat_g: 4.6, fiber_g: 13 });
    expect(fitsBoxes(seeds).heart.fits).toBe(true); // qualifies
    const e = eligibleFor("heart", seeds, DEFAULT_BOX_RULES.heart, policy);
    expect(e.fits).toBe(false);
    expect(e.reasons.join(" ")).toMatch(/2142 mg sodium \(max 230 mg\)/);
    expect(e.reasons.join(" ")).toMatch(/4.6 g saturated fat \(max 4 g for nuts\/seeds\)/);
  });
  it("allows nut sat fat up to 4 g but holds others to 2 g, and requires sat fat for Heart", () => {
    expect(eligibleFor("heart", snack({ roles: { NS: true }, sat_fat_g: 3 }), DEFAULT_BOX_RULES.heart, policy).fits).toBe(true);
    expect(eligibleFor("heart", snack({ roles: { WG: true }, sat_fat_g: 3 }), DEFAULT_BOX_RULES.heart, policy).fits).toBe(false);
    expect(eligibleFor("heart", snack({ roles: { WG: true }, sat_fat_g: null }), DEFAULT_BOX_RULES.heart, policy).reasons).toContain("Saturated fat not recorded");
  });
  it("caps Carb Conscious carbs and added sugar for every pick", () => {
    const fruit = snack({ protein_g: 2, fiber_g: 4, carbs_g: 31, added_sugar_g: 0, roles: { MF: true } });
    expect(eligibleFor("blood_sugar", fruit, DEFAULT_BOX_RULES.blood_sugar, policy).reasons).toContain("31 g carbs (max 20 g)");
    expect(eligibleFor("blood_sugar", snack({ carbs_g: 12, added_sugar_g: 2 }), DEFAULT_BOX_RULES.blood_sugar, policy).fits).toBe(true);
  });
  it("an unchecked P8 is unknown, not a pass", () => {
    const e = eligibleFor("heart", snack({ roles: { NS: true }, pregnancy_checks: {} }), DEFAULT_BOX_RULES.heart, policy);
    expect(e.fits).toBe(false);
    expect(e.reasons).toContain("Single-serve not yet confirmed (P8)");
  });

  it("rejected, liquid and multi-serve products are never eligible", () => {
    const r = DEFAULT_BOX_RULES.blood_sugar;
    expect(eligibleFor("blood_sugar", snack({ status: "Rejected" }), r, policy, "too salty").fits).toBe(false);
    expect(eligibleFor("blood_sugar", snack({ form: "Liquid" }), r, policy).fits).toBe(false);
    expect(eligibleFor("blood_sugar", snack({ pregnancy_checks: { P8: "FAIL" } }), r, policy).reasons).toContain("Multi-serve pack (P8)");
  });
});

describe("pack gate", () => {
  it("blocks packing until every pick is eligible, approved, has a UPC and a verified package", () => {
    const ok = snack({ status: "Approved" });
    const pre = snack({ status: "Pre-approved" });
    const r = DEFAULT_BOX_RULES.blood_sugar;
    expect(packBlockers("blood_sugar", [{ snack: ok, upc: "012", verifiedAt: "2026-10-05" }], r, settings.policy)).toEqual([]);
    const out = packBlockers("blood_sugar", [{ snack: pre, upc: null, verifiedAt: null }], r, settings.policy);
    expect(out[0]).toMatch(/Pre-approved, not clinician-approved, no UPC, package not verified/);
  });
});

describe("approval ladder", () => {
  it("legacy approvals and unverified packages block packing; Candidates block a lineup", () => {
    const r = DEFAULT_BOX_RULES.blood_sugar;
    const legacy = snack({ status: "Approved", clinicianApprovedBy: null });
    expect(packBlockers("blood_sugar", [{ snack: legacy, upc: "1", verifiedAt: "2026-10-05" }], r, settings.policy)[0]).toMatch(/legacy approval/);
    const picks = Array.from({ length: 14 }, () => ({ snack: snack({ categories: ["Savory"] }), category: "Savory" }));
    picks[0] = { snack: { ...picks[0].snack, status: "Candidate" }, category: "Savory" };
    const checks = checkLineup("blood_sugar", { ...r, categories: [] }, picks, settings, 6);
    expect(checks.find((c) => c.key === "candidate")!.pass).toBe(false);
    expect(isReady(checks)).toBe(false);
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
