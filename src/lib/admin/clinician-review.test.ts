// Clinician review 2026-10-18: variety cap, protein/fiber-forward Blood Sugar, ingredients required.
import { describe, expect, it } from "vitest";
import { settings, snack } from "./__fixtures__/snacks";
import { optimize } from "./optimizer";
import { checkLineup, fitsBoxes, type Pick } from "./rules";
import { DEFAULT_BOX_RULES, inheritParentRules, type Snack } from "./types";

const today = new Date("2026-10-01T00:00:00Z");

describe("variety: at most 2 of one snack type", () => {
  it("is a blocking lineup check that names the repeated type", () => {
    const picks: Pick[] = Array.from({ length: 14 }, (_, i) => ({
      snack: snack({ brand: `B${i}`, name: i < 3 ? `Brand ${i} Applesauce Pouch` : `Snack item ${i}` }),
      category: null,
    }));
    const c = checkLineup("heart", DEFAULT_BOX_RULES.heart, picks, settings, 6).find((x) => x.key === "kindmax")!;
    expect(c).toMatchObject({ level: "block", pass: false, deficit: 1, value: "Fruit pouch ×3" });
    const ok = checkLineup("heart", DEFAULT_BOX_RULES.heart, picks.slice(1), settings, 6).find((x) => x.key === "kindmax")!;
    expect(ok.pass).toBe(true);
  });

  it("the optimizer never packs a third pouch or tea even when they score best", () => {
    const lib: Snack[] = [];
    for (let i = 0; i < 6; i++) lib.push(snack({ name: `Brand ${i} Applesauce Pouch`, roles: { MF: true }, fiber_g: 4, categories: ["Sweet"], unitCostCents: 10 }));
    for (let i = 0; i < 5; i++)
      lib.push(snack({ name: `Brand ${i} Ginger Tea`, type: "Beverage", form: "Tea", calories: 0, protein_g: 0, fiber_g: 0, carbs_g: 0, added_sugar_g: 0, sodium_mg: 0, unit_wt_oz: 0.1, categories: ["Hydration"], unitCostCents: 5 }));
    for (let i = 0; i < 10; i++) lib.push(snack({ name: `Nuts ${i}`, roles: { NS: true }, categories: ["Savory"], unitCostCents: 60 }));
    for (let i = 0; i < 6; i++) lib.push(snack({ name: `Bar ${i}`, roles: { WG: true }, categories: ["Protein"], unitCostCents: 90 }));
    for (let i = 0; i < 4; i++) lib.push(snack({ name: `Fruit bar ${i}`, roles: { MF: true }, fiber_g: 4, categories: ["Sweet", "Comfort"], unitCostCents: 70 }));
    const r = optimize({ slug: "heart", rules: DEFAULT_BOX_RULES.heart, settings, snacks: lib, objective: "margin", packagingOz: 6, today });
    expect(r.picks.filter((p) => /Applesauce/.test(p.snack.name)).length).toBeLessThanOrEqual(2);
    expect(r.picks.filter((p) => /Tea/.test(p.snack.name)).length).toBeLessThanOrEqual(2);
    expect(r.checks.find((c) => c.key === "kindmax")?.pass).toBe(true);
  });

  it("applies to every box, and GDM inherits the strictest cap", () => {
    for (const r of Object.values(DEFAULT_BOX_RULES)) expect(r.kindMax).toBe(2);
    const rules = inheritParentRules({ ...DEFAULT_BOX_RULES, blood_sugar: { ...DEFAULT_BOX_RULES.blood_sugar, kindMax: 1 } });
    expect(rules.gestational_diabetes.kindMax).toBe(1);
  });
});

describe("Blood Sugar reads protein/fiber-forward", () => {
  it("needs 8 of 14 protein- or fiber-forward picks", () => {
    expect(DEFAULT_BOX_RULES.blood_sugar.proteinOrFiberMin).toBe(8);
    const picks: Pick[] = Array.from({ length: 14 }, (_, i) => ({
      snack: snack({ brand: `B${i}`, name: `Item ${i}`, ...(i < 7 ? {} : { protein_g: 2, fiber_g: 1, roles: { WHOLE_FOOD: true } }) }),
      category: null,
    }));
    const pf = checkLineup("blood_sugar", DEFAULT_BOX_RULES.blood_sugar, picks, settings, 6).find((c) => c.key === "pf")!;
    expect(pf).toMatchObject({ pass: false, deficit: 1 });
  });
});

describe("ingredients are required for every box", () => {
  it("a product with no ingredient list fits no box", () => {
    const f = fitsBoxes(snack({ ingredients: null }));
    for (const b of Object.values(f)) {
      expect(b.fits).toBe(false);
      expect(b.reasons.join()).toMatch(/Ingredients not on file/);
    }
  });
});
