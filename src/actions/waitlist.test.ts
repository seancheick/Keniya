import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ rpc: vi.fn(), insert: vi.fn(), mail: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "192.0.2.1" }) }));
vi.mock("@/lib/supabase", () => ({ getSupabaseAdminStrict: () => ({ rpc: m.rpc, from: () => ({ insert: m.insert }) }) }));
vi.mock("@/lib/resend", () => ({ sendWaitlistConfirmEmail: m.mail }));
import { joinWaitlist } from "./waitlist";
beforeEach(() => {
  vi.clearAllMocks();
  m.rpc.mockResolvedValue({ data: true, error: null });
  m.insert.mockResolvedValue({ error: null });
  m.mail.mockResolvedValue({ ok: true });
});
describe("waitlist persistence and abuse", () => {
  it("saves a new address before sending confirmation", async () => {
    expect((await joinWaitlist({ email: "TEST@example.com" })).ok).toBe(true);
    expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({ email: "test@example.com" }));
    expect(m.mail).toHaveBeenCalledOnce();
    expect(m.insert.mock.invocationCallOrder[0]).toBeLessThan(m.mail.mock.invocationCallOrder[0]);
  });
  it("does not resend mail for duplicate submissions", async () => {
    m.insert.mockResolvedValue({ error: { code: "23505" } });
    expect((await joinWaitlist({ email: "test@example.com" })).ok).toBe(true);
    expect(m.mail).not.toHaveBeenCalled();
  });
  it("blocks attempts before insertion or email when throttled", async () => {
    m.rpc.mockResolvedValue({ data: false, error: null });
    expect((await joinWaitlist({ email: "test@example.com" })).ok).toBe(false);
    expect(m.insert).not.toHaveBeenCalled();
    expect(m.mail).not.toHaveBeenCalled();
  });
  it("fails closed when the shared limiter is unavailable", async () => {
    m.rpc.mockResolvedValue({ error: { message: "database unavailable" } });
    expect((await joinWaitlist({ email: "test@example.com" })).ok).toBe(false);
    expect(m.insert).not.toHaveBeenCalled();
  });
  it("never confirms a failed durable insert", async () => {
    m.insert.mockResolvedValue({ error: { code: "42501", message: "denied" } });
    expect((await joinWaitlist({ email: "test@example.com" })).ok).toBe(false);
    expect(m.mail).not.toHaveBeenCalled();
  });
});
