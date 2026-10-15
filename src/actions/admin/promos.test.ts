import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ coupon: vi.fn(), promo: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin/auth", () => ({ requireAdmin: async () => ({ name: "Sean", role: "admin" }) }));
vi.mock("@/lib/admin/db", () => ({ loadSettings: async () => ({ offers: { welcome: { code: "WELCOME20" } } }) }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ coupons: { create: m.coupon }, promotionCodes: { create: m.promo } }) }));
import { createPromo } from "./promos";
import { sessionPromoCode } from "@/lib/promo-codes";

const form = (o: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ code: "bloom10", vendor: "Bloom Doula", percentOff: "10", maxRedemptions: "", expires: "", ...o })) fd.set(k, v);
  return fd;
};
beforeEach(() => {
  vi.clearAllMocks();
  m.coupon.mockResolvedValue({ id: "co_1" });
  m.promo.mockResolvedValue({ id: "promo_1" });
});
describe("admin promo codes", () => {
  it("creates a once-only percent coupon behind an uppercase customer code", async () => {
    expect((await createPromo({}, form({ maxRedemptions: "50" }))).ok).toMatch(/BLOOM10/);
    expect(m.coupon).toHaveBeenCalledWith(expect.objectContaining({ percent_off: 10, duration: "once", metadata: expect.objectContaining({ vendor: "Bloom Doula" }) }));
    expect(m.promo).toHaveBeenCalledWith(expect.objectContaining({ code: "BLOOM10", promotion: { type: "coupon", coupon: "co_1" }, max_redemptions: 50 }));
  });
  it("refuses the welcome code, bad percents and past expiry, before touching Stripe", async () => {
    expect((await createPromo({}, form({ code: "welcome20" }))).error).toMatch(/first-box offer/);
    expect((await createPromo({}, form({ percentOff: "0" }))).error).toMatch(/1 to 100/);
    expect((await createPromo({}, form({ expires: "2020-01-01" }))).error).toMatch(/future/);
    expect((await createPromo({}, form({ code: "no spaces" }))).error).toMatch(/letters, numbers or dashes/);
    expect(m.coupon).not.toHaveBeenCalled();
  });
  it("reports Stripe's own refusal (e.g. a duplicate code)", async () => {
    m.promo.mockRejectedValue(new Error("An active promotion code with `code: BLOOM10` already exists."));
    expect((await createPromo({}, form({}))).error).toMatch(/already exists/);
  });
});
describe("order promo tracking", () => {
  it("names the welcome offer, a typed code, or nothing", async () => {
    const stripe = { promotionCodes: { retrieve: vi.fn(async () => ({ code: "BLOOM10" })) } } as never;
    expect(await sessionPromoCode(stripe, { metadata: { offer: "WELCOME20" }, discounts: [] })).toBe("WELCOME20");
    expect(await sessionPromoCode(stripe, { metadata: {}, discounts: [{ coupon: null, promotion_code: "promo_1" }] })).toBe("BLOOM10");
    expect(await sessionPromoCode(stripe, { metadata: {}, discounts: [] })).toBeNull();
  });
});
