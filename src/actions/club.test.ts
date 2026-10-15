import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ rpc: vi.fn(), rows: vi.fn(), mail: vi.fn(), retrieve: vi.fn(), update: vi.fn(), dbUpdate: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "192.0.2.1" }) }));
vi.mock("@/lib/resend", () => ({ sendClubEmail: m.mail }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ subscriptions: { retrieve: m.retrieve, update: m.update } }) }));
vi.mock("@/lib/supabase", () => ({
  getSupabaseAdminStrict: () => ({
    rpc: m.rpc,
    from: () => ({
      select: () => ({ ilike: () => ({ order: m.rows }), in: () => ({ order: m.rows }) }),
      update: (patch: unknown) => ({ eq: async () => m.dbUpdate(patch) }),
    }),
  }),
}));
import { clubAction, requestClubLink } from "./club";
import { signClubLink } from "@/lib/club-link";

const row = { stripe_subscription_id: "sub_1", email: "club@example.com", box_slug: "heart", status: "active", paused: false, resumes_at: null, cancel_at_period_end: false, current_period_end: null, price_cents: 3900, shipping: null };
const live = { id: "sub_1", customer: "cus_1", status: "active", pause_collection: null, cancel_at_period_end: false, metadata: { box_slug: "heart" }, items: { data: [{ current_period_end: 1_800_000_000, price: { unit_amount: 3900 } }] } };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_SESSION_SECRET = "a-test-secret-that-is-long-enough";
  m.rpc.mockResolvedValue({ data: true, error: null });
  m.rows.mockResolvedValue({ data: [row], error: null });
  m.retrieve.mockResolvedValue(live);
  m.update.mockImplementation(async (_id: string, patch: object) => ({ ...live, ...patch }));
  m.dbUpdate.mockReturnValue({ error: null });
  m.mail.mockResolvedValue({ ok: true });
});

describe("manage link requests", () => {
  it("emails a link naming the subscriber's subscriptions", async () => {
    const res = await requestClubLink({ email: "Club@Example.com" });
    expect(res.ok).toBe(true);
    expect(m.mail).toHaveBeenCalledWith("club@example.com", expect.any(String), expect.objectContaining({ kind: "link", url: expect.stringContaining("/club?t=") }));
  });
  it("answers the same for an email with no Snack Club, and sends nothing", async () => {
    m.rows.mockResolvedValue({ data: [], error: null });
    const res = await requestClubLink({ email: "nobody@example.com" });
    expect(res).toMatchObject({ ok: true, message: expect.stringContaining("If nobody@example.com has a Snack Club") });
    expect(m.mail).not.toHaveBeenCalled();
  });
});

describe("self-service changes", () => {
  const token = () => signClubLink(["sub_1"])!;
  it("skips exactly the next renewal: paused through it, back three days later", async () => {
    expect((await clubAction({ token: token(), subscriptionId: "sub_1", action: "skip" })).ok).toBe(true);
    expect(m.update).toHaveBeenCalledWith("sub_1", { pause_collection: { behavior: "void", resumes_at: 1_800_000_000 + 3 * 86_400 } });
  });
  it("skips two or three renewals in one go", async () => {
    await clubAction({ token: token(), subscriptionId: "sub_1", action: "skip", months: 3 });
    const d = new Date(1_800_000_000 * 1000);
    d.setUTCMonth(d.getUTCMonth() + 2);
    expect(m.update).toHaveBeenCalledWith("sub_1", { pause_collection: { behavior: "void", resumes_at: Math.floor(d.getTime() / 1000) + 3 * 86_400 } });
  });
  it("records an optional cancel reason, and only known ones", async () => {
    await clubAction({ token: token(), subscriptionId: "sub_1", action: "cancel", reason: "Too much food" });
    expect(m.dbUpdate).toHaveBeenCalledWith({ cancel_reason: "Too much food" });
    m.dbUpdate.mockClear();
    await clubAction({ token: token(), subscriptionId: "sub_1", action: "cancel", reason: "<script>" });
    expect(m.dbUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ cancel_reason: expect.anything() }));
  });
  it("pauses, resumes and cancels at period end", async () => {
    await clubAction({ token: token(), subscriptionId: "sub_1", action: "pause" });
    await clubAction({ token: token(), subscriptionId: "sub_1", action: "resume" });
    await clubAction({ token: token(), subscriptionId: "sub_1", action: "cancel" });
    expect(m.update.mock.calls.map((c) => c[1])).toEqual([{ pause_collection: { behavior: "void" } }, { pause_collection: "" }, { cancel_at_period_end: true }]);
  });
  it("refuses a subscription the link doesn't name, or an expired link", async () => {
    expect(await clubAction({ token: token(), subscriptionId: "sub_other", action: "cancel" })).toMatchObject({ ok: false });
    expect(await clubAction({ token: signClubLink(["sub_1"], 0)!, subscriptionId: "sub_1", action: "cancel" })).toMatchObject({ ok: false, message: expect.stringContaining("expired") });
    expect(m.update).not.toHaveBeenCalled();
  });
  it("returns a retryable result when billing retrieval fails", async () => {
    m.retrieve.mockRejectedValueOnce(new Error("offline"));
    await expect(clubAction({ token: token(), subscriptionId: "sub_1", action: "cancel" })).resolves.toMatchObject({ ok: false });
    expect(m.update).not.toHaveBeenCalled();
  });
  it("saves a valid US address and rejects a bad ZIP", async () => {
    const address = { name: "Ada", line1: "1 Main St", city: "Providence", state: "ri", postal_code: "02903" };
    expect((await clubAction({ token: token(), subscriptionId: "sub_1", action: "address", address })).ok).toBe(true);
    expect(m.dbUpdate).toHaveBeenCalledWith(expect.objectContaining({ shipping: { name: "Ada", address: expect.objectContaining({ state: "RI", country: "US", line2: null }) } }));
    expect((await clubAction({ token: token(), subscriptionId: "sub_1", action: "address", address: { ...address, postal_code: "abc" } })).ok).toBe(false);
  });
});
