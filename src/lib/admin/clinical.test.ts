import { describe, expect, it } from "vitest";
import { snack } from "./__fixtures__/snacks";
import { clinicalReviewRows } from "./clinical";

describe("clinicalReviewRows", () => {
  it("shows every rule decision with its reason and no costs", () => {
    const ok = snack({ name: "Roasted chickpeas", unitCostCents: 55 });
    const sweet = snack({ name: "Candy", added_sugar_g: 20, fiber_g: 0, protein_g: 0, pregnancy_checks: { P1: "FAIL" } });
    const [a, b] = clinicalReviewRows([ok, sweet], () => undefined, (id) => (id === ok.id ? ["heart"] : []));

    expect(a["Fits Pregnancy"]).toBe("yes");
    expect(a["In active box lineup"]).toBe("Heart");
    expect(b["Fits Pregnancy"]).toBe("no");
    expect(String(b["Pregnancy: why"])).toMatch(/P1/);
    expect(b.P1).toBe("FAIL");
    expect(b["Clinician verdict (OK / change / reject)"]).toBe("");
    expect(Object.keys(a).some((k) => /cost|price|vendor/i.test(k))).toBe(false);
  });
});
