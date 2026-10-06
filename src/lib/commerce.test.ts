import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin/summary", () => ({ loadAdminContext: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabaseAdminStrict: vi.fn() }));
import { saleEligible } from "./commerce";
import type { BoxSummary } from "./admin/summary";
const snack = { status: "Approved", clinicianApprovedBy: "Laurie Pham", clinicalDecision: "approved", approvalRole: "clinician", diligenceComplete: true };
const box = { lineup: { id: "lineup" }, ready: true, picks: [{ snack }], extras: [] } as unknown as BoxSummary;
describe("sale gate", () => {
 it("requires active rules-ready lineup", () => {
  expect(saleEligible(box)).toBe(true);
  expect(saleEligible({ ...box, lineup: null })).toBe(false);
  expect(saleEligible({ ...box, ready: false })).toBe(false);
  expect(saleEligible({ ...box, picks: [] })).toBe(false);
 });
 it("blocks provisional picks and extras", () => {
  expect(saleEligible({ ...box, picks: [{ snack: { ...snack, status: "Pre-approved" } }] } as unknown as BoxSummary)).toBe(false);
  expect(saleEligible({ ...box, extras: [{ ...snack, clinicianApprovedBy: null }] } as unknown as BoxSummary)).toBe(false);
 });
});
