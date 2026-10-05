import { describe, expect, it } from "vitest";
import { cheapestVendor, planPurchases, type VendorPrice } from "./purchasing";

const vp = (vendorName: string, unitCostCents: number, seenAt: string, source: VendorPrice["source"] = "sighting", packQty: number | null = null): VendorPrice => ({
  vendorId: vendorName, vendorName, unitCostCents, packQty, seenAt, source,
});
const today = new Date("2026-10-04T00:00:00Z");

describe("purchasing", () => {
  it("cheapest vendor uses each vendor's latest price", () => {
    const prices = [vp("Costco", 40, "2026-01-01"), vp("Costco", 54, "2026-10-01"), vp("Target", 92, "2026-09-28"), vp("Faire", 48, "2026-09-02", "quote", 48)];
    expect(cheapestVendor(prices, today)?.vendorName).toBe("Faire");
  });

  it("merges a product used by all three boxes", () => {
    const plan = planPurchases({
      lineups: { pregnancy_comfort: ["almond"], blood_sugar: ["almond"], heart: ["almond", "tea"] },
      runSize: { pregnancy_comfort: 50, blood_sugar: 50, heart: 50 },
      products: [
        { id: "almond", code: "P004", name: "Almond butter", onHand: 34, prices: [vp("Costco", 58, "2026-10-01", "purchase", 24)] },
        { id: "tea", code: "P032", name: "Ginger tea", onHand: 100, prices: [] },
      ],
      bufferPct: 0.05,
      today,
    });
    const almond = plan.rows.find((r) => r.product.id === "almond")!;
    expect(almond).toMatchObject({ required: 150, buffer: 8, onHand: 34, toBuy: 124, orderQty: 124 });
    expect(almond.estSpendCents).toBe(124 * 58);
    const tea = plan.rows.find((r) => r.product.id === "tea")!;
    expect(tea).toMatchObject({ required: 50, toBuy: 0, vendor: null });
    expect(plan.totalCents).toBe(124 * 58);
  });

  it("rounds up to a vendor case size", () => {
    const plan = planPurchases({
      lineups: { heart: ["x"] },
      runSize: { heart: 10 },
      products: [{ id: "x", code: "P1", name: "x", onHand: 0, prices: [vp("UNFI", 30, "2026-09-01", "quote", 12)] }],
      bufferPct: 0,
      today,
    });
    expect(plan.rows[0]).toMatchObject({ toBuy: 10, orderQty: 12 });
  });
});
