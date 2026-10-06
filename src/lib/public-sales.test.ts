import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/stripe", () => ({ getStripe: () => null }));
vi.mock("@/lib/admin/db", () => ({ loadBoxRules: async () => DEFAULT_BOX_RULES }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
const m = vi.hoisted(() => ({ sale: vi.fn() }));
vi.mock("@/lib/commerce", () => ({ loadCommerceState: m.sale }));
import { loadPublicCatalog } from "./public-sales";
import { DEFAULT_BOX_RULES, BOX_SLUGS } from "./admin/types";
import { productJsonLd } from "./schema";
beforeEach(() => vi.clearAllMocks());
describe("public sale claims", () => {
  it("uses live founding limits and clinician state", async () => {
    m.sale.mockResolvedValue({ rules: DEFAULT_BOX_RULES, sales: Object.fromEntries(BOX_SLUGS.map(slug => [slug, {
      available: true, clinicianApproved: true, founding: 12, remaining: 3, priceCents: 4700,
    }])) });
    const { boxes } = await loadPublicCatalog();
    expect(boxes.every(b => b.founding === 12 && b.sale?.clinicianApproved && b.sale?.state === "preorder")).toBe(true);
    expect(productJsonLd(boxes[0]).offers.availability).toBe("https://schema.org/PreOrder");
    expect(boxes[0].sale).not.toHaveProperty("expectedSettings");
    expect(boxes[0].sale).not.toHaveProperty("expectedRules");
  });
  it("keeps sales unavailable after failed reads without claiming review", async () => {
    m.sale.mockRejectedValue(new Error("offline"));
    const { boxes } = await loadPublicCatalog();
    expect(boxes.every(b => b.founding === 0 && !b.sale?.available && !b.sale?.clinicianApproved && b.sale?.state === "waitlist")).toBe(true);
    expect(productJsonLd(boxes[0]).offers.availability).toBe("https://schema.org/OutOfStock");
  });
});
