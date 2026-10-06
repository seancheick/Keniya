import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ event: {} as unknown, rpc: vi.fn(), send: vi.fn(), update: vi.fn(), from: vi.fn(), charges: vi.fn(), disputes: vi.fn(), retrieve: vi.fn(), state: vi.fn(), reminder: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { STRIPE_WEBHOOK_SECRET: "whsec_test" } }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ webhooks: { constructEvent: () => mock.event }, charges: { retrieve: mock.charges }, disputes: { list: mock.disputes }, checkout: { sessions: { retrieve: mock.retrieve } } }) }));
vi.mock("@/lib/supabase", () => ({ getSupabaseAdminStrict: () => ({ rpc: mock.rpc, from: mock.from }) }));
vi.mock("@/lib/commerce", () => ({ loadCommerceState: mock.state }));
vi.mock("@/lib/public-rules", () => ({ loadPublicRules: async () => ({}), publicBoxes: () => [{ slug: "heart" }] }));
vi.mock("@/lib/resend", () => ({ sendOrderEmails: mock.send, sendCartReminder: mock.reminder }));
vi.mock("@/lib/stripe-fee", () => ({ stripeFeeForSession: async () => null }));
import { POST } from "./route";
const request = () => new Request("https://example.com", { method: "POST", body: "event" });
beforeEach(() => {
 vi.clearAllMocks();
 mock.state.mockResolvedValue({ rules: {}, sales: { heart: { founding: 42, priceCents: 4700, remaining: 41, available: true, clinicianApproved: true } } });
 mock.event = { id: "evt_1", type: "checkout.session.completed", data: { object: { id: "cs_1", payment_status: "paid", payment_intent: "pi_1", metadata: { box_slug: "heart" }, customer_details: { email: "buyer@example.com" }, custom_fields: [], amount_total: 4700 } } };
 mock.rpc.mockImplementation(async (name: string) => ({ data: name === "begin_financial_observation" ? 1 : true, error: null }));
 mock.from.mockReturnValue({ select: () => ({ eq: () => ({ eq: async () => ({ count: 1 }), limit: async () => ({ data: [{ id: "order" }], error: null }) }) }), update: mock.update });
});
describe("durable webhook", () => {
 it("records a paid session with missing box/email as an admission hold", async () => {
  mock.event = { id: "evt_orphan", type: "checkout.session.completed", data: { object: { id: "cs_orphan", payment_status: "paid", metadata: {}, custom_fields: [] } } };
  mock.rpc.mockResolvedValue({ data: false, error: null });
  expect((await POST(request())).status).toBe(200);
  expect(mock.rpc).toHaveBeenCalledWith("save_paid_order", expect.objectContaining({ p_order: expect.objectContaining({ stripe_session_id: "cs_orphan", email: null, box_slug: null }) }));
  expect(mock.send).not.toHaveBeenCalled();
 });
 it("persists quarantined payment without sending a reserved-order confirmation", async () => {
  mock.rpc.mockResolvedValue({ data: false, error: null });
  expect((await POST(request())).status).toBe(200);
  expect(mock.send).not.toHaveBeenCalled();
  expect(mock.state).not.toHaveBeenCalled();
 });
 it.each([true, false])("reminds only with current sale available=%s and never uses recovery URL", async (available) => {
  mock.event = { type: "checkout.session.expired", data: { object: { id: "cs_expired", metadata: { box_slug: "heart" }, customer_email: "buyer@example.com", after_expiration: { recovery: { url: "https://checkout.stripe.com/stale-recovery" } } } } };
  mock.retrieve.mockResolvedValue({ status: "expired", payment_status: "unpaid" });
  mock.state.mockResolvedValue({ rules: {}, sales: { heart: { available, founding: 42 } } });
  const q = { eq: () => q, then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve) };
  mock.update.mockReturnValue(q);
  mock.from.mockImplementation(() => ({ update: mock.update, select: () => ({ eq: () => ({ limit: async () => ({ data: [] }) }) }) }));
  expect((await POST(request())).status).toBe(200);
  if (available) expect(mock.reminder).toHaveBeenCalledWith("buyer@example.com", expect.objectContaining({ founding: 42 }), "cs_expired");
  else expect(mock.reminder).not.toHaveBeenCalled();
 });
 it("persists paid orders before catalog reads and retries email on failure", async () => {
  mock.state.mockRejectedValue(new Error("Catalog offline"));
  expect((await POST(request())).status).toBe(500);
  expect(mock.rpc).toHaveBeenCalledWith("save_paid_order", expect.anything());
  expect(mock.send).not.toHaveBeenCalled();
 });
 it("returns 500 and sends no email if order write fails", async () => {
  mock.rpc.mockResolvedValue({ error: { message: "offline" } });
  expect((await POST(request())).status).toBe(500);
  expect(mock.send).not.toHaveBeenCalled();
 });
 it("stores PaymentIntent before emailing", async () => {
  mock.rpc.mockResolvedValue({ data: true, error: null });
  expect((await POST(request())).status).toBe(200);
  expect(mock.rpc).toHaveBeenCalledWith("save_paid_order", expect.objectContaining({ p_order: expect.objectContaining({ stripe_payment_intent_id: "pi_1" }) }));
  expect(mock.send).toHaveBeenCalledOnce();
 });
 it.each([[4700, true, "refunded"], [500, false, "partially_refunded"]])("synchronizes refund amount %i", async (amount, refunded, status) => {
  mock.event = { type: "charge.refunded", data: { object: { object: "charge", id: "ch_1" } } };
  mock.charges.mockResolvedValue({ payment_intent: "pi_1", amount_refunded: amount, refunded });
  mock.disputes.mockResolvedValue({ data: [] });
  mock.update.mockReturnValue({ eq: () => ({ select: async () => ({ data: [{ id: "order" }], error: null }) }) });
  expect((await POST(request())).status).toBe(200);
  expect(mock.rpc).toHaveBeenCalledWith("finish_financial_observation", expect.objectContaining({ p_status: status, p_refunded: amount, p_revision: 1 }));
 });
 it("does not release an expired-clock hold when Stripe now reports paid", async () => {
  mock.event = { type: "checkout.session.expired", data: { object: { id: "cs_paid", metadata: { box_slug: "heart" } } } };
  mock.retrieve.mockResolvedValue({ status: "complete", payment_status: "paid" });
  expect((await POST(request())).status).toBe(200);
  expect(mock.update).not.toHaveBeenCalled();
 });
 it("releases an expired unpaid hold by matching reservation metadata", async () => {
  mock.event = { type: "checkout.session.expired", data: { object: { id: "cs_old", metadata: { box_slug: "heart", reservation_key: "key" } } } };
  mock.retrieve.mockResolvedValue({ status: "expired", payment_status: "unpaid" });
  const q = { eq: () => q, or: () => q, then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve) };
  mock.update.mockReturnValue(q);
  expect((await POST(request())).status).toBe(200);
  expect(mock.update).toHaveBeenCalledWith({ released: true });
 });
 it("retries financial events arriving before their order", async () => {
  mock.event = { type: "charge.dispute.created", data: { object: { object: "dispute", id: "dp_1", charge: "ch_1" } } };
  mock.charges.mockResolvedValue({ payment_intent: "pi_1", amount_refunded: 0, refunded: false });
  mock.disputes.mockResolvedValue({ data: [{ status: "needs_response" }] });
  mock.rpc.mockResolvedValue({ data: null, error: { message: "Order not persisted yet" } });
  expect((await POST(request())).status).toBe(500);
  expect(mock.rpc).toHaveBeenCalledWith("begin_financial_observation", { p_payment_intent: "pi_1" });
 });
});
