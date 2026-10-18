import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin/summary", () => ({ loadAdminContext: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabaseAdminStrict: vi.fn() }));
import { saleEligible } from "./commerce";
import type { BoxSummary } from "./admin/summary";
const snack = { status: "Candidate", packageVerified: true };
const box = { lineup: { id: "lineup" }, ready: true, picks: [{ snack }], extras: [] } as unknown as BoxSummary;
describe("sale gate", () => {
 it("requires active rules-ready lineup", () => {
  expect(saleEligible(box)).toBe(true);
  expect(saleEligible({ ...box, lineup: null })).toBe(false);
  expect(saleEligible({ ...box, ready: false })).toBe(false);
  expect(saleEligible({ ...box, picks: [] })).toBe(false);
 });
 it("blocks unverified or retired picks and extras", () => {
  expect(saleEligible({ ...box, picks: [{ snack: { ...snack, packageVerified: false } }] } as unknown as BoxSummary)).toBe(false);
  expect(saleEligible({ ...box, picks: [{ snack: { ...snack, status: "Retired" } }] } as unknown as BoxSummary)).toBe(false);
  expect(saleEligible({ ...box, extras: [{ ...snack, packageVerified: false }] } as unknown as BoxSummary)).toBe(false);
 });
});
