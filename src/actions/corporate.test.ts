import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ rpc: vi.fn(), mail: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "192.0.2.1" }) }));
vi.mock("@/lib/supabase", () => ({ getSupabaseAdminStrict: () => ({ rpc: m.rpc }) }));
vi.mock("@/lib/resend", () => ({ sendCorporateInquiry: m.mail }));
import { requestCorporateGifts } from "./corporate";

const good = { name: "Ada", email: "Ada@Example.com", company: "Acme", quantity: "12" };
beforeEach(() => {
  vi.clearAllMocks();
  m.rpc.mockResolvedValue({ data: true, error: null });
  m.mail.mockResolvedValue({ ok: true });
});
describe("corporate gift inquiries", () => {
  it("sends a valid inquiry with a normalized email", async () => {
    expect((await requestCorporateGifts(good)).ok).toBe(true);
    expect(m.mail).toHaveBeenCalledWith(expect.objectContaining({ email: "ada@example.com", quantity: 12 }));
  });
  it("turns away orders under the team minimum before any send", async () => {
    const res = await requestCorporateGifts({ ...good, quantity: 9 });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/10 boxes/);
    expect(m.mail).not.toHaveBeenCalled();
  });
  it("never confirms a failed send", async () => {
    m.mail.mockResolvedValue({ ok: false, error: "down" });
    expect((await requestCorporateGifts(good)).ok).toBe(false);
  });
  it("fails closed when throttled or the limiter is down", async () => {
    m.rpc.mockResolvedValue({ data: false, error: null });
    expect((await requestCorporateGifts(good)).ok).toBe(false);
    m.rpc.mockResolvedValue({ error: { message: "offline" } });
    expect((await requestCorporateGifts(good)).ok).toBe(false);
    expect(m.mail).not.toHaveBeenCalled();
  });
});
