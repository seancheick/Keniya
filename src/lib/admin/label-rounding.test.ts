import { describe, expect, it } from "vitest";
import { labelRoundingIssues } from "./label-rounding";

describe("FDA label rounding", () => {
  it("flags values a label can't print", () => {
    expect(labelRoundingIssues({ calories: 99, carbs_g: 12.9, fiber_g: 0.8, protein_g: 3.6, sodium_mg: 183, sat_fat_g: 0.4 })).toEqual([
      "Calories 99", "Protein 3.6 g", "Fiber 0.8 g", "Total carbs 12.9 g", "Saturated fat 0.4 g", "Sodium 183 mg",
    ]);
  });
  it("accepts printed values", () => {
    expect(labelRoundingIssues({ calories: 100, carbs_g: 13, fiber_g: 0.5, protein_g: 0, sodium_mg: 180, sat_fat_g: 1.5, added_sugar_g: 2 })).toEqual([]);
    expect(labelRoundingIssues({ calories: 45, sodium_mg: 135, sat_fat_g: 6 })).toEqual([]);
    expect(labelRoundingIssues({ calories: null })).toEqual([]);
  });
});
