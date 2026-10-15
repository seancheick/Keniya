import { describe, expect, it } from "vitest";
import { foundingBonusOrders } from "./offers";

const o = (id: string, day: number, extra: Partial<{ kind: string; admission_verified: boolean; status: string }> = {}) => ({ id, created_at: `2026-10-${String(day).padStart(2, "0")}T00:00:00Z`, status: "paid", admission_verified: true, kind: "one_time", ...extra });

describe("founding bonus", () => {
  it("goes to the first N admitted orders, oldest first, never renewals", () => {
    const orders = [o("c", 3), o("a", 1), o("r", 2, { kind: "renewal" }), o("held", 2, { admission_verified: false }), o("b", 2, { kind: "subscription" })];
    expect([...foundingBonusOrders(orders, { enabled: true, limit: 2, description: "" })]).toEqual(["a", "b"]);
  });
  it("is empty when switched off", () => {
    expect(foundingBonusOrders([o("a", 1)], { enabled: false, limit: 5, description: "" }).size).toBe(0);
  });
});
