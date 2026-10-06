import { BOX_SLUGS, PREGNANCY_BLOCKING, type BoxRules, type BoxSlug } from "@/lib/admin/types";
import { MIN_DAYS_TO_EXPIRY } from "@/lib/admin/verify";

/** The effective rules for every box: the same object eligibility runs on (live `box_rules` over defaults). */
export type PublicRules = Record<BoxSlug, BoxRules>;

/**
 * Public copy never hard-codes a limit. It writes `{{heart.sodiumMax}}` and this fills it from
 * the effective rules, so the website and the engine cannot disagree. An unknown token or a
 * rule set to "no limit" throws: better a build error than a wrong number on a medical page.
 */
export function fillStandards(text: string, rules: PublicRules): string {
  return text
    // {{slug.cat.Hydration.min}}: a recipe count (the recipe's own floor, so "at least N" stays true).
    .replace(/\{\{(\w+)\.cat\.(\w+)\.(min|max)\}\}/g, (_, slug: string, cat: string, end: "min" | "max") => {
      const c = rules[slug as BoxSlug]?.categories.find((x) => x.name === cat);
      if (!c) throw new Error(`Standards: ${slug} has no ${cat} category`);
      return String(c[end]);
    })
    .replace(/\{\{(\w+)\.(\w+)\}\}/g, (_, slug: string, field: string) => {
      const box = rules[slug as BoxSlug];
      if (field === "beverageStandard" && box?.beverageCarbsMax !== null && typeof box?.beverageCarbsMax === "number") return `at most ${box.beverageCarbsMax} g total carbs per stick`;
      if (field === "beverageStandard" && box) return box.beverageAddedSugarMax === 0 ? "unsweetened" : box.beverageAddedSugarMax === null ? "screened" : `at most ${box.beverageAddedSugarMax} g added sugar per beverage`;
      const v = box?.[field as keyof BoxRules];
      if (typeof v !== "number") throw new Error(`Standards: ${slug}.${field} is not a number (${String(v)})`);
      return String(v);
    });
}

/** Public copy for one recipe category of one box. */
export type CategoryCopy = { name: string; note: string };

/**
 * What goes in, from the live recipe: each category's achievable range once the other
 * categories' floors and ceilings and the drink cap are applied, so "2×" is shown only when
 * the recipe forces exactly two. Every category in the recipe needs copy (or this throws),
 * and a category with nothing achievable is left out.
 */
export function publicComposition(slug: BoxSlug, rules: PublicRules, copy: Partial<Record<string, CategoryCopy>>): { name: string; count: string; note: string }[] {
  const r = rules[slug];
  const cats = r.categories;
  const sumMin = cats.reduce((s, c) => s + c.min, 0);
  const sumMax = cats.reduce((s, c) => s + c.max, 0);
  return cats
    .map((c) => {
      let hi = Math.min(c.max, r.total - (sumMin - c.min));
      if (c.name === "Hydration" && r.beverageMax !== null) hi = Math.min(hi, r.beverageMax);
      const lo = Math.max(c.min, r.total - (sumMax - c.max));
      const text = copy[c.name];
      if (!text) throw new Error(`Composition: no public copy for ${slug} ${c.name}`);
      return { name: text.name, count: lo === hi ? `${lo}` : lo <= 0 ? `up to ${hi}` : `${lo}–${hi}`, note: fillStandards(text.note, rules), hi };
    })
    .filter((c) => c.hi > 0)
    .map(({ name, count, note }) => ({ name, count, note }));
}

/** The "every snack in this box" lines, from the effective rules. Keniya curation standards, never medical cutoffs. */
export function publicStandards(slug: BoxSlug, rules: PublicRules): string[] {
  const r = rules[slug];
  const checks = `${PREGNANCY_BLOCKING.length} pregnancy screening checks: fully cooked or pasteurized, no pregnancy no-gos, allergens identified`;
  const caffeine = r.caffeineMax !== null ? `Caffeine known on every pack and no more than ${r.caffeineMax} mg` : null;
  const pack = slug === "blood_sugar" || slug === "gestational_diabetes" ? "snack pack" : "pack";
  const carbs = r.carbsMax !== null ? `No more than ${r.carbsMax} g total carbohydrate per ${pack} (total carbs, never "net carbs")` : null;
  const sugar = r.addedSugarMax !== null ? `No more than ${r.addedSugarMax} g added sugar per ${pack}` : null;
  const beverage = r.beverageCarbsMax !== null ? `Hydration picks: ${r.beverageCarbsMax} g total carbs or less per stick.` : r.beverageAddedSugarMax === null ? null : r.beverageAddedSugarMax === 0 ? "Beverages must have 0 g added sugar" : `Beverages have at most ${r.beverageAddedSugarMax} g added sugar`;
  const catMin = (name: string) => r.categories.find((c) => c.name === name)?.min ?? 0;
  const lines: Record<BoxSlug, (string | null)[]> = {
    pregnancy_comfort: [checks, caffeine, "Concentrated herbs and botanicals left out when pregnancy safety is uncertain", `Every package we pack has at least ${MIN_DAYS_TO_EXPIRY} days before its date`],
    blood_sugar: [carbs, sugar, beverage, "0 g added sugar hydration options are preferred when available.", "Qualifies through protein, fiber, whole-food fats, or a small portioned treat", r.treatMax !== null ? `At most ${r.treatMax} treat-only picks in the box` : null],
    heart: [
      r.sodiumMax !== null ? `No more than ${r.sodiumMax} mg sodium per pack` : null,
      r.satFatMax !== null ? `No more than ${r.satFatMax} g saturated fat (${r.satFatNutMax ?? r.satFatMax} g when it comes from the nuts and seeds themselves, never from added palm or coconut oil)` : null,
      r.treatAddedSugarMax !== null && sugar ? `${sugar} on core picks, ${r.treatAddedSugarMax} g on a portioned treat${r.treatMax !== null ? ` (at most ${r.treatMax} per box)` : ""}` : sugar,
      "Nuts, seeds, whole grains, fruit and fiber are the backbone",
      beverage,
    ],
    gestational_diabetes: ["Passes both our Pregnancy screening and our Blood Sugar standard", carbs, sugar, caffeine, beverage, "0 g added sugar hydration options are preferred when available."],
    glp1: [r.proteinOrFiberMin !== null ? `At least ${r.proteinOrFiberMin} picks lead with protein or fiber` : null, carbs, sugar, beverage, "Small portions and hydration"],
    postpartum: ["The same food-safety checks as the Pregnancy box", caffeine, catMin("Protein") && catMin("Hydration") ? `At least ${catMin("Protein")} protein picks and ${catMin("Hydration")} sips in every box` : null, "One-handed, no-prep snacks"],
  };
  return lines[slug].filter((l): l is string => Boolean(l));
}

export const standardsForAll = (rules: PublicRules): Record<BoxSlug, string[]> =>
  Object.fromEntries(BOX_SLUGS.map((s) => [s, publicStandards(s, rules)])) as Record<BoxSlug, string[]>;
