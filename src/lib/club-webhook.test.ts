import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ state: vi.fn(), mail: vi.fn() }));
vi.mock("@/lib/commerce", () => ({ loadCommerceState: m.state }));
vi.mock("@/lib/resend", () => ({ sendClubEmail: m.mail }));
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { handleClubEvent } from "./club-webhook";

const sub = (over: Partial<Stripe.Subscription> = {}) => ({
  id: "sub_1", customer: "cus_1", status: "active", pause_collection: null, cancel_at_period_end: false, metadata: { box_slug: "heart" },
  items: { data: [{ current_period_end: 1_800_000_000, price: { unit_amount: 3900 } }] }, latest_invoice: "in_0", ...over,
}) as unknown as Stripe.Subscription;
const invoice = (over: Record<string, unknown> = {}) => ({
  id: "in_1", billing_reason: "subscription_cycle", status: "draft", customer_email: "club@example.com", customer_name: "Ada", amount_paid: 3900, amount_due: 3900, currency: "usd",
  parent: { subscription_details: { subscription: "sub_1" } }, ...over,
});

function fakes(opts: { sub?: Stripe.Subscription; invoiceStatuses?: string[] } = {}) {
  const statuses = [...(opts.invoiceStatuses ?? ["draft", "open"])];
  const stripe = {
    subscriptions: { retrieve: vi.fn(async () => opts.sub ?? sub()) },
    invoices: {
      retrieve: vi.fn(async (_id: string, params?: { expand?: string[] }) =>
        params?.expand ? { payments: { data: [{ status: "paid", payment: { payment_intent: "pi_r1" } }] } } : { status: statuses.shift() ?? "open" }),
      update: vi.fn(async () => ({})),
      finalizeInvoice: vi.fn(async () => ({})),
      voidInvoice: vi.fn(async () => ({})),
    },
  };
  const update = vi.fn(() => ({ eq: async () => ({ error: null }) }));
  const db = {
    rpc: vi.fn(async () => ({ data: true, error: null })),
    from: vi.fn(() => ({
      update,
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { email: "club@example.com", shipping: { name: "Ada" }, box_slug: "heart" }, error: null }) }) }),
    })),
  };
  return { stripe: stripe as unknown as Stripe, raw: stripe, db: db as unknown as SupabaseClient, rawDb: db, update };
}
const ev = (type: string, object: unknown) => ({ id: "evt_1", type, data: { object } }) as unknown as Stripe.Event;

beforeEach(() => {
  vi.clearAllMocks();
  m.state.mockResolvedValue({ sales: { heart: { saleReady: true } } });
  m.mail.mockResolvedValue({ ok: true });
});

