// Structured allergens: the FDA's nine major food allergens (FALCPA + FASTER Act sesame).
// A product's allergens come from its label: the "Contains" statement, any cross-contact
// statement ("may contain", "made in a facility", "shared equipment") and the ingredient list.
// A customer's exclusions are hard constraints at fulfillment (owner amendment 2026-10-18):
// a Contains *or* cross-contact match conflicts, and a product whose allergens can't be
// verified (no statement, or a statement that disagrees with the ingredients) never substitutes.
// Keniya is not an allergen-free facility and never promises an allergen-free product.

export const ALLERGENS = ["milk", "egg", "fish", "shellfish", "tree_nuts", "peanuts", "wheat", "soy", "sesame"] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  milk: "Milk",
  egg: "Egg",
  fish: "Fish",
  shellfish: "Shellfish",
  tree_nuts: "Tree nuts",
  peanuts: "Peanuts",
  wheat: "Wheat",
  soy: "Soy",
  sesame: "Sesame",
};

/** Words that name each allergen on a label (statement or ingredient list). */
const WORDS: Record<Allergen, RegExp> = {
  milk: /\b(milk|dairy|whey|casein(ates?)?|butter(?!nut)|cream|cheese|yogurt|lactose|ghee|curds?)\b/i,
  egg: /\b(eggs?|egg whites?|albumin|meringue)\b/i,
  fish: /\b(fish|anchov(y|ies)|tuna|salmon|cod|pollock|tilapia|sardines?|mackerel)\b/i,
  shellfish: /\b(shellfish|crustaceans?|shrimp|prawns?|crab|lobster|crayfish)\b/i,
  tree_nuts: /\b(tree ?nuts?|almonds?|cashews?|pecans?|walnuts?|pistachios?|hazelnuts?|macadamias?|brazil nuts?|pine nuts?)\b/i,
  peanuts: /\b(peanuts?|groundnuts?)\b/i,
  wheat: /\b(wheat|spelt|durum|semolina|farina|einkorn|emmer|kamut)\b/i,
  soy: /\b(soy|soya|soybeans?|edamame|tofu)\b/i,
  sesame: /\b(sesame|tahini)\b/i,
};

// Ingredient-list words that mean an allergen is in the product, narrower than WORDS so plant
// "milks" and "nut butters" don't create false inconsistencies.
const INGREDIENT_WORDS: Record<Allergen, RegExp> = {
  ...WORDS,
  // Highly refined soybean oil is exempt from allergen labeling (FDA), so a plain "soybean oil"
  // doesn't need "soy" in Contains. Oil the label calls unrefined/pressed is not exempt, nor is
  // soy lecithin.
  soy: /\b(soy(?!(bean)? oil)|soya|soybeans?(?! oil)|edamame|tofu|(unrefined|cold[- ]pressed|expeller[- ]pressed|virgin) soy(bean)? oil)\b/i,
  milk: /\b((whole |skim |nonfat |dry )?milk(?<!(oat|almond|coconut|soy|rice|cashew|hemp) milk)|whey|casein(ates?)?|butter(?!nut|milk)(?<!(peanut|almond|cashew|nut|seed|cocoa|shea|sunflower|sunflower seed) butter)|cream(?<!ice cream)|cheese|yogurt|lactose|ghee)\b/i,
};

const CROSS_CONTACT = /(may contain|may also contain|made (in|on) (a )?(facility|shared equipment|equipment)|processed (in|on) (a )?(facility|shared equipment|equipment)|produced (in|on)|shared (equipment|facility|lines?)|traces? of)/i;

const SOY_OIL = /\bsoy(bean)? oil\b/i;

const has = (text: string, a: Allergen, words = WORDS) => words[a].test(text);

export type ProductAllergens = {
  contains: Allergen[];
  mayContain: Allergen[];
  /** The label lets us verify allergens at all (a statement exists and agrees with the ingredients). */
  verifiable: boolean;
  issues: string[];
};

/**
 * Split the allergen statement into the part before any cross-contact phrase ("Contains…") and
 * the cross-contact part, and check the ingredient list against "Contains".
 */
export function productAllergens(p: { allergens?: string | null; ingredients?: string | null }): ProductAllergens {
  const statement = (p.allergens ?? "").trim();
  const ingredients = (p.ingredients ?? "").trim();
  const issues: string[] = [];
  if (!statement) issues.push("No allergen statement on file: allergens can't be verified");
  // Statements are often one line ("almonds, peanuts, soy, may contain sesame"): within each
  // sentence, everything before the first cross-contact phrase is "contains", the rest is not.
  const parts = statement.split(/(?<=[.;])\s+|\n/).map((x) => {
    const m = x.match(CROSS_CONTACT);
    return m?.index === undefined ? { direct: x, cross: "" } : { direct: x.slice(0, m.index), cross: x.slice(m.index) };
  });
  const cross = parts.map((x) => x.cross).join(" ");
  const direct = parts.map((x) => x.direct).join(" ");
  const contains = ALLERGENS.filter((a) => has(direct, a));
  const mayContain = ALLERGENS.filter((a) => has(cross, a) && !contains.includes(a));
  const saysNone = /^(contains:?\s*)?(none|no (major )?allergens)\b/i.test(direct.trim());
  if (statement && ingredients)
    for (const a of ALLERGENS)
      if (has(ingredients, a, INGREDIENT_WORDS) && !contains.includes(a))
        issues.push(`Ingredients list ${ALLERGEN_LABEL[a].toLowerCase()} but the ${saysNone ? "statement says none" : "Contains statement doesn't"}`);
  return { contains, mayContain, verifiable: issues.length === 0, issues };
}

/** Structured allergens named in a customer's free-text answer; the rest stays free text. */
export function parseAvoid(text: string | null | undefined): Allergen[] {
  const t = (text ?? "").toLowerCase();
  if (!t.trim()) return [];
  const out = new Set<Allergen>(ALLERGENS.filter((a) => has(t, a)));
  if (/\bnuts?\b/.test(t) && !/\bpeanuts?\b/.test(t)) out.add("tree_nuts");
  if (/\bgluten|celiac|coeliac\b/.test(t)) out.add("wheat");
  if (/\blactose|dairy\b/.test(t)) out.add("milk");
  return ALLERGENS.filter((a) => out.has(a));
}

/**
 * Why a product can't go to a customer excluding these allergens, or null. Strict by design:
 * cross-contact counts, and an unverifiable label blocks.
 */
export function allergenConflict(p: { allergens?: string | null; ingredients?: string | null }, excluded: readonly Allergen[]): string | null {
  if (!excluded.length) return null;
  const a = productAllergens(p);
  if (!a.verifiable) return `allergens can't be verified (${a.issues.join("; ")})`;
  const hit = excluded.filter((x) => a.contains.includes(x));
  if (hit.length) return `contains ${hit.map((x) => ALLERGEN_LABEL[x].toLowerCase()).join(", ")}`;
  // Label-exempt refined soybean oil still never goes to a customer excluding soy.
  if (excluded.includes("soy") && SOY_OIL.test(p.ingredients ?? "")) return "lists soybean oil (label-exempt when highly refined, still excluded for soy)";
  const cross = excluded.filter((x) => a.mayContain.includes(x));
  if (cross.length) return `cross-contact warning for ${cross.map((x) => ALLERGEN_LABEL[x].toLowerCase()).join(", ")}`;
  return null;
}

export const isAllergen = (v: string): v is Allergen => (ALLERGENS as readonly string[]).includes(v);
