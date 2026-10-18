// Ingredient screening: reads the label ingredient list (and allergen statement) and flags what
// a reviewer would otherwise have to spot by eye. Pure and conservative: it can pre-set a FAIL
// or raise a review flag, but it never marks a pregnancy check PASS on its own.
//
// Sources: ACOG (caffeine <200 mg/day), FDA/CDC listeria guidance (raw sprouts, unpasteurized
// dairy/juice, deli and dry-cured meats, refrigerated smoked fish, liver/pâté), FDA mercury
// advice (shark, swordfish, king mackerel, tilefish, bigeye tuna, marlin, orange roughy),
// licorice/glycyrrhizin and the workbook's pregnancy watchlist. Synthetic dyes and sugar
// alcohols are Keniya brand standards (never described as unsafe).

export type FindingSeverity =
  /** Keniya standard: never in any box. */
  | "reject"
  /** Fails a pregnancy check (P2, P7a or P7b): blocks Pregnancy, GDM and Postpartum. */
  | "pregnancy_fail"
  /** Needs a person (clinician decision or label evidence); doesn't decide anything alone. */
  | "review"
  /** Customer-preference information (P7c); never blocks. */
  | "info";

export type FindingCode =
  | "caffeine_source"
  | "cocoa"
  | "synthetic_dye"
  | "watchlist"
  | "alcohol"
  | "raw_or_unpasteurized"
  | "sprouts"
  | "organ_meat"
  | "high_mercury_fish"
  | "cured_meat"
  | "sugar_alcohol"
  | "sweetener"
  | "botanical";

export type Finding = {
  code: FindingCode;
  severity: FindingSeverity;
  /** "brand" = a Keniya standard or preference (dyes, sugar alcohols), never described as unsafe. */
  kind: "safety" | "brand";
  /** Stable identity for a clinician resolution: `${code}:${evidence, lowercased}`. */
  key: string;
  /** Pregnancy check the finding speaks to, when it maps to one. */
  check?: "P2" | "P3" | "P7a" | "P7b" | "P7c";
  label: string;
  /** The ingredient text that matched. */
  evidence: string;
};

type Rule = { code: FindingCode; severity: FindingSeverity; check?: Finding["check"]; label: string; re: RegExp };

