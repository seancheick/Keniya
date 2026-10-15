import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ sale: vi.fn(), create: vi.fn(), price: vi.fn(), reserve: vi.fn(), update: vi.fn(), expired: vi.fn(), retrieve: vi.fn(), expire: vi.fn(), prior: vi.fn(), couponGet: vi.fn(), couponCreate: vi.fn(), settings: { offers: { welcome: { enabled: true, code: "WELCOME20", percentOff: 20, limit: 100 }, subscription: { enabled: true, priceCents: 3900 } } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/commerce", () => ({ loadCommerceState: async () => ({ sales: await m.sale(), settings: m.settings }) }));
vi.mock("@/lib/stripe", () => ({ isCheckoutConfigured: () => true, priceIdForBox: () => "price_1", getStripe: () => ({ prices: { retrieve: m.price }, coupons: { retrieve: m.couponGet, create: m.couponCreate }, checkout: { sessions: { create: m.create, retrieve: m.retrieve, expire: m.expire } } }) }));
vi.mock("@/lib/supabase", () => ({ getSupabaseAdminStrict: () => ({ rpc: m.reserve, from: (table: string) => {
 if (table === "preorders") return { select: () => ({ ilike: () => ({ limit: m.prior }) }) };
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
 m.prior.mockResolvedValue({ data: [], error: null });
 m.couponGet.mockRejectedValue(Object.assign(new Error("No such coupon"), { code: "resource_missing" }));
 m.couponCreate.mockResolvedValue({ id: "keniya-welcome20-20pct-100" });
 m.settings.offers.welcome.enabled = true;
 m.settings.offers.subscription.enabled = true;
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
describe("first-order offer (WELCOME20)", () => {
 const welcome = { ...input, welcomeEmail: " New@Example.com " };
 it("applies the coupon and locks checkout to the buyer's email", async () => {
  expect((await startCheckout(welcome)).ok).toBe(true);
  expect(m.couponCreate).toHaveBeenCalledWith(expect.objectContaining({ id: "keniya-welcome20-20pct-100", percent_off: 20, duration: "once", max_redemptions: 100 }), expect.anything());
  const params = m.create.mock.calls[0][0];
  expect(params).toMatchObject({ discounts: [{ coupon: "keniya-welcome20-20pct-100" }], customer_email: "new@example.com", metadata: expect.objectContaining({ offer: "WELCOME20" }) });
  // Never both: a typed code can't stack on the welcome coupon.
  expect(params.allow_promotion_codes).toBeUndefined();
 });
 it("refuses an email that already has an order, before any coupon or session", async () => {
  m.prior.mockResolvedValue({ data: [{ id: "earlier" }], error: null });
  const res = await startCheckout(welcome);
  expect(res).toMatchObject({ ok: false, code: "offer_used" });
  // Never says why (an earlier order), so checkout can't be used to look someone up.
  expect(res.ok === false && res.message).not.toMatch(/already|order before|has a Keniya order/i);
  expect(m.couponCreate).not.toHaveBeenCalled();
  expect(m.create).not.toHaveBeenCalled();
 });
 it("refuses when the offer is switched off or its coupon is used up", async () => {
  m.settings.offers.welcome.enabled = false;
  expect(await startCheckout(welcome)).toMatchObject({ ok: false, code: "offer_ended" });
  m.settings.offers.welcome.enabled = true;
  m.couponGet.mockResolvedValue({ valid: false });
  expect(await startCheckout(welcome)).toMatchObject({ ok: false, code: "offer_ended" });
  expect(m.create).not.toHaveBeenCalled();
 });
 it("keeps typed promotion codes for ordinary checkouts", async () => {
  expect((await startCheckout(input)).ok).toBe(true);
  const params = m.create.mock.calls[0][0];
  expect(params.allow_promotion_codes).toBe(true);
  expect(params.discounts).toBeUndefined();
  expect(m.prior).not.toHaveBeenCalled();
 });
});
describe("Monthly Snack Club checkout", () => {
 const monthly = { ...input, plan: "monthly" as const };
 it("opens a subscription checkout at the club price with the box on the subscription", async () => {
  expect((await startCheckout(monthly)).ok).toBe(true);
  const params = m.create.mock.calls[0][0];
  expect(params.mode).toBe("subscription");
  expect(params.line_items[0].price_data).toMatchObject({ unit_amount: 3900, recurring: { interval: "month" } });
  expect(params.subscription_data.metadata).toEqual({ box_slug: "heart", plan: "monthly" });
  expect(params.custom_text.submit.message).toMatch(/every month .* until you cancel/);
  // No codes on the club, and it ignores the one-time Stripe price.
  expect(params.allow_promotion_codes).toBeUndefined();
  expect(params.discounts).toBeUndefined();
  expect(m.price).not.toHaveBeenCalled();
 });
 it("still takes a first-shipment capacity hold like any order", async () => {
  await startCheckout(monthly);
  expect(m.reserve).toHaveBeenCalledWith("reserve_checkout", expect.objectContaining({ p_slug: "heart" }));
 });
 it("refuses while the club is switched off", async () => {
  m.settings.offers.subscription.enabled = false;
  expect(await startCheckout(monthly)).toMatchObject({ ok: false, code: "no_subscription" });
  expect(m.create).not.toHaveBeenCalled();
 });
 it("never makes a gift or a welcome-offer order recurring", async () => {
  expect(await startCheckout({ ...monthly, gift: true })).toMatchObject({ ok: false, code: "gift_subscription" });
  expect(await startCheckout({ ...monthly, welcomeEmail: "new@example.com" })).toMatchObject({ ok: false, code: "offer_subscription" });
  expect(m.create).not.toHaveBeenCalled();
 });
 it("keeps one-time as the default plan", async () => {
  await startCheckout(input);
  expect(m.create.mock.calls[0][0].mode).toBe("payment");
 });
});
