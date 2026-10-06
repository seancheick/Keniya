import { BOX_SLUGS, PREGNANCY_BLOCKING, type BoxRules, type BoxSlug } from "@/lib/admin/types";

/** The effective rules for every box: the same object eligibility runs on (live `box_rules` over defaults). */
export type PublicRules = Record<BoxSlug, BoxRules>;

/**
 * Public copy never hard-codes a limit. It writes `{{heart.sodiumMax}}` and this fills it from
 * the effective rules, so the website and the engine cannot disagree. An unknown token or a
 * rule set to "no limit" throws: better a build error than a wrong number on a medical page.
 */
export function fillStandards(text: string, rules: PublicRules): string {
  return text.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_, slug: string, field: string) => {
    const box = rules[slug as BoxSlug];
    const v = box?.[field as keyof BoxRules];
    if (typeof v !== "number") throw new Error(`Standards: ${slug}.${field} is not a number (${String(v)})`);
    return String(v);
  });
}

/** The "every snack in this box" lines, from the effective rules. Keniya curation standards, never medical cutoffs. */
export function publicStandards(slug: BoxSlug, rules: PublicRules): string[] {
  const r = rules[slug];
  const checks = `${PREGNANCY_BLOCKING.length} pregnancy food-safety checks: fully cooked or pasteurized, no pregnancy no-gos, allergens identified`;
  const caffeine = r.caffeineMax !== null ? `Caffeine known on every pack and no more than ${r.caffeineMax} mg` : null;
  const carbs = r.carbsMax !== null ? `No more than ${r.carbsMax} g total carbohydrate per pack (total carbs, never "net carbs")` : null;
  const sugar = r.addedSugarMax !== null ? `No more than ${r.addedSugarMax} g added sugar per pack` : null;
  const lines: Record<BoxSlug, (string | null)[]> = {
    pregnancy_comfort: [checks, caffeine, "Concentrated herbs and botanicals left out when pregnancy safety is uncertain", "Package date leaves room for shipping and shelf time"],
    blood_sugar: [carbs, sugar, "Qualifies through protein, fiber, whole-food fats, or a small portioned treat", r.treatMax !== null ? `At most ${r.treatMax} treat-only picks in the box` : null],
    heart: [
      r.sodiumMax !== null ? `No more than ${r.sodiumMax} mg sodium per pack` : null,
      r.satFatMax !== null ? `No more than ${r.satFatMax} g saturated fat (${r.satFatNutMax ?? r.satFatMax} g when it comes from the nuts and seeds themselves, never from added palm or coconut oil)` : null,
      r.treatAddedSugarMax !== null && sugar ? `${sugar} on core picks, ${r.treatAddedSugarMax} g on the one treat` : sugar,
      "Nuts, seeds, whole grains, fruit and fiber are the backbone",
    ],
    gestational_diabetes: ["Passes both our Pregnancy screening and our Blood Sugar standard", carbs, sugar, caffeine],
    glp1: ["Protein-forward: most picks lead with protein or fiber", carbs, sugar, "Smaller portions, hydration, and ginger or peppermint comfort picks for queasy days"],
    postpartum: ["The same food-safety checks as the Pregnancy box", caffeine, "More hydration and protein picks in the recipe", "One-handed, no-prep snacks"],
  };
  return lines[slug].filter((l): l is string => Boolean(l));
}

export const standardsForAll = (rules: PublicRules): Record<BoxSlug, string[]> =>
  Object.fromEntries(BOX_SLUGS.map((s) => [s, publicStandards(s, rules)])) as Record<BoxSlug, string[]>;