const RULES: Rule[] = [
  // Caffeine. Bare "tea" is not enough: herbal teas list the herb (ginger, peppermint…).
  {
    code: "caffeine_source",
    severity: "review",
    check: "P3",
    label: "Contains a caffeine source (coffee, tea leaf, matcha, guarana…): caffeine must come from the label",
    re: /\b(coffee|espresso|matcha|guarana|yerba[- ]mate|kola[- ]nut|camellia sinensis|caffeine|(green|black|white|oolong|pu[- ]?erh)\s+tea|tea\s+(leaf|leaves|extract|powder))\b/i,
  },
  {
    code: "cocoa",
    severity: "info",
    check: "P3",
    label: "Contains cocoa/chocolate (small caffeine: estimated from pack weight when not on the label)",
    re: /\b(cocoa|cacao|chocolate|choc\.?\s+liquor)\b/i,
  },
  // Keniya standard, all boxes (owner decision 2026-10-17).
  {
    code: "synthetic_dye",
    severity: "reject",
    label: "Synthetic dye (Keniya standard: no artificial colors)",
    re: /\b(fd\s*&\s*c|fd&c)\b|\b(red|yellow|blue|green|citrus red)\s*(no\.?|#)?\s*(40|3|5|6|1|2)\b(\s*lake)?|\b(allura red|tartrazine|sunset yellow|brilliant blue|indigo carmine|erythrosine|fast green)\b/i,
  },
  // P2: pregnancy no-gos.
  {
    code: "raw_or_unpasteurized",
    severity: "pregnancy_fail",
    check: "P2",
    label: "Raw or unpasteurized dairy, egg or juice",
    re: /\b(raw|unpasteuri[sz]ed)\s+(milk|cream|cheese|egg|eggs|juice|cider)\b|\braw[- ]milk\b/i,
  },
  {
    code: "sprouts",
    severity: "pregnancy_fail",
    check: "P2",
    label: "Raw sprouts (alfalfa, clover, mung bean, radish)",
    re: /\b(alfalfa|clover|mung bean|radish)\s+sprouts?\b/i,
  },
  { code: "organ_meat", severity: "pregnancy_fail", check: "P2", label: "Liver or pâté (vitamin A / listeria)", re: /\b(liver|p[âa]t[ée])\b/i },
  {
    code: "high_mercury_fish",
    severity: "pregnancy_fail",
    check: "P2",
    label: "High-mercury fish",
    re: /\b(shark|swordfish|king mackerel|tilefish|bigeye tuna|marlin|orange roughy)\b/i,
  },
  {
    code: "alcohol",
    severity: "pregnancy_fail",
    check: "P2",
    label: "Contains alcohol (not trace flavor extract)",
    // "sugar alcohol(s)" and "vanilla extract" (trace alcohol carrier) are not alcohol ingredients.
    // "red wine vinegar" and "natural rum flavor" contain no alcohol, so they don't count.
    re: /\b(rum|bourbon|whiskey|whisky|brandy|liqueur|wine|beer|vodka|sake)\b(?!\s+(vinegar|flavou?r|flavou?ring|extract))|(?<!sugar\s)\balcohol\b(?!s?\s*\()/i,
  },
  // Clinician decision: shelf-stable cooked/dried meats sit between deli meat and cooked food.
  {
    code: "cured_meat",
    severity: "review",
    check: "P2",
    label: "Cured or dried meat (jerky, meat stick, salami): clinician decision for pregnancy",
    re: /\b(salami|pepperoni|prosciutto|dry sausage|summer sausage|chorizo|jerky|meat stick|beef stick|biltong)\b/i,
  },
  // P7a: established pregnancy concern (the DB watchlist adds to these at runtime).
  {
    code: "watchlist",
    severity: "pregnancy_fail",
    check: "P7a",
    label: "Pregnancy watchlist ingredient",
    re: /\b(saccharin|licorice root|liquorice root|glycyrrhiz\w*|sage extract|aloe|goldenseal|dong quai|black cohosh|blue cohosh|yohimbe|ephedra|ma huang|pennyroyal|mugwort|wormwood|bitter melon|7[- ]keto)\b/i,
  },
  // P7b: Keniya brand preference.
  {
    code: "sugar_alcohol",
    severity: "pregnancy_fail",
    check: "P7b",
    label: "Sugar alcohol (Keniya brand preference, not a safety issue)",
    re: /\b(erythritol|maltitol|sorbitol|xylitol|isomalt|mannitol|lactitol)\b/i,
  },
  // P7c: customer-preference information only.
  {
    code: "sweetener",
    severity: "info",
    check: "P7c",
    label: "Non-sugar sweetener (customer preference flag)",
    re: /\b(stevia|steviol|reb\s?a|rebaudioside|monk ?fruit|luo han guo|allulose|sucralose|aspartame|acesulfame|neotame|advantame)\b/i,
  },
  // Needs a person: concentrated herbs, fortification, live cultures.
  {
    code: "botanical",
    severity: "review",
    label: "Concentrated herb, fortification or live culture: case-by-case review",
    re: /\b(ginger (extract|powder|root extract)|lion'?s mane|ashwagandha|turmeric extract|ginseng|kava|valerian|st\.? john'?s wort|retinol|retinyl|vitamin a (acetate|palmitate)|probiotic|lactobacillus|bifidobacterium|bacillus coagulans)\b/i,
  },
];

const BRAND_CODES: FindingCode[] = ["synthetic_dye", "sugar_alcohol"];

function finding(code: FindingCode, severity: FindingSeverity, check: Finding["check"], label: string, evidence: string): Finding {
  return { code, severity, check, label, evidence, kind: BRAND_CODES.includes(code) ? "brand" : "safety", key: `${code}:${evidence.toLowerCase()}` };
}

/** Pregnancy watchlist rows from the database (`public.watchlist`). */
export type WatchlistRow = { ingredient: string; category: string | null };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Screen an ingredient list. `watchlist` adds the database rows: "contraindicated"/"avoid"
 * become P7a fails, "monitor" becomes a review flag (caffeine is handled separately).
 */
export function screenIngredients(text: string | null | undefined, watchlist: WatchlistRow[] = []): Finding[] {
  const hay = (text ?? "").replace(/\s+/g, " ");
  if (!hay.trim()) return [];
  const out: Finding[] = [];
  const seen = new Set<string>();
  const add = (f: Finding) => {
    const key = `${f.code}:${f.evidence.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(f);
    }
  };
  for (const r of RULES) {
    const m = hay.match(r.re);
    if (m) add(finding(r.code, r.severity, r.check, r.label, m[0].trim()));
  }
  for (const w of watchlist) {
    const name = w.ingredient.trim().toLowerCase();
    if (!name || name === "caffeine") continue;
    const m = hay.match(new RegExp(`\\b${escape(name)}\\b`, "i"));
    if (!m) continue;
    const monitor = (w.category ?? "").toLowerCase() === "monitor";
    add(finding("watchlist", monitor ? "review" : "pregnancy_fail", "P7a", `Pregnancy watchlist: ${w.ingredient}${w.category ? ` (${w.category})` : ""}`, m[0]));
  }
  return out;
}

export const hasFinding = (findings: Finding[], code: FindingCode) => findings.some((f) => f.code === code);

/** Shortcut used by the hard-limit gate. */
export const syntheticDye = (ingredients: string | null | undefined) =>
  screenIngredients(ingredients).find((f) => f.code === "synthetic_dye") ?? null;

/**
 * Screening decisions a finding can pre-set. Only FAILs: a clean screen is a suggestion for a
 * person to confirm, never an automatic PASS for P1, P2, P7a or P8.
 */
export function suggestedFails(findings: Finding[]): Partial<Record<"P2" | "P7a" | "P7b", string>> {
  const out: Partial<Record<"P2" | "P7a" | "P7b", string>> = {};
  for (const f of findings) {
    if (f.severity !== "pregnancy_fail" || !f.check || !["P2", "P7a", "P7b"].includes(f.check)) continue;
    const k = f.check as "P2" | "P7a" | "P7b";
    out[k] = out[k] ? `${out[k]}; ${f.evidence}` : f.evidence;
  }
  return out;
}

/**
 * A current finding beats a stored decision: P2/P7a/P7b become FAIL when the ingredients match a
 * flag, even over an older PASS, unless a clinician (or, for brand preferences, an admin) has
 * recorded an "accept" resolution for that exact finding on these exact ingredients.
 */
export function withScreeningFails(
  checks: Record<string, string>,
  ingredients: string | null | undefined,
  watchlist: WatchlistRow[] = [],
  resolutions: Resolution[] = [],
): Record<string, string> {
  const open = unresolved(screenIngredients(ingredients, watchlist), ingredients, resolutions);
  const out = { ...checks };
  for (const k of Object.keys(suggestedFails(open)) as (keyof ReturnType<typeof suggestedFails>)[]) out[k] = "FAIL";
  return out;
}

/** A recorded decision on one finding, bound to the ingredient text it was made on. */
export type Resolution = { finding_key: string; ingredients_hash: string; decision: "accept" | "confirm_fail" };

/** Deterministic hash of the normalized ingredient list (FNV-1a, 32-bit, hex). Any edit voids a resolution. */
export function ingredientsHash(text: string | null | undefined): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Findings without a valid "accept" resolution. Dyes can never be accepted (Keniya standard). */
export function unresolved(findings: Finding[], ingredients: string | null | undefined, resolutions: Resolution[] = []): Finding[] {
  const hash = ingredientsHash(ingredients);
  return findings.filter(
    (f) => f.code === "synthetic_dye" || !resolutions.some((r) => r.finding_key === f.key && r.ingredients_hash === hash && r.decision === "accept"),
  );
}
