import { describe, expect, it } from "vitest";
import { settings } from "./__fixtures__/snacks";
import { effectiveUnitCost, landedCost, settingsPostage, shipmentProfit } from "./costing";
import { estimatePostage } from "./postage";

describe("unit cost", () => {
  it("24 units for $11.99 → 49.96¢; weighted average across lots", () => {
    expect(effectiveUnitCost({ lots: [{ qty_remaining: 24, unit_cost_cents: 1199 / 24 }] })).toBeCloseTo(49.958, 3);
    const avg = effectiveUnitCost({
      lots: [
        { qty_remaining: 10, unit_cost_cents: 50 },
        { qty_remaining: 30, unit_cost_cents: 70 },
        { qty_remaining: 0, unit_cost_cents: 999 },
      ],
    });
    expect(avg).toBe(65);
  });
  it("falls back: quote → latest seen → estimate → null", () => {
    expect(effectiveUnitCost({ quoteCents: 60, latestSeenCents: 55, estimateCents: 70 })).toBe(60);
    expect(effectiveUnitCost({ latestSeenCents: 55, estimateCents: 70 })).toBe(55);
    expect(effectiveUnitCost({ estimateCents: 70 })).toBe(70);
    expect(effectiveUnitCost({})).toBeNull();
  });
});

describe("landed cost (Price Calculator)", () => {
  it("itemizes and totals like the workbook", () => {
    const lc = landedCost({
      slug: "heart",
      settings,
      pickCosts: Array(14).fill(100),
      mailer: { name: "12×9×4 mailer", cents: 250 },
      postageCents: 800,
    });
    const snacks = 1400;
    const waste = 1400 * 0.03;
    const fees = 4700 * 0.029 + 30;
    const expected = snacks + waste + 250 + 35 + 800 + fees + 150;
    expect(lc.totalCents).toBeCloseTo(expected, 6);
    expect(lc.contributionCents).toBeCloseTo(4700 - expected, 6);
    expect(lc.contributionPct).toBeCloseTo((4700 - expected) / 4700, 6);
    // Price for 30%: (total − fees + fixed) / (1 − 0.30 − 2.9%)
    expect(lc.targets[1].priceCents).toBeCloseTo((expected - fees + 30) / (1 - 0.3 - 0.029), 6);
    // At that price contribution is exactly 30%.
    const p = lc.targets[1].priceCents;
    const atP = expected - fees + p * 0.029 + 30;
    expect((p - atP) / p).toBeCloseTo(0.3, 9);
  });

  it("unknown pick costs count as $0 and are reported", () => {
    expect(landedCost({ slug: "heart", settings, pickCosts: [100, null], postageCents: 0 }).uncosted).toBe(1);
  });
});

describe("postage", () => {
  it("weight table brackets", () => {
    expect(settingsPostage(settings, "heart", 15.9)).toBe(600);
    expect(settingsPostage(settings, "heart", 16)).toBe(800);
    expect(settingsPostage(settings, "heart", 40)).toBe(950);
    expect(settingsPostage({ ...settings, shipping: { ...settings.shipping, method: "flat", flatCents: 1000 } }, "heart", 40)).toBe(1000);
  });
  it("learns from ≥5 real labels in the same weight band", () => {
    const h = (c: number, oz = 29) => ({ packed_weight_oz: oz, label_cost_cents: c, package_profile_id: "p", zone: 4 });
    const four = [h(700), h(720), h(740), h(760)];
    expect(estimatePostage({ settings, slug: "heart", weightOz: 30, history: four }).source).toBe("settings");
    const r = estimatePostage({ settings, slug: "heart", weightOz: 30, packageProfileId: "p", history: [...four, h(780), h(2000, 50)] });
    expect(r).toMatchObject({ source: "learned", cents: 740, samples: 5 });
  });
});

describe("order profit", () => {
  it("uses the actual label when entered", () => {
    const p = shipmentProfit({
      revenue_cents: 4700, stripe_fee_cents: 166, snack_cost_cents: 1381, packaging_cost_cents: 302,
      overhead_cents: 220, label_cost_cents: 814, est_postage_cents: 700,
    });
    expect(p.profit).toBe(4700 - 166 - 1381 - 302 - 220 - 814);
    expect(p.postageIsEstimate).toBe(false);
  });
});
