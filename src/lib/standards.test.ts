import { describe, expect, it } from "vitest";
import { BOX_SLUGS, DEFAULT_BOX_RULES } from "./admin/types";
import { publicStandards } from "./standards";

describe("publicStandards", () => {
  it("prints the numbers the engine enforces, for every box", () => {
    for (const slug of BOX_SLUGS) expect(publicStandards(slug).length).toBeGreaterThanOrEqual(3);
    expect(publicStandards("heart").join(" ")).toContain(`${DEFAULT_BOX_RULES.heart.sodiumMax} mg sodium`);
    expect(publicStandards("blood_sugar").join(" ")).toContain(`${DEFAULT_BOX_RULES.blood_sugar.carbsMax} g total carbohydrate`);
    expect(publicStandards("pregnancy_comfort").join(" ")).toContain(`${DEFAULT_BOX_RULES.pregnancy_comfort.caffeineMax} mg`);
  });
  it("never makes a disease claim", () => {
    for (const slug of BOX_SLUGS) expect(publicStandards(slug).join(" ")).not.toMatch(/\b(cures?|manages?|lowers?|controls?|heals?|prevents?)\b/i);
  });
});
