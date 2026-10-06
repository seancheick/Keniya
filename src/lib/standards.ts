import { DEFAULT_BOX_RULES, PREGNANCY_BLOCKING, type BoxSlug } from "@/lib/admin/types";

/**
 * The public "every snack in this box" lines, read from the same defaults the engine runs on
 * so the website can't quote a number the rules don't enforce. Numbers are Keniya curation
 * standards (sources in types.ts), never presented as medical cutoffs. If a hard limit is
 * changed in the admin, change the default here too so the site keeps telling the truth.
 */
export function publicStandards(slug: BoxSlug): string[] {
  const r = DEFAULT_BOX_RULES[slug];
  const checks = `${PREGNANCY_BLOCKING.length} pregnancy food-safety checks: fully cooked or pasteurized, no pregnancy no-gos, allergens identified`;
  const caffeine = r.caffeineMax !== null ? `Caffeine known on every pack and no more than ${r.caffeineMax} mg` : null;
  const carbs = r.carbsMax !== null ? `No more than ${r.carbsMax} g total carbohydrate per pack (total carbs, never "net carbs")` : null;
  const sugar = r.addedSugarMax !== null ? `No more than ${r.addedSugarMax} g added sugar per pack` : null;
  const lines: Record<BoxSlug, (string | null)[]> = {
    pregnancy_comfort: [checks, caffeine, "Concentrated herbs and botanicals left out when pregnancy safety is uncertain", "Package date leaves room for shipping and shelf time"],
    blood_sugar: [carbs, sugar, "Qualifies through protein, fiber, whole-food fats, or a small portioned treat", `At most ${r.treatMax} treat-only picks in the box`],
    heart: [
      r.sodiumMax !== null ? `No more than ${r.sodiumMax} mg sodium per pack` : null,
      r.satFatMax !== null ? `No more than ${r.satFatMax} g saturated fat (${r.satFatNutMax} g when it comes from the nuts and seeds themselves, never from added palm or coconut oil)` : null,
      r.treatAddedSugarMax !== null ? `${sugar} on core picks, ${r.treatAddedSugarMax} g on the one treat` : sugar,
      "Nuts, seeds, whole grains, fruit and fiber are the backbone",
    ],
    gestational_diabetes: ["Passes both our Pregnancy screening and our Blood Sugar standard", carbs, sugar, caffeine],
    glp1: ["Protein-forward: most picks lead with protein or fiber", carbs, sugar, "Smaller portions, hydration, and ginger or peppermint comfort picks for queasy days"],
    postpartum: ["The same food-safety checks as the Pregnancy box", caffeine, "More hydration and protein picks in the recipe", "One-handed, no-prep snacks"],
  };
  return lines[slug].filter((l): l is string => Boolean(l));
}
