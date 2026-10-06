import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase", () => ({ getSupabaseAdminStrict: vi.fn() }));
import { allRows, toSnack, identityCode, type ProductRow, type VersionRow } from "./db";
const product: ProductRow = {
  id: "p", created_at: "2026-01-01", updated_at: "2026-01-01", code: "P001", name: "Test", brand: null, upc: "123456789012", type: "Substantial", form: "Solid", categories: [], url: null, default_vendor_id: null, retail_cents: null, estimate_cost_cents: 100, quote_cost_cents: null, price_checked_on: null, status: "Approved", reject_reason: null, reviewed_by: "Clinician", reviewed_at: null, prescreened_by: null, prescreened_at: null, sensory: null, notes: null, created_by: null,
};
const version: VersionRow = {
  id: "v", created_at: "2026-01-01", product_id: "p", version: 1, is_current: true, effective_from: "2026-01-01", effective_to: null, calories: 100, protein_g: 5, fiber_g: 3, carbs_g: 10, added_sugar_g: 0, sodium_mg: 100, caffeine_mg: 0, sat_fat_g: 0, sugar_alcohols_g: 0, unit_wt_oz: 1, ingredients: null, allergens: null, free_from: {}, shelf_life: null, pregnancy_checks: {}, roles: {}, nutrition_source: null, verified_at: "2026-01-01", verified_by: "Reviewer", created_by: null,
};
describe("catalog stock and pagination", () => {
  it("reads all pages beyond the Data API row cap", async () => {
    const source = Array.from({ length: 1201 }, (_, id) => ({ id }));
    const page = vi.fn(async (from: number, to: number) => ({ data: source.slice(from, to + 1), error: null }));
    expect(await allRows(page, "test")).toEqual(source);
    expect(page).toHaveBeenCalledTimes(3);
  });
  it("fails on a later-page error rather than returning a partial catalog", async () => {
    let call = 0;
    await expect(allRows(async () => ++call === 1 ? { data: Array(500).fill(1), error: null } : { data: null, error: { message: "offline" } }, "test")).rejects.toThrow("test: offline");
  });
  it("counts and costs only packable current-formula units", () => {
    const fresh = { product_version_id: "v", qty_remaining: 2, unit_cost_cents: 150, expires_on: "2099-01-01" };
    const result = toSnack(product, version, [fresh, { ...fresh, qty_remaining: 100, product_version_id: "old" }, { ...fresh, qty_remaining: 100, expires_on: "2020-01-01" }, { ...fresh, qty_remaining: 100, expires_on: null }], null);
    expect(result.onHand).toBe(2);
    expect(result.unitCostCents).toBe(150);
    expect(result.earliestExpiry).toBe("2099-01-01");
  });
});

import { resolveSettings } from "./types";
describe("fail-closed catalog configuration", () => {
  it("rejects malformed settings instead of replacing them with defaults", () => {
    expect(() => resolveSettings({ prices: { heart: -1 } })).toThrow("Invalid live settings");
    expect(() => resolveSettings("broken")).toThrow("Invalid live settings");
  });
  it("requires both durable identity provenance and a named physical label check", () => {
    const approved = { ...product, upc: "036000291452", barcode_status: "verified" as const, reviewed_by: "Laurie Pham", reviewed_at: "2026-10-06" };
    expect(toSnack(approved, version, [], null).packageVerified).toBe(true);
    expect(toSnack({ ...approved, barcode_status: "provisional" }, version, [], null).packageVerified).toBe(false);
    expect(toSnack(approved, { ...version, verified_by: null }, [], null).packageVerified).toBe(false);
    expect(toSnack({ ...approved, reviewed_at: null }, version, [], null).clinicianApprovedBy).toBeNull();
  });
  it("does not use an invalid unit check digit as package identity", () => {
    expect(identityCode({ id: "p", upc: "123456789013" }, [])).toBeNull();
    expect(identityCode({ id: "p", upc: "036000291452", barcode_status: "provisional" }, [])).toBeNull();
    expect(identityCode({ id: "p", upc: "036000291452", barcode_status: "verified" }, [])).toBe("036000291452");
  });
});
