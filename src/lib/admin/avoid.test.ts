import { describe, expect, it } from "vitest";
import { avoidConflict, avoidTerms } from "./avoid";

const p = (name: string, extra: object = {}) => ({ name, allergens: null, freeFrom: {}, ...extra });

describe("avoid matching", () => {
  it("splits free text into terms", () => {
    expect(avoidTerms("Peanuts and coconut, no ginger please")).toEqual(["peanuts", "coconut", "ginger"]);
    expect(avoidTerms("none")).toEqual([]);
  });
  it("uses allergen flags and nut names", () => {
    expect(avoidConflict(p("Blue Diamond Almonds"), "tree nuts")).toBe("contains tree nuts");
    expect(avoidConflict(p("Trail mix", { freeFrom: { peanut_free: false } }), "peanut")).toBe("contains peanut");
    expect(avoidConflict(p("Popcorn", { freeFrom: { peanut_free: true } }), "peanut")).toBeNull();
  });
  it("matches words in name / ingredients", () => {
    expect(avoidConflict(p("Ginger chews"), "ginger")).toBe("mentions “ginger”");
    expect(avoidConflict(p("Fruit bar", { ingredients: "dates, coconut" }), "coconut")).toMatch(/coconut/);
    expect(avoidConflict(p("Fruit bar"), "")).toBeNull();
  });
});
