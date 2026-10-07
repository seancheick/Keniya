import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin/auth", () => ({ requireAdmin: async () => ({ name: "Sean", role: "admin" }) }));
const m = vi.hoisted(() => ({ context: vi.fn(), insert: vi.fn(), select: vi.fn() }));
vi.mock("@/lib/admin/summary", () => ({ loadAdminContext: m.context }));
vi.mock("@/lib/admin/db", () => ({ db: () => ({ from: () => ({ insert: m.insert, select: m.select }) }), must: (value: { data: unknown }) => value.data }));
import { createShipmentForPreorder } from "./orders";
const approved = { id: "p", status: "Approved", clinicianApprovedBy: "Laurie Pham", clinicalDecision: "approved", approvalRole: "clinician", diligenceComplete: true };
beforeEach(() => {
  vi.clearAllMocks();
  const q = { eq: () => q, single: async () => ({ data: { id: "8f153db8-c8f8-4594-8d5c-b859464822be", status: "paid", box_slug: "heart", avoid: null, stripe_fee_cents: 100, amount_total: 4700 } }) };
  m.select.mockReturnValue(q);
  m.insert.mockResolvedValue({ error: null });
});
function form() { const fd = new FormData(); fd.set("preorder_id", "8f153db8-c8f8-4594-8d5c-b859464822be"); return fd; }
describe("order planning uses current readiness", () => {
  it("rejects an active lineup invalidated by current rules before writing shipment", async () => {
    m.context.mockResolvedValue({ boxes: { heart: { lineup: { id: "lineup" }, ready: false, picks: [{ snack: approved }], extras: [] } } });
    await expect(createShipmentForPreorder(form())).rejects.toThrow("fails current rules");
    expect(m.insert).not.toHaveBeenCalled();
  });
  it("rejects provisional extras even when the recipe is ready", async () => {
    m.context.mockResolvedValue({ boxes: { heart: { lineup: { id: "lineup" }, ready: true, picks: [{ snack: approved }], extras: [{ ...approved, clinicalDecision: "pending" }] } } });
    await expect(createShipmentForPreorder(form())).rejects.toThrow("needs PharmaGuide Team approval");
    expect(m.insert).not.toHaveBeenCalled();
  });
});
