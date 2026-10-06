import { describe, expect, it } from "vitest";
import { lotHold, stockPickList, type StockLot } from "./stock";
const now = new Date("2026-10-05T12:00:00Z");
const lot = (over: Partial<StockLot> = {}): StockLot => ({ id: "a", product_id: "p", product_version_id: "v", qty_remaining: 2, expires_on: "2027-02-01", purchased_at: "2026-10-01", created_at: "2026-10-01T00:00:00Z", lot_code: null, ...over });
describe("packable stock", () => {
  it("holds missing expiry, expired, short-dated and old-formula lots", () => {
    expect(lotHold(lot({ expires_on: null }), "v", now)).toMatch(/Expiry missing/);
    expect(lotHold(lot({ expires_on: "2026-10-04" }), "v", now)).toMatch(/Expired/);
    expect(lotHold(lot({ expires_on: "2027-01-02" }), "v", now)).toMatch(/90 days/);
    expect(lotHold(lot({ expires_on: "2027-01-03" }), "v", now)).toBeNull();
    expect(lotHold(lot(), "old", now)).toMatch(/Older formula/);
    expect(lotHold(lot(), undefined, now)).toMatch(/Older formula/);
  });
  it("allocates repeats FEFO, skips held stock and reports shortages", () => {
    const picks = stockPickList(["p", "p", "p", "p"], [lot(), lot({ id: "b", qty_remaining: 1, expires_on: "2027-01-03" }), lot({ id: "held", qty_remaining: 50, expires_on: null })], new Map([["p", { id: "v" }]]), now);
    expect(picks[0]).toMatchObject({ needed: 4, available: 3, short: 1 });
    expect(picks[0].pulls.map((p) => [p.lotId, p.qty])).toEqual([["b", 1], ["a", 2]]);
  });
  it("breaks ties consistently and handles unknown products", () => {
    expect(stockPickList(["p"], [lot({ id: "b" }), lot()], new Map([["p", { id: "v" }]]), now)[0].pulls[0].lotId).toBe("a");
    expect(stockPickList(["missing"], [lot()], new Map(), now)[0].short).toBe(1);
  });
});
