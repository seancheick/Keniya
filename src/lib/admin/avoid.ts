// Match a customer's free-text "anything to avoid?" answer against products, so the packed
// box swaps those items out. Errs on the side of excluding (a false positive costs a swap;
// a false negative ships something they asked us not to).
import type { FreeFromKey, Snack } from "./types";

const TREE_NUTS = ["almond", "cashew", "pecan", "walnut", "pistachio", "hazelnut", "macadamia", "brazil nut", "pine nut"];
const RULES: { words: RegExp; flag?: FreeFromKey; names?: string[] }[] = [
  { words: /\bpeanuts?\b/, flag: "peanut_free", names: ["peanut"] },
  { words: /\b(tree ?nuts?|nuts?)\b/, flag: "tree_nut_free", names: TREE_NUTS },
  { words: /\b(dairy|milk|lactose|cheese|whey)\b/, flag: "dairy_free", names: ["cheese", "milk", "whey", "yogurt", "parm"] },
  { words: /\b(gluten|wheat|celiac|coeliac)\b/, flag: "gluten_free", names: ["wheat"] },
  { words: /\b(soy|soya)\b/, flag: "soy_free", names: ["soy"] },
];
const STOP = new Set(["and", "the", "any", "none", "nothing", "no", "not", "please", "with", "or", "too", "very", "allergy", "allergic", "avoid", "free", "dont", "don't"]);

type Matchable = Pick<Snack, "name" | "allergens" | "freeFrom"> & { ingredients?: string | null };

export function avoidTerms(text: string | null | undefined): string[] {
  if (!text) return [];
  return [
    ...new Set(
      text
        .toLowerCase()
        .replace(/tree\s+nuts?/g, "treenuts")
        .split(/[\s,;/]+/)
        .map((t) => t.replace(/[^a-z'-]/g, "").replace("treenuts", "tree nuts"))
        .filter((t) => t.length >= 3 && !STOP.has(t)),
    ),
  ];
}

/** Why this product conflicts with the avoid text, or null. */
export function avoidConflict(s: Matchable, text: string | null | undefined): string | null {
  const terms = avoidTerms(text);
  if (!terms.length) return null;
  const hay = `${s.name} ${s.allergens ?? ""} ${s.ingredients ?? ""}`.toLowerCase();
  for (const t of terms) {
    for (const r of RULES) {
      if (!r.words.test(t)) continue;
      if (r.flag && s.freeFrom[r.flag] === false) return `contains ${t}`;
      if (r.names?.some((n) => hay.includes(n))) return `contains ${t}`;
    }
    const stem = t.replace(/(es|s)$/, "");
    if (stem.length >= 4 && hay.includes(stem)) return `mentions “${t}”`;
  }
  return null;
}
