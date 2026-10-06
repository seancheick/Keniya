import { describe, expect, it } from "vitest";
import { BOX_SLUGS, DEFAULT_BOX_RULES } from "./admin/types";
import { boxes } from "./box";
import { landings } from "./landing";
import { fillStandards, publicStandards, standardsForAll } from "./standards";

const rules = DEFAULT_BOX_RULES;

describe("publicStandards", () => {
  it("prints the numbers the rules enforce, for every box", () => {
    for (const slug of BOX_SLUGS) expect(publicStandards(slug, rules).length).toBeGreaterThanOrEqual(3);
    expect(publicStandards("heart", rules).join(" ")).toContain(`${rules.heart.sodiumMax} mg sodium`);
    expect(publicStandards("blood_sugar", rules).join(" ")).toContain(`${rules.blood_sugar.carbsMax} g total carbohydrate`);
    expect(publicStandards("pregnancy_comfort", rules).join(" ")).toContain(`${rules.pregnancy_comfort.caffeineMax} mg`);
    expect(Object.keys(standardsForAll(rules))).toEqual([...BOX_SLUGS]);
  });
  it("follows a changed rule", () => {
    const tighter = { ...rules, heart: { ...rules.heart, sodiumMax: 120 } };
    expect(publicStandards("heart", tighter)[0]).toBe("No more than 120 mg sodium per pack");
  });
  it("never makes a disease claim", () => {
    for (const slug of BOX_SLUGS) expect(publicStandards(slug, rules).join(" ")).not.toMatch(/\b(cures?|manages?|lowers?|controls?|heals?|prevents?)\b/i);
  });
});

describe("fillStandards", () => {
  it("fills tokens from the rules and refuses unknown or unset ones", () => {
    expect(fillStandards("under {{heart.sodiumMax}} mg", rules)).toBe(`under ${rules.heart.sodiumMax} mg`);
    expect(() => fillStandards("{{heart.nope}}", rules)).toThrow(/heart.nope/);
    expect(() => fillStandards("{{pregnancy_comfort.carbsMax}}", rules)).toThrow(/not a number/);
  });
  it("every token in the public copy resolves, and no public copy hard-codes a limit", () => {
    const texts: string[] = [];
    for (const b of boxes) texts.push(b.forWho, b.why, b.caution ?? "");
    for (const l of landings) texts.push(l.title, l.description, l.h1, l.intro, ...l.forWho, ...Object.values(l.categoryWhy), ...l.screening.flatMap((s) => [s.title, s.body]), ...l.faqs.flatMap((f) => [f.q, f.a]));
    for (const t of texts) expect(() => fillStandards(t, rules)).not.toThrow();
    // A per-pack limit written as a literal number would drift from the rules: it must be a token.
    const literal = /\b\d+(\.\d+)? ?(mg sodium|g (total )?carb|g added sugar|g saturated fat)\b/i;
    for (const t of texts) expect(t, t).not.toMatch(literal);
  });
});
