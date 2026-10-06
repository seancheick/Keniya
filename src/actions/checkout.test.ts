import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ sale: vi.fn(), create: vi.fn(), price: vi.fn(), reserve: vi.fn(), update: vi.fn(), expired: vi.fn(), retrieve: vi.fn(), expire: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/commerce", () => ({ loadSaleSnapshot: m.sale }));
vi.mock("@/lib/stripe", () => ({ isCheckoutConfigured: () => true, priceIdForBox: () => "price_1", getStripe: () => ({ prices: { retrieve: m.price }, checkout: { sessions: { create: m.create, retrieve: m.retrieve, expire: m.expire } } }) }));
vi.mock("@/lib/supabase", () => ({ getSupabaseAdminStrict: () => ({ rpc: m.reserve, from: () => {
 const q = { eq: () => q, lte: () => q, or: () => q, not: () => q, order: () => q, range: m.expired, limit: m.expired };
 return { update: m.update, select: () => q };
} }) }));
import { startCheckout } from "./checkout";
const input = { boxSlug: "heart", requestKey: "a80954e5-4826-4f26-8216-5357f8d79ff2" };
beforeEach(() => {
 vi.clearAllMocks();
 m.expired.mockResolvedValue({ data: [], error: null });
 m.sale.mockResolvedValue({ heart: { available: true, clinicianApproved: true, founding: 50, priceCents: 4700 } });
 m.price.mockResolvedValue({ active: true, type: "one_time", currency: "usd", unit_amount: 4700 });
 m.reserve.mockImplementation(async (name: string) => ["allow_public_attempt", "bind_checkout_session"].includes(name) ? { data: true, error: null } : { data: { expires_at: "2026-10-06T20:00:00Z" }, error: null });
 m.create.mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.com/example" });
 const write = { eq: () => write, then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve) };
 m.update.mockReturnValue(write);
});
describe("checkout safeguards", () => {
 it("expires a session created during an admission invalidation", async () => {
  m.reserve.mockImplementation(async (name: string) => ({ data: name === "allow_public_attempt" ? true : name === "bind_checkout_session" ? false : { expires_at: "2026-10-06T20:00:00Z" }, error: null }));
  m.create.mockResolvedValue({ id: "cs_race", url: "https://checkout.stripe.com/race", status: "open" });
  expect((await startCheckout(input)).ok).toBe(false);
  expect(m.expire).toHaveBeenCalledWith("cs_race");
 });
 it("rate limits before reconciliation or pricing reads", async () => {
  m.reserve.mockResolvedValue({ data: false });
  expect(await startCheckout(input)).toMatchObject({ ok: false, code: "rate_limit" });
  expect(m.expired).not.toHaveBeenCalled();
  expect(m.sale).not.toHaveBeenCalled();
 });
 it("does not return a stale expired checkout URL", async () => {
  m.reserve.mockImplementation(async (name: string) => ["allow_public_attempt", "bind_checkout_session"].includes(name) ? { data: true } : { data: { session_id: "cs_expired" } });
  m.retrieve.mockResolvedValue({ status: "expired", payment_status: "unpaid" });
  expect(await startCheckout(input)).toMatchObject({ ok: false, code: "expired_session" });
  expect(m.create).not.toHaveBeenCalled();
 });
 it("rejects unavailable sale before creating session", async () => {
  m.sale.mockResolvedValue({ heart: { available: false, clinicianApproved: false } });
  expect((await startCheckout(input)).ok).toBe(false);
  expect(m.create).not.toHaveBeenCalled();
 });
 it("rejects a Stripe price that differs from settings", async () => {
  m.price.mockResolvedValue({ active: true, type: "one_time", currency: "usd", unit_amount: 4900 });
  expect((await startCheckout(input)).ok).toBe(false);
  expect(m.reserve).not.toHaveBeenCalledWith("reserve_checkout", expect.anything());
 });
 it("shares stable reservation and Stripe idempotency key", async () => {
  expect((await startCheckout(input)).ok).toBe(true);
  expect(m.reserve).toHaveBeenCalledWith("reserve_checkout", expect.objectContaining({ p_key: input.requestKey }));
  expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ payment_method_types: ["card"] }), { idempotencyKey: `checkout:${input.requestKey}` });
 });
 it("returns persisted URL on retry without a new session", async () => {
  m.reserve.mockImplementation(async (name: string) => ["allow_public_attempt", "bind_checkout_session"].includes(name) ? { data: true } : { data: { session_id: "cs_original", session_url: "https://checkout.stripe.com/original" }, error: null });
  m.retrieve.mockResolvedValue({ status: "open", url: "https://checkout.stripe.com/original" });
  expect(await startCheckout(input)).toEqual({ ok: true, url: "https://checkout.stripe.com/original" });
  expect(m.create).not.toHaveBeenCalled();
 });
 it("recovers its own last-slot hold even when public capacity is sold out", async () => {
  m.sale.mockResolvedValue({ heart: { available: false, clinicianApproved: true, founding: 1, remaining: 0, priceCents: 4700 } });
  m.reserve.mockImplementation(async (name: string) => ["allow_public_attempt", "bind_checkout_session"].includes(name) ? { data: true } : { data: { session_id: "cs_original", session_url: "https://checkout.stripe.com/original" }, error: null });
  m.retrieve.mockResolvedValue({ status: "open", url: "https://checkout.stripe.com/original" });
  expect(await startCheckout(input)).toEqual({ ok: true, url: "https://checkout.stripe.com/original" });
 });
 it("releases an expired hold only after Stripe confirms it is unpaid", async () => {
  m.expired.mockResolvedValue({ data: [{ request_key: "hold", session_id: "cs_old" }], error: null });
  m.retrieve.mockResolvedValue({ status: "expired", payment_status: "unpaid" });
  const q = { eq: () => q, then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve) };
  m.update.mockReturnValue(q);
  expect((await startCheckout(input)).ok).toBe(true);
  expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ released: true }));
 });
 it("preserves an expired-clock hold whose payment webhook is late", async () => {
  m.expired.mockResolvedValue({ data: [{ request_key: "hold", session_id: "cs_paid" }], error: null });
  m.retrieve.mockResolvedValue({ status: "complete", payment_status: "paid" });
  expect((await startCheckout(input)).ok).toBe(true);
  expect(m.update).not.toHaveBeenCalledWith({ released: true });
 });
 it("fails closed when capacity persistence fails", async () => {
  m.reserve.mockResolvedValue({ error: { message: "sold out" }, data: null });
  expect((await startCheckout(input)).ok).toBe(false);
  expect(m.create).not.toHaveBeenCalled();
 });
});
