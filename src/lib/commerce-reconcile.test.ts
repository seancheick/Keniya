import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { reconcileCheckoutHolds } from "./commerce-reconcile";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
const hold = { request_key: "key", session_id: null, created_at: "2026-10-06T10:00:00Z", expires_at: "2026-10-06T12:00:00Z" };
function fixture(reservation = hold) {
 const update = vi.fn();
 const q = { eq: () => q, lte: () => q, or: () => q, order: () => q, range: async () => ({ data: [reservation], error: null }) };
 const write = { eq: () => write, then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve) };
 update.mockReturnValue(write);
 const db = { from: () => ({ select: () => q, update }) } as unknown as SupabaseClient;
 const list = vi.fn();
 const expire = vi.fn();
 const stripe = { checkout: { sessions: { list, expire } } } as unknown as Stripe;
 return { db, stripe, list, update, expire };
}
describe("unbound reservation reconciliation", () => {
 it("expires an invalidated lost-response session before freeing capacity", async () => {
  const f = fixture({ ...hold, expires_at: "2026-10-06T14:00:00Z", invalidation_pending: true } as typeof hold);
  f.list.mockResolvedValue({ data: [{ id: "cs_open", status: "open", payment_status: "unpaid", metadata: { reservation_key: "key", box_slug: "heart" } }], has_more: false });
  f.expire.mockResolvedValue({ id: "cs_open", status: "expired", payment_status: "unpaid", url: null });
  await reconcileCheckoutHolds(f.db, f.stripe, "heart", Date.parse("2026-10-06T12:01:00Z"));
  expect(f.expire).toHaveBeenCalledWith("cs_open");
  expect(f.update).toHaveBeenCalledWith({ session_id: "cs_open", session_url: null, released: true });
 });
 it("keeps an invalidated unbound in-flight hold when no session is visible yet", async () => {
  const f = fixture({ ...hold, expires_at: "2026-10-06T14:00:00Z", invalidation_pending: true } as typeof hold);
  f.list.mockResolvedValue({ data: [], has_more: false });
  await reconcileCheckoutHolds(f.db, f.stripe, "heart", Date.parse("2026-10-06T12:01:00Z"));
  expect(f.update).not.toHaveBeenCalled();
 });
 it("frees a definitively failed creation after complete session enumeration", async () => {
  const f = fixture(); f.list.mockResolvedValue({ data: [], has_more: false });
  await reconcileCheckoutHolds(f.db, f.stripe, "heart", Date.parse("2026-10-06T12:06:00Z"));
  expect(f.update).toHaveBeenCalledWith({ released: true });
 });
 it("paginates and rebinds a paid lost-response session without freeing capacity", async () => {
  const f = fixture();
  f.list.mockResolvedValueOnce({ data: [{ id: "unrelated" }], has_more: true }).mockResolvedValueOnce({ data: [{ id: "paid", payment_status: "paid", status: "complete", metadata: { reservation_key: "key", box_slug: "heart" }, url: null }], has_more: false });
  await reconcileCheckoutHolds(f.db, f.stripe, "heart", Date.parse("2026-10-06T12:06:00Z"));
  expect(f.list).toHaveBeenLastCalledWith(expect.objectContaining({ starting_after: "unrelated" }));
  expect(f.update).toHaveBeenCalledWith({ session_id: "paid", session_url: null });
 });
 it("retains the hold when Stripe enumeration fails", async () => {
  const f = fixture(); f.list.mockRejectedValue(new Error("Stripe offline"));
  await expect(reconcileCheckoutHolds(f.db, f.stripe, "heart", Date.parse("2026-10-06T12:06:00Z"))).rejects.toThrow("Stripe offline");
  expect(f.update).not.toHaveBeenCalled();
 });
 it("waits for the five-minute grace window", async () => {
  const f = fixture();
  await reconcileCheckoutHolds(f.db, f.stripe, "heart", Date.parse("2026-10-06T12:01:00Z"));
  expect(f.list).not.toHaveBeenCalled(); expect(f.update).not.toHaveBeenCalled();
 });
});
