import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ rpc: vi.fn(), insert: vi.fn(), prior: vi.fn(), mail: vi.fn(), mx: vi.fn(), a4: vi.fn(), a6: vi.fn(), offer: vi.fn() }));
// m.prior stays wired so a test can prove the claim never looks up order history.
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "192.0.2.1" }) }));
vi.mock("node:dns/promises", () => ({ resolveMx: m.mx, resolve4: m.a4, resolve6: m.a6 }));
vi.mock("@/lib/supabase", () => ({ getSupabaseAdminStrict: () => ({ rpc: m.rpc, from: (t: string) => t === "waitlist" ? { insert: m.insert } : { select: () => ({ ilike: () => ({ limit: m.prior }) }) } }) }));
vi.mock("@/lib/admin/db", () => ({ loadSettings: async () => ({}) }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({}) }));
vi.mock("@/lib/resend", () => ({ sendWelcomeOfferEmail: m.mail }));
vi.mock("@/lib/offers", async (orig) => ({ ...(await orig<typeof import("@/lib/offers")>()), loadWelcomeOffer: m.offer }));
import { claimWelcomeOffer } from "./offers";

beforeEach(() => {
  vi.clearAllMocks();
  m.rpc.mockResolvedValue({ data: true, error: null });
  m.insert.mockResolvedValue({ error: null });
  m.prior.mockResolvedValue({ data: [], error: null });
  m.mail.mockResolvedValue({ ok: true });
  m.mx.mockResolvedValue([{ exchange: "mx.example.com", priority: 10 }]);
  m.offer.mockResolvedValue({ code: "WELCOME20", percentOff: 20, couponId: "c" });
});
describe("WELCOME20 claim", () => {
  it("reveals and emails the code for a new, deliverable address", async () => {
    const res = await claimWelcomeOffer({ email: " New@Example.com " });
    expect(res).toMatchObject({ ok: true, eligible: true, email: "new@example.com", code: "WELCOME20", priceCents: 3760 });
    expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({ email: "new@example.com", source: "welcome_offer" }));
    expect(m.mail).toHaveBeenCalledWith("new@example.com", expect.objectContaining({ priceLabel: "$37.60" }));
  });
  it("rejects a domain that does not exist, before saving anything", async () => {
    m.mx.mockRejectedValue(Object.assign(new Error("nx"), { code: "ENOTFOUND" }));
    const res = await claimWelcomeOffer({ email: "a@gmial.con" });
    expect(res.ok).toBe(false);
    expect(m.insert).not.toHaveBeenCalled();
  });
  it("accepts a domain with only an address record (implicit MX)", async () => {
    m.mx.mockRejectedValue(Object.assign(new Error("none"), { code: "ENODATA" }));
    m.a4.mockResolvedValue(["192.0.2.10"]);
    m.a6.mockRejectedValue(new Error("none"));
    expect((await claimWelcomeOffer({ email: "a@small.example" })).ok).toBe(true);
  });
  it("never looks up or reveals whether an email has ordered (checkout enforces first-order)", async () => {
    m.prior.mockResolvedValue({ data: [{ id: "earlier" }], error: null });
    const res = await claimWelcomeOffer({ email: "back@example.com" });
    expect(res).toMatchObject({ ok: true, eligible: true });
    expect(m.prior).not.toHaveBeenCalled();
  });
  it("never reveals a code when the offer is off", async () => {
    m.offer.mockResolvedValue(null);
    expect(await claimWelcomeOffer({ email: "new@example.com" })).toMatchObject({ ok: true, eligible: false });
    expect(m.mail).not.toHaveBeenCalled();
  });
  it("fails closed when throttled", async () => {
    m.rpc.mockResolvedValue({ data: false, error: null });
    expect((await claimWelcomeOffer({ email: "new@example.com" })).ok).toBe(false);
    expect(m.insert).not.toHaveBeenCalled();
  });
});
