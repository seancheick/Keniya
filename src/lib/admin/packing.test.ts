import { describe, expect, it } from "vitest";
import { packingProblems, recipePicks } from "./packing";
import { snack, settings } from "./__fixtures__/snacks";
import { resolveBoxRules, type BoxRules } from "./types";
const rules: BoxRules = { ...resolveBoxRules("blood_sugar", null), total: 2, categories: [{ name: "Protein", min: 1, max: 1 }, { name: "Sweet", min: 1, max: 1 }], substantialMin: null, proteinOrFiberMin: null, wholeFoodMin: null };
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
  it("checks approval and total weight including extras", () => {
    const products = new Map(input.products); products.set("a", product({ ...a, clinicianApprovedBy: null }));
    expect(packingProblems({ ...input, products }).join()).toMatch(/re-attestation/);
    const extra = snack({ id: "e", unit_wt_oz: 7 }); products.set("a", product(a)); products.set("e", product(extra));
    const limited = { ...settings, policy: { ...settings.policy, maxBoxOz: 5 } };
    expect(packingProblems({ ...input, products, ids: ["a", "b", "e"], extraCount: 1, settings: limited }).join()).toMatch(/weight/i);
  });
});
