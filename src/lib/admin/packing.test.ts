import { describe, expect, it } from "vitest";
import { packingProblems, recipePicks, shipmentNeeds } from "./packing";
import { snack, settings } from "./__fixtures__/snacks";
import { resolveBoxRules, type BoxRules } from "./types";
const rules: BoxRules = { ...resolveBoxRules("blood_sugar", undefined), total: 2, categories: [{ name: "Protein", min: 1, max: 1 }, { name: "Sweet", min: 1, max: 1 }], substantialMin: null, proteinOrFiberMin: null, wholeFoodMin: null };
const a = snack({ id: "a", categories: ["Sweet", "Protein"] });
const b = snack({ id: "b", categories: ["Sweet"] });
const product = (s: typeof a): { snack: typeof a; upc: string; verifiedAt: string; ingredients: string | null } => ({ snack: s, upc: "123456789012", verifiedAt: "2026-10-01", ingredients: null });
const input = { slug: "blood_sugar" as const, ids: ["a", "b"], products: new Map([["a", product(a)], ["b", product(b)]]), rules, settings, packagingOz: 1, extraCount: 0, avoid: null };
describe("packing gates", () => {
  it("assigns overlapping categories and detects impossible mixes", () => {
    expect(recipePicks([a, b], rules)?.map((p) => p.category)).toEqual(["Protein", "Sweet"]);
    expect(recipePicks([b, { ...b, id: "c" }], rules)).toBeNull();
    expect(packingProblems(input)).toEqual([]);
  });
  it("rejects unknown items, wrong counts and duplicate snacks", () => {
    expect(packingProblems({ ...input, ids: ["a", "missing"] }).join()).toMatch(/Unknown product/);
    expect(packingProblems({ ...input, ids: ["a"] }).join()).toMatch(/Need 2 distinct/);
    expect(packingProblems({ ...input, ids: ["a", "a"] }).join()).toMatch(/duplicate/);
  });
  it("rechecks customer avoids after a manual swap, including ingredients and extras", () => {
    const products = new Map(input.products); products.set("a", { ...product(a), ingredients: "peanut flour" });
    expect(packingProblems({ ...input, products, avoid: "peanuts" }).join()).toMatch(/customer asked to avoid/);
    const extra = snack({ id: "e", name: "Peanut extra" }); products.set("e", product(extra));
    expect(packingProblems({ ...input, products, ids: ["a", "b", "e"], extraCount: 1, avoid: "peanuts" }).join()).toMatch(/Peanut extra/);
  });
  it("checks eligibility and total weight including extras (no per-product approval)", () => {
    const products = new Map(input.products); products.set("a", product({ ...a, clinicianApprovedBy: null, status: "Candidate" }));
    expect(packingProblems({ ...input, products })).toEqual([]);
    products.set("a", product({ ...a, sodium_mg: null }));
    expect(packingProblems({ ...input, products }).join()).toMatch(/not eligible/);
    const extra = snack({ id: "e", unit_wt_oz: 7 }); products.set("a", product(a)); products.set("e", product(extra));
    const limited = { ...settings, policy: { ...settings.policy, maxBoxOz: 5 } };
    expect(packingProblems({ ...input, products, ids: ["a", "b", "e"], extraCount: 1, settings: limited }).join()).toMatch(/weight/i);
  });
});

describe("shipment needs are enforced at every manual substitution and at packing", () => {
  it("combined needs: a 20 g-carb substitute the primary box accepts is refused by Blood Sugar", () => {
    // Heart has no carb limit, so only the also-meet Blood Sugar screen can reject it.
    const heart: BoxRules = { ...resolveBoxRules("heart", undefined), total: 2, categories: rules.categories, nutSeedMin: null, fiberMin: null };
    const nut = (id: string, cats: string[], carbs_g: number) => snack({ id, categories: cats, roles: { NS: true }, carbs_g, sat_fat_g: 1, sodium_mg: 100, added_sugar_g: 2 });
    const products = new Map([["p", product(nut("p", ["Protein"], 8))], ["h", product(nut("h", ["Sweet"], 20))]]);
    const base = { ...input, slug: "heart" as const, rules: heart, products, ids: ["p", "h"] };
    expect(packingProblems(base)).toEqual([]);
    const alsoMeet = [{ slug: "blood_sugar" as const, rules: resolveBoxRules("blood_sugar", undefined) }];
    expect(packingProblems({ ...base, alsoMeet }).join()).toMatch(/fails Blood Sugar screening.*20 g carbs/);
  });
  it("allergens named in an older free-text avoid answer still count", () => {
    const ship = { avoid_allergens: [], also_meet: [], substitution_review: null, substitution_confirmed_by: null };
    expect(shipmentNeeds(ship, "blood_sugar", { blood_sugar: rules } as never, ["no sesame please", null]).avoidAllergens).toEqual(["sesame"]);
  });
  it("structured allergen exclusions: cross-contact conflicts, unverifiable labels block", () => {
    const products = new Map(input.products);
    products.set("a", product({ ...a, allergens: "Contains almonds. Made in a facility with sesame." }));
    products.set("b", product({ ...b, allergens: null }));
    const out = packingProblems({ ...input, products, avoidAllergens: ["sesame"] }).join(" | ");
    expect(out).toMatch(/cross-contact warning for sesame/);
    expect(out).toMatch(/can't be verified/);
  });
  it("proposed substitutions block packing until confirmed", () => {
    expect(packingProblems({ ...input, unconfirmedSubstitutions: true })).toContain("Confirm the proposed substitutions before packing");
  });
});
