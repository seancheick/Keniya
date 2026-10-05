import { describe, expect, it } from "vitest";
import { pnl, shippingStats, type ReportShipment } from "./reports";

const s = (o: Partial<ReportShipment>): ReportShipment => ({
  box_slug: "heart", kind: "order", status: "shipped", packed_at: "2026-11-02T00:00:00Z", shipped_at: "2026-11-03T00:00:00Z", delivered_at: null,
  carrier: "USPS", service: "Ground Advantage", zone: 4, issue: null, revenue_cents: 4700, stripe_fee_cents: 166, snack_cost_cents: 1381,
  packaging_cost_cents: 302, overhead_cents: 220, label_cost_cents: 814, est_postage_cents: 750, ...o,
});

describe("reports", () => {
  it("P&L by month matches per-order profit", () => {
    const rows = pnl([s({}), s({ packed_at: "2026-12-01T00:00:00Z" }), s({ packed_at: null })], (x) => x.packed_at!.slice(0, 7));
    expect(rows.map((r) => r.key)).toEqual(["2026-12", "2026-11"]);
    expect(rows[1]).toMatchObject({ boxes: 1, revenue: 4700, profit: 4700 - 166 - 1381 - 302 - 220 - 814 });
  });
  it("shipping analytics", () => {
    const st = shippingStats([s({}), s({ zone: 8, label_cost_cents: 974, delivered_at: "2026-11-07T00:00:00Z", issue: "damaged" })]);
    expect(st.avgCents).toBe(894);
    expect(st.byZone.map((z) => z.key)).toEqual(["Zone 4", "Zone 8"]);
    expect(st.avgDeliveryDays).toBe(4);
    expect(st.damagedRate).toBe(0.5);
    expect(st.estVsActualCents).toBe(144);
  });
});
