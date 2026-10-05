import { describe, expect, it } from "vitest";
import { settings, snack } from "./__fixtures__/snacks";
import { canBuild, optimize } from "./optimizer";
import { isReady } from "./rules";
import { DEFAULT_BOX_RULES, OBJECTIVES, type Snack } from "./types";

const today = new Date("2026-10-01T00:00:00Z");

/** A heart-eligible library with spare options in every category. */
function library(): Snack[] {
  const out: Snack[] = [];
  for (let i = 0; i < 8; i++) out.push(snack({ name: `Nuts ${i}`, roles: { NS: true }, categories: ["Savory"], unitCostCents: 60 + i * 10, sodium_mg: i < 4 ? 400 : 100 }));
  for (let i = 0; i < 5; i++) out.push(snack({ name: `Bar ${i}`, roles: { WG: true }, categories: ["Protein"], unitCostCents: 90 + i * 5 }));
  for (let i = 0; i < 6; i++) out.push(snack({ name: `Fruit ${i}`, roles: { MF: true }, fiber_g: 4, categories: ["Sweet"], unitCostCents: 70 + i * 5 }));
  for (let i = 0; i < 4; i++) out.push(snack({ name: `Treat ${i}`, roles: { CT: true }, fiber_g: 1, categories: ["Sweet", "Comfort"], unitCostCents: 40 }));
  for (let i = 0; i < 3; i++)
    out.push(snack({ name: `Tea ${i}`, type: "Beverage", form: "Tea", calories: 0, protein_g: 0, fiber_g: 0, carbs_g: 0, added_sugar_g: 0, sodium_mg: 0, unit_wt_oz: 0.1, categories: ["Hydration"], unitCostCents: 30 + i }));
  out.push(snack({ name: "Candy", categories: ["Sweet"], protein_g: 0, fiber_g: 0, added_sugar_g: 12, unitCostCents: 5 })); // never fits heart
  out.push(snack({ name: "Out of stock nuts", roles: { NS: true }, categories: ["Savory"], unitCostCents: 1, onHand: 0 }));
  return out;
}

describe("optimizer", () => {
  for (const objective of OBJECTIVES) {
    it(`${objective}: returns a READY heart lineup`, () => {
      const r = optimize({ slug: "heart", rules: DEFAULT_BOX_RULES.heart, settings, snacks: library(), objective, packagingOz: 6, today });
      expect(r.picks).toHaveLength(14);
      expect(r.deficit).toBe(0);
      expect(isReady(r.checks)).toBe(true);
      expect(new Set(r.picks.map((p) => p.snack.id)).size).toBe(14);
      expect(r.picks.some((p) => p.snack.name === "Candy" || p.snack.onHand === 0)).toBe(false);
    });
  }

  it("respects the high-sodium cap and treat cap even when they are cheapest", () => {
    const r = optimize({ slug: "heart", rules: DEFAULT_BOX_RULES.heart, settings, snacks: library(), objective: "margin", packagingOz: 6, today });
    expect(r.picks.filter((p) => (p.snack.sodium_mg ?? 0) > 300).length).toBeLessThanOrEqual(2);
    expect(r.picks.filter((p) => p.snack.roles.CT).length).toBeLessThanOrEqual(2);
  });

  it("use-expiring picks the lot that is about to expire", () => {
    const lib = library();
    const pricey = snack({ name: "Expiring fruit", roles: { MF: true }, fiber_g: 4, categories: ["Sweet"], unitCostCents: 300, earliestExpiry: "2026-10-20" });
    const margin = optimize({ slug: "heart", rules: DEFAULT_BOX_RULES.heart, settings, snacks: [...lib, pricey], objective: "margin", packagingOz: 6, today });
    const expiring = optimize({ slug: "heart", rules: DEFAULT_BOX_RULES.heart, settings, snacks: [...lib, pricey], objective: "expiring", packagingOz: 6, today });
    expect(margin.picks.some((p) => p.snack.id === pricey.id)).toBe(false);
    expect(expiring.picks.some((p) => p.snack.id === pricey.id)).toBe(true);
  });

  it("excludes avoid / never-send products", () => {
    const lib = library();
    const first = optimize({ slug: "heart", rules: DEFAULT_BOX_RULES.heart, settings, snacks: lib, objective: "margin", packagingOz: 6, today });
    const banned = first.picks[0].snack.id;
    const r = optimize({ slug: "heart", rules: DEFAULT_BOX_RULES.heart, settings, snacks: lib, objective: "margin", packagingOz: 6, today, excludeIds: [banned] });
    expect(r.picks.some((p) => p.snack.id === banned)).toBe(false);
    expect(r.deficit).toBe(0);
  });

  it("can-build names the limiting item", () => {
    const a = snack({ onHand: 40 });
    const b = snack({ onHand: 25, name: "Whisps" });
    expect(canBuild([{ snack: a, category: null }, { snack: b, category: null }])).toMatchObject({ n: 25, limiting: b });
  });
});