describe("Snack Club renewals", () => {
  it("lets a fillable renewal invoice proceed untouched", async () => {
    const f = fakes();
    expect(await handleClubEvent(ev("invoice.created", invoice()), f.stripe, f.db)).toBe(true);
    expect(f.raw.invoices.finalizeInvoice).not.toHaveBeenCalled();
    expect(m.mail).not.toHaveBeenCalled();
  });
  it("holds a renewal it can't fill: finalized without collection, voided, subscriber told", async () => {
    m.state.mockResolvedValue({ sales: { heart: { saleReady: false } } });
    const f = fakes();
    await handleClubEvent(ev("invoice.created", invoice()), f.stripe, f.db);
    expect(f.raw.invoices.update).toHaveBeenCalledWith("in_1", { auto_advance: false });
    expect(f.raw.invoices.finalizeInvoice).toHaveBeenCalledWith("in_1", { auto_advance: false });
    expect(f.raw.invoices.voidInvoice).toHaveBeenCalledWith("in_1");
    expect(m.mail).toHaveBeenCalledWith("club@example.com", "in_1", expect.objectContaining({ kind: "held" }));
  });
  it("is retry-safe once the held invoice is already void", async () => {
    m.state.mockResolvedValue({ sales: { heart: { saleReady: false } } });
    const f = fakes({ invoiceStatuses: ["void"] });
    await handleClubEvent(ev("invoice.created", invoice()), f.stripe, f.db);
    expect(f.raw.invoices.finalizeInvoice).not.toHaveBeenCalled();
    expect(f.raw.invoices.voidInvoice).not.toHaveBeenCalled();
  });
  it("leaves a skipped or paused month to Stripe's pause", async () => {
    m.state.mockResolvedValue({ sales: { heart: { saleReady: false } } });
    const f = fakes({ sub: sub({ pause_collection: { behavior: "void", resumes_at: null } as Stripe.Subscription.PauseCollection }) });
    await handleClubEvent(ev("invoice.created", invoice()), f.stripe, f.db);
    expect(f.raw.invoices.finalizeInvoice).not.toHaveBeenCalled();
  });
  it("ignores the first invoice (its checkout is the order)", async () => {
    const f = fakes();
    await handleClubEvent(ev("invoice.paid", invoice({ billing_reason: "subscription_create", status: "paid" })), f.stripe, f.db);
    expect(f.rawDb.rpc).not.toHaveBeenCalled();
  });
  it("turns a paid renewal into an order to pack, with the saved ship-to", async () => {
    const f = fakes();
    await handleClubEvent(ev("invoice.paid", invoice({ status: "paid" })), f.stripe, f.db);
    expect(f.rawDb.rpc).toHaveBeenCalledWith("save_renewal_order", {
      p_order: expect.objectContaining({ stripe_invoice_id: "in_1", stripe_subscription_id: "sub_1", stripe_payment_intent_id: "pi_r1", amount_total: 3900, box_slug: "heart", shipping: { name: "Ada" }, email: "club@example.com" }),
    });
    expect(m.mail).toHaveBeenCalledWith("club@example.com", "in_1", expect.objectContaining({ kind: "renewed" }));
  });
  it("keeps quiet about a renewal held for review (no box promised)", async () => {
    const f = fakes();
    f.rawDb.rpc.mockResolvedValue({ data: false, error: null } as never);
    await handleClubEvent(ev("invoice.paid", invoice({ status: "paid" })), f.stripe, f.db);
    expect(f.rawDb.rpc).toHaveBeenCalledWith("save_renewal_order", expect.anything());
    expect(m.mail).not.toHaveBeenCalled();
  });
  it("throws (so Stripe retries) when the renewal can't be saved", async () => {
    const f = fakes();
    f.rawDb.rpc.mockResolvedValue({ data: null, error: { message: "offline" } } as never);
    await expect(handleClubEvent(ev("invoice.paid", invoice({ status: "paid" })), f.stripe, f.db)).rejects.toThrow(/Renewal persistence failed/);
    expect(m.mail).not.toHaveBeenCalled();
  });
  it("reminds before an active renewal, not before a paused or cancelling one", async () => {
    const f = fakes();
    await handleClubEvent(ev("invoice.upcoming", invoice({ id: undefined, next_payment_attempt: 1_800_000_000 })), f.stripe, f.db);
    expect(m.mail).toHaveBeenCalledWith("club@example.com", "sub_1-1800000000", expect.objectContaining({ kind: "upcoming", amountLabel: "$39" }));
    m.mail.mockClear();
    const g = fakes({ sub: sub({ cancel_at_period_end: true }) });
    await handleClubEvent(ev("invoice.upcoming", invoice({ id: undefined })), g.stripe, g.db);
    expect(m.mail).not.toHaveBeenCalled();
  });
  it("mirrors changes and confirms a cancellation by email", async () => {
    const f = fakes({ sub: sub({ status: "canceled" }) });
    await handleClubEvent(ev("customer.subscription.deleted", sub({ status: "canceled" })), f.stripe, f.db);
    expect(f.update).toHaveBeenCalledWith(expect.objectContaining({ status: "canceled", stripe_subscription_id: "sub_1" }));
    expect(m.mail).toHaveBeenCalledWith("club@example.com", "sub_1", expect.objectContaining({ kind: "cancelled" }));
  });
  it("confirms by email as soon as a cancellation is scheduled", async () => {
    const f = fakes({ sub: sub({ cancel_at_period_end: true }) });
    const event = { id: "evt_2", type: "customer.subscription.updated", data: { object: sub({ cancel_at_period_end: true }), previous_attributes: { cancel_at_period_end: false } } } as unknown as Stripe.Event;
    await handleClubEvent(event, f.stripe, f.db);
    expect(m.mail).toHaveBeenCalledWith("club@example.com", "sub_1-scheduled", expect.objectContaining({ kind: "cancelled", endsLabel: expect.any(String) }));
  });
  it("does not restore active state from an old event after cancellation", async () => {
    const f = fakes({ sub: sub({ status: "canceled" }) });
    await handleClubEvent(ev("customer.subscription.updated", sub()), f.stripe, f.db);
    expect(f.update).toHaveBeenCalledWith(expect.objectContaining({ status: "canceled" }));
  });
  it("retries lifecycle email failures instead of acknowledging lost mail", async () => {
    const f = fakes();
    m.mail.mockResolvedValue({ ok: false, error: "mail offline" });
    await expect(handleClubEvent(ev("invoice.upcoming", invoice()), f.stripe, f.db)).rejects.toThrow(/email/i);
  });
  it.each(["invoice.created", "invoice.paid", "invoice.upcoming"])("ignores unrelated subscriptions for %s", async (type) => {
    const f = fakes({ sub: sub({ metadata: {} }) });
    await handleClubEvent(ev(type, invoice()), f.stripe, f.db);
    expect(f.raw.invoices.finalizeInvoice).not.toHaveBeenCalled();
    expect(f.rawDb.rpc).not.toHaveBeenCalled();
    expect(m.mail).not.toHaveBeenCalled();
  });
  it("leaves other events to the checkout handler", async () => {
    const f = fakes();
    expect(await handleClubEvent(ev("checkout.session.completed", {}), f.stripe, f.db)).toBe(false);
  });
});
