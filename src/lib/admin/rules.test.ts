import { describe, expect, it } from "vitest";
import { gingerChews, popcorn, settings, snack } from "./__fixtures__/snacks";
import { optimize } from "./optimizer";
import { blockingFailures, checkLineup, eligibleFor, fitsBoxes, isReady, isClinicianApproved, lineupStage, packBlockers, shipsUnderPolicy, type Pick } from "./rules";
import { BOX_SLUGS, DEFAULT_BOX_RULES, resolveBoxRules, type Snack } from "./types";

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
    expect(f.heart.via).toEqual(["Unsweetened drink"]);
  });

  it("gestational diabetes needs both the pregnancy checks and a carb pathway", () => {
    const ok = snack({ protein_g: 6, carbs_g: 12 });
    expect(fitsBoxes(ok).gestational_diabetes.via).toEqual(expect.arrayContaining(["All pregnancy checks pass", "Protein-forward"]));
    const unchecked = fitsBoxes({ ...ok, pregnancy_checks: { ...ok.pregnancy_checks, P2: "" } }).gestational_diabetes;
    expect(unchecked.fits).toBe(false);
    expect(unchecked.reasons).toContain("Not yet checked: P2");
    expect(fitsBoxes(gingerChews()).gestational_diabetes.fits).toBe(false); // pregnancy-safe, no carb pathway
  });

  it("GLP-1 takes protein, fiber, whole-food, small treats and unsweetened drinks; postpartum mirrors the pregnancy checks", () => {
    expect(fitsBoxes(snack({ protein_g: 5 })).glp1.via).toContain("Protein-forward");
    const bigTreat = snack({ protein_g: 1, fiber_g: 1, calories: 190, added_sugar_g: 4, carbs_g: 18 });
    expect(fitsBoxes(bigTreat).blood_sugar.via).toEqual(["Portioned treat"]);
    expect(fitsBoxes(bigTreat).glp1.fits).toBe(false); // 190 cal is over the 150 cal small-treat line
    expect(fitsBoxes(popcorn()).postpartum).toMatchObject({ box: "postpartum", fits: true });
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
    expect(e.reasons.join(" ")).toMatch(/2142 mg sodium \(max 140 mg\)/);
    expect(e.reasons.join(" ")).toMatch(/4.6 g saturated fat \(max 4 g for nuts\/seeds\)/);
  });
  it("allows nut sat fat up to 4 g but holds others to 2 g, and requires sat fat for Heart", () => {
    expect(eligibleFor("heart", snack({ roles: { NS: true }, sat_fat_g: 3 }), DEFAULT_BOX_RULES.heart, policy).fits).toBe(true);
    expect(eligibleFor("heart", snack({ roles: { WG: true }, sat_fat_g: 3 }), DEFAULT_BOX_RULES.heart, policy).fits).toBe(false);
    expect(eligibleFor("heart", snack({ roles: { WG: true }, sat_fat_g: null }), DEFAULT_BOX_RULES.heart, policy).reasons).toContain("Saturated fat not recorded");
  });
  it("the nut/seed allowance is for intrinsic fat: an unsaturated-fat role alone or added tropical oil doesn't earn it", () => {
    const r = DEFAULT_BOX_RULES.heart;
    expect(eligibleFor("heart", snack({ roles: { UF: true }, sat_fat_g: 3 }), r, policy).reasons).toContain("3 g saturated fat (max 2 g)");
    const palm = snack({ roles: { NS: true }, sat_fat_g: 3, ingredients: "Almonds, Palm Kernel Oil, Sea Salt" });
    expect(eligibleFor("heart", palm, r, policy).reasons.join()).toMatch(/added tropical oil voids/);
    expect(eligibleFor("heart", snack({ roles: { NS: true }, sat_fat_g: 3, ingredients: "Almonds, sunflower oil" }), r, policy).fits).toBe(true);
  });
  it("Heart caps added sugar at 5 g on core picks and 8 g on a controlled treat", () => {
    const r = DEFAULT_BOX_RULES.heart;
    expect(eligibleFor("heart", snack({ roles: { WG: true }, added_sugar_g: 6 }), r, policy).reasons).toContain("6 g added sugar (max 5 g)");
    expect(eligibleFor("heart", snack({ roles: { CT: true }, added_sugar_g: 7 }), r, policy).fits).toBe(true);
    expect(eligibleFor("heart", snack({ roles: { CT: true }, added_sugar_g: 9 }), r, policy).reasons.join()).toMatch(/9 g added sugar \(treat\) \(max 8 g\)/);
  });
  it("Pregnancy caps caffeine per pack (chocolate passes, an energy product doesn't)", () => {
    const r = DEFAULT_BOX_RULES.pregnancy_comfort;
    expect(eligibleFor("pregnancy_comfort", snack({ caffeine_mg: 17 }), r, policy).fits).toBe(true);
    expect(eligibleFor("pregnancy_comfort", snack({ caffeine_mg: 80 }), r, policy).reasons).toContain("80 mg caffeine (max 50 mg)");
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

describe("box recipes are satisfiable on paper", () => {
  it("every default recipe allows exactly `total` picks and each range is sane", () => {
    for (const slug of BOX_SLUGS) {
      const r = DEFAULT_BOX_RULES[slug];
      const lo = r.categories.reduce((t, c) => t + c.min, 0);
      const hi = r.categories.reduce((t, c) => t + c.max, 0);
      expect(lo, `${slug} minimums`).toBeLessThanOrEqual(r.total);
      expect(hi, `${slug} maximums`).toBeGreaterThanOrEqual(r.total);
      for (const c of r.categories) expect(c.min, `${slug} ${c.name}`).toBeLessThanOrEqual(c.max);
      if (r.substantialMin !== null) expect(r.substantialMin).toBeLessThanOrEqual(r.total);
      if (r.beverageMax !== null) expect(r.beverageMax).toBeLessThanOrEqual(r.total);
    }
  });
  it("the optimizer can build a READY lineup for every box from a catalog that only meets the rules", () => {
    // One eligible product per category per box, no slack, so a recipe no catalog can satisfy fails here.
    for (const slug of BOX_SLUGS) {
      const r = DEFAULT_BOX_RULES[slug];
      const pool: Snack[] = r.categories.flatMap((c) =>
        Array.from({ length: c.max }, () =>
          c.name === "Hydration"
            ? snack({ type: "Beverage", form: "Powder", calories: 0, protein_g: 0, fiber_g: 0, carbs_g: 0, added_sugar_g: 0, sodium_mg: 50, sat_fat_g: 0, unit_wt_oz: 0.2, categories: ["Hydration"] })
            : snack({ roles: { NS: true, WG: true, MF: true, WHOLE_FOOD: true }, protein_g: 6, fiber_g: 3, carbs_g: 10, added_sugar_g: 1, sodium_mg: 90, sat_fat_g: 1, categories: [c.name] }),
        ),
      );
      const res = optimize({ slug, rules: r, settings, snacks: pool, objective: "balanced", packagingOz: 6, requireStock: false });
      expect(isReady(res.checks), `${slug}: ${blockingFailures(res.checks).map((c) => `${c.label} ${c.value}`).join("; ")}`).toBe(true);
    }
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
  it("a missing purchase cost never blocks a lineup (it's the shopping list), only warns", () => {
    const picks = Array.from({ length: 14 }, () => ({ snack: snack({ categories: ["Savory"], roles: { WHOLE_FOOD: true }, unitCostCents: null }), category: "Savory" }));
    const checks = checkLineup("blood_sugar", { ...DEFAULT_BOX_RULES.blood_sugar, categories: [] }, picks, settings, 6);
    expect(checks.find((c) => c.key === "costed")).toMatchObject({ pass: false, level: "warn" });
    expect(isReady(checks)).toBe(true);
  });
  it("lineup stage: provisional → clinician approved → cleared to pack", () => {
    const pre = { snack: snack({ status: "Pre-approved", clinicianApprovedBy: null, packageVerified: false }) };
    const approved = { snack: snack({ clinicianApprovedBy: "Laurie Pham", packageVerified: false }) };
    const verified = { snack: snack({ clinicianApprovedBy: "Laurie Pham", packageVerified: true }) };
    expect(lineupStage([pre, approved], true).label).toBe("READY · PROVISIONAL");
    expect(lineupStage([approved, verified], true).label).toBe("READY · CLINICIAN APPROVED");
    expect(lineupStage([verified], true).label).toBe("CLEARED TO PACK");
    expect(lineupStage([verified], false).label).toBe("FIX");
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

  it("flags category ranges, the sodium limit and weight with deficits", () => {
    const picks = heartLineup();
    for (let i = 0; i < 3; i++) picks[i].snack = { ...picks[i].snack, sodium_mg: 160 };
    picks[13] = { snack: snack({ unit_wt_oz: 20, categories: ["Savory"], roles: { NS: true } }), category: "Savory" };
    const checks = checkLineup("heart", heartRules, picks, settings, 6);
    const failing = Object.fromEntries(checks.filter((c) => !c.pass).map((c) => [c.key, c.deficit]));
    expect(failing.fit).toBe(4); // three at 160 mg (over the 140 mg limit) plus the 20 oz pick that doesn't ship
    expect(failing["cat:Hydration"]).toBeUndefined(); // one tea left is still within 1–2
    expect(failing.weight).toBeGreaterThan(0);
    expect(isReady(checks)).toBe(false);
  });

  it("Blood Sugar counts treat-only picks against treatMax; unsweetened fruit isn't a treat", () => {
    const treatOnly = () => snack({ protein_g: 1, fiber_g: 1, calories: 120, added_sugar_g: 4, carbs_g: 18, categories: ["Sweet"] });
    const picks: Pick[] = Array.from({ length: 4 }, () => ({ snack: treatOnly(), category: "Sweet" }));
    const treats = checkLineup("blood_sugar", DEFAULT_BOX_RULES.blood_sugar, picks, settings, 6).find((c) => c.key === "treats")!;
    expect(treats).toMatchObject({ pass: false, deficit: 1, value: "4 (need ≤ 3)" });
    const applesauce = snack({ protein_g: 0, fiber_g: 1, calories: 60, added_sugar_g: 0, carbs_g: 15, roles: { MF: true } });
    expect(fitsBoxes(applesauce).blood_sugar.via).toEqual(["Portioned treat"]);
    const ok = checkLineup("blood_sugar", DEFAULT_BOX_RULES.blood_sugar, Array.from({ length: 4 }, () => ({ snack: applesauce, category: "Sweet" })), settings, 6).find((c) => c.key === "treats")!;
    expect(ok.pass).toBe(true);
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


describe("approval and live standards fail closed", () => {
  it("a shared admin name is not a clinical attestation", () => {
    expect(isClinicianApproved(snack())).toBe(true);
    expect(isClinicianApproved(snack({ approvalRole: null }))).toBe(false);
    expect(isClinicianApproved(snack({ clinicalDecision: "pending" }))).toBe(false);
    expect(isClinicianApproved(snack({ diligenceComplete: false }))).toBe(false);
    expect(isClinicianApproved(snack({ clinicianApprovedBy: "Sean" }))).toBe(false);
  });
  it("sweetened beverages fail every clinical hard gate regardless of pathways", () => {
    const drink = snack({ type: "Beverage", form: "Powder", added_sugar_g: 5, roles: { CT: true, NS: true, WHOLE_FOOD: true }, protein_g: 6, fiber_g: 5 });
    for (const slug of ["blood_sugar", "heart", "gestational_diabetes", "glp1"] as const) {
      expect(eligibleFor(slug, drink, DEFAULT_BOX_RULES[slug], settings.policy).fits).toBe(false);
      expect(eligibleFor(slug, drink, { ...DEFAULT_BOX_RULES[slug], beverageAddedSugarMax: 5 }, settings.policy).fits).toBe(true);
    }
  });
  it("unknown nut ingredients never earn the saturated-fat exception", () => {
    expect(eligibleFor("heart", snack({ ingredients: null, roles: { NS: true }, sat_fat_g: 3 }), DEFAULT_BOX_RULES.heart, settings.policy).fits).toBe(false);
  });
  it("malformed stored rules do not become code defaults", () => {
    expect(() => resolveBoxRules("heart", { total: "14" })).toThrow(/Invalid live rules/);
    expect(() => resolveBoxRules("heart", {})).toThrow(/Invalid live rules/);
    expect(() => resolveBoxRules("heart", null)).toThrow(/Invalid live rules/);
  });
});
