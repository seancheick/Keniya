// Eligibility and box checks: a direct port of keniya-box-builder v4 (Products columns
// AQ–BF and the three Builder sheets). Keep thresholds in sync with the workbook / PRODUCT.md.
// Curation aid only, not medical advice: final lineups need clinical sign-off.
import {
  BOX_LABEL,
  DEFAULT_BOX_RULES,
  BOX_SLUGS,
  PREGNANCY_BLOCKING,
  type BoxRules,
  type BoxSlug,
  type RuleInput,
  type Settings,
  type Snack,
} from "./types";
import { effectiveCaffeine } from "./caffeine";
import { netCarbs } from "./carbs";
import { hasFinding, screenIngredients, syntheticDye, unresolved, type Finding } from "./ingredients";

const num = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

const REQUIRED_NUTRIENTS = [
  ["calories", "calories"],
  ["protein_g", "protein"],
  ["fiber_g", "fiber"],
  ["carbs_g", "carbs"],
  ["added_sugar_g", "added sugar"],
  ["sodium_mg", "sodium"],
] as const;

export function missingNutrients(p: RuleInput): string[] {
  return REQUIRED_NUTRIENTS.filter(([k]) => !num(p[k])).map(([, label]) => label);
}

/** Workbook "Nutrition complete?": calories, protein, fiber, carbs, added sugar, sodium. */
export const nutritionComplete = (p: RuleInput) => missingNutrients(p).length === 0;

export function shipsUnderPolicy(p: RuleInput, policy: Settings["policy"]): { ok: boolean; reason?: string } {
  if (!policy.allowedForms.includes(p.form)) return { ok: false, reason: `${p.form} doesn't ship (policy)` };
  if (!num(p.unit_wt_oz) || p.unit_wt_oz <= 0) return { ok: false, reason: "No unit weight" };
  if (p.unit_wt_oz > policy.maxItemOz)
    return { ok: false, reason: `${p.unit_wt_oz} oz is over the ${policy.maxItemOz} oz item limit` };
  return { ok: true };
}

// Carb Conscious pathways (any one qualifies).
export const ccProteinForward = (p: RuleInput) => p.protein_g! >= 5 && p.carbs_g! <= 25;
// Fiber alone isn't enough (dried fruit has 3–4 g): pair it with protein or nut/seed fat.
export const ccFiberForward = (p: RuleInput) =>
  p.fiber_g! >= 3 && p.added_sugar_g! <= 5 && (p.protein_g! >= 3 || p.roles.NS === true || p.roles.UF === true);
export const ccWholeFood = (p: RuleInput) => p.roles.WHOLE_FOOD === true;
export const ccPortionedTreat = (p: RuleInput) =>
  p.type !== "Beverage" && p.calories! <= 200 && p.added_sugar_g! <= 8 && p.carbs_g! <= 30;
export const glp1UnsweetenedDrink = (p: RuleInput) =>
  p.type === "Beverage" && p.added_sugar_g === 0 && p.carbs_g! <= 5;

/**
 * Qualifies for Blood Sugar only as a portioned treat: no protein, fiber or whole-food anchor.
 * Unsweetened fruit and whole-grain picks (0 g added sugar) are plain food, not treats.
 */
export const ccTreatOnly = (p: RuleInput) =>
  ccPortionedTreat(p) &&
  !ccProteinForward(p) &&
  !ccFiberForward(p) &&
  !ccWholeFood(p) &&
  !((p.roles.MF === true || p.roles.WG === true) && p.added_sugar_g === 0);

// Heart helpers.
export const heartFiberForward = (p: RuleInput) => num(p.fiber_g) && p.fiber_g >= 3;
export const heartNutSeed = (p: RuleInput) => p.roles.UF === true || p.roles.NS === true;
export const heartTreat = (p: RuleInput) => p.roles.CT === true;
/** Added fats AHA sets apart from liquid plant oils; they void the nut/seed saturated-fat exception. */
const TROPICAL_OIL = /\b(palm|palm[- ]kernel|coconut)\s+oil\b|partially\s+hydrogenated/i;
export const hasAddedTropicalOil = (p: RuleInput) => TROPICAL_OIL.test(p.ingredients ?? "");
/** The ≤4 g sat-fat allowance is for fat intrinsic to nuts/seeds (AHA Heart-Check), not added oils. */
export const nutFatException = (p: RuleInput) => p.roles.NS === true && Boolean(p.ingredients?.trim()) && !hasAddedTropicalOil(p);

export type BoxFit = {
  box: BoxSlug;
  fits: boolean;
  /** Which pathway(s) qualified it (empty when it doesn't fit). */
  via: string[];
  /** Why it doesn't fit (empty when it fits). */
  reasons: string[];
  /** One structured code per reason (set by eligibleFor), for reports and review lists. */
  codes?: ReasonCode[];
};

export type ReasonCode =
  | "REJECTED" | "RETIRED" | "NUTRITION_MISSING" | "SHIPPING_POLICY" | "MULTI_SERVE" | "SINGLE_SERVE_UNCONFIRMED"
  | "DYE" | "SAFETY_FINDING" | "CLINICIAN_DECISION" | "PREGNANCY_CHECK_FAILED" | "PREGNANCY_CHECK_BLANK"
  | "CAFFEINE_UNKNOWN" | "CAFFEINE_OVER" | "CAFFEINE_ESTIMATE_HOLD" | "CARBS_OVER" | "ADDED_SUGAR_OVER"
  | "SODIUM_OVER" | "SAT_FAT_OVER" | "SAT_FAT_MISSING" | "PHO" | "NO_PATHWAY" | "OTHER";

// Ordered: the first match names the reason. Every reason text produced in this file matches one.
const REASON_CODES: [RegExp, ReasonCode][] = [
  [/^Rejected/, "REJECTED"],
  [/^Retired$/, "RETIRED"],
  [/^Missing nutrition|not recorded$/, "NUTRITION_MISSING"],
  [/^Synthetic dye/, "DYE"],
  [/^Partially hydrogenated/, "PHO"],
  [/^Current ingredients:/, "SAFETY_FINDING"],
  [/^Needs clinician decision/, "CLINICIAN_DECISION"],
  [/^Failed P/, "PREGNANCY_CHECK_FAILED"],
  [/^Not yet checked: P/, "PREGNANCY_CHECK_BLANK"],
  [/^Caffeine value missing/, "CAFFEINE_UNKNOWN"],
  [/^Estimated caffeine/, "CAFFEINE_ESTIMATE_HOLD"],
  [/ mg caffeine \(max/, "CAFFEINE_OVER"],
  [/^Multi-serve pack/, "MULTI_SERVE"],
  [/^Single-serve not yet confirmed/, "SINGLE_SERVE_UNCONFIRMED"],
  [/ g carbs \(max|g total carbs \(max/, "CARBS_OVER"],
  [/added sugar.*\(max/, "ADDED_SUGAR_OVER"],
  [/ mg sodium \(max/, "SODIUM_OVER"],
  [/^Saturated fat not recorded/, "SAT_FAT_MISSING"],
  [/saturated fat \(max/, "SAT_FAT_OVER"],
  [/doesn't ship|No unit weight|item limit/, "SHIPPING_POLICY"],
  [/needs |qualifies only|No heart role|Treat with/, "NO_PATHWAY"],
];
export const reasonCode = (r: string): ReasonCode => REASON_CODES.find(([re]) => re.test(r))?.[1] ?? "OTHER";

function base(p: RuleInput, rejectReason?: string | null): string[] {
  const reasons: string[] = [];
  if (p.status === "Rejected") reasons.push(`Rejected${rejectReason ? `: ${rejectReason}` : ""}`);
  const missing = missingNutrients(p);
  if (missing.length) reasons.push(`Missing nutrition: ${missing.join(", ")}`);
  return reasons;
}

/**
 * P3–P6 only ask whether the data is on the label: caffeine (P3: label value, or inferred as 0
 * or a worst-case cocoa estimate), added sugar (P4), sodium (P5) and an allergen statement (P6).
 * They PASS by themselves when it is there. P1, P2, P7a, P7b and P8 always need a person.
 */
export function derivedPregnancyChecks(p: RuleInput): Partial<Record<"P3" | "P4" | "P5" | "P6", "PASS">> {
  const out: Partial<Record<"P3" | "P4" | "P5" | "P6", "PASS">> = {};
  if (num(effectiveCaffeine(p))) out.P3 = "PASS";
  if (num(p.added_sugar_g)) out.P4 = "PASS";
  if (num(p.sodium_mg)) out.P5 = "PASS";
  if (p.allergens?.trim()) out.P6 = "PASS";
  return out;
}

/** Current ingredient findings (database watchlist included when loaded) without a valid resolution. */
export function openFindings(p: RuleInput): Finding[] {
  return unresolved(p.findings ?? screenIngredients(p.ingredients), p.ingredients, p.resolutions);
}

/**
 * Pregnancy-family safety holds from the current ingredients: a matched no-go/watchlist/brand
 * finding fails its check, and an unresolved review finding (botanical, cured meat, a caffeine
 * source without a label value) waits for a clinician. Evaluated every time, so an older PASS
 * can never outlive a new ingredient.
 */
export function pregnancyFindingReasons(p: RuleInput): string[] {
  const stored = p.pregnancy_checks ?? {};
  const out: string[] = [];
  for (const f of openFindings(p)) {
    if (f.severity === "pregnancy_fail" && f.check) {
      const stale = (stored[f.check] ?? "").toUpperCase() === "PASS" ? `; the stored ${f.check} PASS is out of date, reassess` : "";
      out.push(`Current ingredients: ${f.evidence} (${f.check}${stale})`);
    } else if (f.severity === "review" && f.kind === "safety" && !(f.code === "caffeine_source" && num(p.caffeine_mg))) {
      out.push(`Needs clinician decision: ${f.label} (${f.evidence})`);
    }
  }
  return out;
}

/**
 * Stored decisions with the data checks filled in where blank. A stored FAIL always wins, and a
 * current ingredient finding turns its check into FAIL whatever was stored.
 */
export function effectivePregnancyChecks(p: RuleInput): Record<string, string | undefined> {
  const stored = p.pregnancy_checks ?? {};
  const out: Record<string, string | undefined> = { ...stored };
  for (const [k, v] of Object.entries(derivedPregnancyChecks(p))) if (!(stored[k] ?? "").trim()) out[k] = v;
  for (const f of openFindings(p)) if (f.severity === "pregnancy_fail" && f.check) out[f.check] = "FAIL";
  return out;
}

export function pregnancyFit(p: RuleInput, rejectReason?: string | null): BoxFit {
  const reasons = base(p, rejectReason);
  if (!num(effectiveCaffeine(p))) reasons.push("Caffeine value missing");
  reasons.push(...pregnancyFindingReasons(p));
  const checks = effectivePregnancyChecks(p);
  const notPass = PREGNANCY_BLOCKING.filter((k) => (checks[k] ?? "").toUpperCase() !== "PASS");
  if (notPass.length) {
    const failed = notPass.filter((k) => (checks[k] ?? "").toUpperCase() === "FAIL");
    const blank = notPass.filter((k) => !failed.includes(k));
    if (failed.length) reasons.push(`Failed ${failed.join(", ")}`);
    if (blank.length) reasons.push(`Not yet checked: ${blank.join(", ")}`);
  }
  const fits = reasons.length === 0;
  return { box: "pregnancy_comfort", fits, via: fits ? ["All pregnancy checks pass"] : [], reasons };
}

export function carbFit(p: RuleInput, rejectReason?: string | null, rules: BoxRules = DEFAULT_BOX_RULES.blood_sugar): BoxFit {
  const reasons = base(p, rejectReason);
  if (reasons.length) return { box: "blood_sugar", fits: false, via: [], reasons };
  if (p.type === "Beverage") {
    const max = rules.beverageCarbsMax ?? rules.carbsMax;
    const fits = max === null || p.carbs_g! <= max;
    return { box: "blood_sugar", fits, via: fits ? ["Low-carb hydration"] : [], reasons: fits ? [] : [`Drink has ${p.carbs_g} g total carbs (max ${max} g per stick)`] };
  }
  const via: string[] = [];
  if (ccProteinForward(p)) via.push("Protein-forward");
  if (ccFiberForward(p)) via.push("Fiber-forward");
  if (ccWholeFood(p)) via.push("Whole-food");
  if (ccPortionedTreat(p)) via.push("Portioned treat");

  if (via.length) return { box: "blood_sugar", fits: true, via, reasons: [] };
  const why = `${p.protein_g} g protein, ${p.fiber_g} g fiber, ${p.added_sugar_g} g added sugar, ${p.carbs_g} g carbs, ${p.calories} cal: ` +
    "needs protein ≥5 g with carbs ≤25 g, fiber ≥3 g with added sugar ≤5 g, whole-food, " +
    "or a portioned treat (≤200 cal, ≤8 g added sugar, ≤30 g carbs)";
  return { box: "blood_sugar", fits: false, via: [], reasons: [why] };
}

export function heartFit(p: RuleInput, rejectReason?: string | null): BoxFit {
  const reasons = base(p, rejectReason);
  if (reasons.length) return { box: "heart", fits: false, via: [], reasons };
  const via: string[] = [];
  if (p.roles.UF) via.push("Unsaturated fat");
  if (p.roles.NS) via.push("Nut / seed");
  if (p.roles.WG) via.push("Whole grain");
  if (p.roles.MF) via.push("Minimally processed fruit");
  if (heartFiberForward(p)) via.push("Fiber-forward");
  if (p.roles.CT && p.added_sugar_g! <= 8) via.push("Controlled treat");
  // Sodium is held by the box's hard limit like every other pick.
  if (p.type === "Beverage" && p.added_sugar_g === 0) via.push("Unsweetened drink");
  if (via.length) return { box: "heart", fits: true, via, reasons: [] };
  const why = p.type === "Beverage"
    ? `Drink with ${p.added_sugar_g} g added sugar: a drink qualifies only unsweetened (0 g added sugar), whatever the per-pack sugar limit`
    : p.roles.CT
      ? `Treat with ${p.added_sugar_g} g added sugar (max 8 g)`
      : "No heart role: needs a judged role (unsaturated fat, nut/seed, whole grain, fruit), fiber ≥3 g, " +
        "a controlled treat ≤8 g added sugar, or an unsweetened drink";
  return { box: "heart", fits: false, via: [], reasons: [why] };
}

/** Gestational diabetes: the Pregnancy screening and the Blood Sugar pathways, both. */
export function gdmFit(p: RuleInput, rejectReason?: string | null, rules: BoxRules = DEFAULT_BOX_RULES.gestational_diabetes): BoxFit {
  const preg = pregnancyFit(p, rejectReason);
  const carb = carbFit(p, rejectReason, rules);
  const fits = preg.fits && carb.fits;
  return {
    box: "gestational_diabetes",
    fits,
    via: fits ? [...preg.via, ...carb.via] : [],
    reasons: [...new Set([...preg.reasons, ...carb.reasons])],
  };
}

/** GLP-1 companion: protein- or fiber-forward, whole-food, a small portioned treat, or an unsweetened drink. */
export function glp1Fit(p: RuleInput, rejectReason?: string | null): BoxFit {
  const reasons = base(p, rejectReason);
  if (reasons.length) return { box: "glp1", fits: false, via: [], reasons };
  const via: string[] = [];
  if (p.protein_g! >= 5) via.push("Protein-forward");
  if (ccFiberForward(p)) via.push("Fiber-forward");
  if (ccWholeFood(p)) via.push("Whole-food");
  if (ccPortionedTreat(p) && p.calories! <= 150) via.push("Small portioned treat");
  if (glp1UnsweetenedDrink(p)) via.push("Unsweetened drink");
  if (via.length) return { box: "glp1", fits: true, via, reasons: [] };
  return {
    box: "glp1",
    fits: false,
    via: [],
    reasons: [
      p.type === "Beverage"
        ? `Drink with ${p.added_sugar_g} g added sugar: a drink qualifies only unsweetened (0 g added sugar)`
        : `${p.protein_g} g protein, ${p.fiber_g} g fiber, ${p.calories} cal: needs protein ≥5 g, fiber ≥3 g with a protein or nut/seed anchor, ` +
          "whole-food, a small portioned treat (≤150 cal, ≤8 g added sugar), or an unsweetened drink",
    ],
  };
}

/**
 * Postpartum & nursing: the same food-safety checks as Pregnancy (comfort picks matter here
 * too); the box differs in its caffeine limit and composition (more protein and hydration).
 */
export const postpartumFit = (p: RuleInput, rejectReason?: string | null): BoxFit => ({ ...pregnancyFit(p, rejectReason), box: "postpartum" });

const FIT = {
  pregnancy_comfort: pregnancyFit,
  blood_sugar: carbFit,
  heart: heartFit,
  gestational_diabetes: gdmFit,
  glp1: glp1Fit,
  postpartum: postpartumFit,
} as const;

export function fitsBoxes(p: RuleInput, rejectReason?: string | null): Record<BoxSlug, BoxFit> {
  return Object.fromEntries(BOX_SLUGS.map((b) => [b, FIT[b](p, rejectReason)])) as Record<BoxSlug, BoxFit>;
}
// Lineup checks and the optimizer ask the same question thousands of times per run; inputs
// are treated as immutable, so cache per object.
const fitCache = new WeakMap<RuleInput, Partial<Record<BoxSlug, BoxFit>>>();

export function fitFor(slug: BoxSlug, p: RuleInput, rejectReason?: string | null, rules?: BoxRules): BoxFit {
  // Configured hydration pathways depend on the rule object, so never reuse the default cache.
  if (rules && slug === "blood_sugar") return carbFit(p, rejectReason, rules);
  if (rules && slug === "gestational_diabetes") return gdmFit(p, rejectReason, rules);
  if (rejectReason !== undefined) return FIT[slug](p, rejectReason);
  const hit = fitCache.get(p) ?? {};
  if (!hit[slug]) {
    hit[slug] = FIT[slug](p);
    fitCache.set(p, hit);
  }
  return hit[slug]!;
}

// ---------------------------------------------------------------- final eligibility
/**
 * Reasons a product can't go in this box even if its nutrition qualifies: status, shipping
 * policy, multi-serve packs, and the box's hard limits (checked before any pathway counts).
 */
export function gateFailures(slug: BoxSlug, p: RuleInput, rules: BoxRules, policy: Settings["policy"]): string[] {
  const out: string[] = [];
  if (p.status === "Retired") out.push("Retired");
  // Keniya standard in every box (owner decision 2026-10-17): no synthetic dyes.
  const dye = syntheticDye(p.ingredients);
  if (dye) out.push(`Synthetic dye (${dye.evidence}): Keniya standard`);
  const ships = shipsUnderPolicy(p, policy);
  if (!ships.ok) out.push(ships.reason!);
  // Single-serve must be confirmed: blank P8 is "unknown", not a pass. (Pregnancy's own P1–P8 rule already covers it.)
  if (slug !== "pregnancy_comfort") {
    const p8 = (p.pregnancy_checks.P8 ?? "").toUpperCase();
    if (p8 === "FAIL") out.push("Multi-serve pack (P8)");
    else if (p8 !== "PASS") out.push("Single-serve not yet confirmed (P8)");
  }
  const over = (v: number | null, max: number | null, what: string, unit: string) => {
    if (max !== null && num(v) && v > max) out.push(`${v} ${unit} ${what} (max ${max} ${unit})`);
  };
  if (p.type === "Beverage") over(p.added_sugar_g, rules.beverageAddedSugarMax, "added sugar in beverage", "g");
  const diabetesDrink = p.type === "Beverage" && (slug === "blood_sugar" || slug === "gestational_diabetes");
  over(p.carbs_g, p.type === "Beverage" ? rules.beverageCarbsMax ?? rules.carbsMax : rules.carbsMax, "carbs", "g");
  // A treat gets its own added-sugar ceiling when the box sets one, using the same definition
  // the box's treat count (treatMax) uses: carb-limited boxes count picks that qualify only as
  // a portioned treat; Heart counts the judged controlled-treat role.
  const treat =
    rules.treatAddedSugarMax !== null &&
    (rules.carbsMax !== null ? nutritionComplete(p) && ccTreatOnly(p) : heartTreat(p));
  if (!diabetesDrink) over(p.added_sugar_g, treat ? rules.treatAddedSugarMax : rules.addedSugarMax, treat ? "added sugar (treat)" : "added sugar", "g");
  over(p.sodium_mg, rules.sodiumMax, "sodium", "mg");
  over(effectiveCaffeine(p), rules.caffeineMax, "caffeine", "mg");
  if (rules.satFatMax !== null) {
    const nutFat = nutFatException(p) && rules.satFatNutMax !== null;
    const max = nutFat ? rules.satFatNutMax! : rules.satFatMax;
    if (!num(p.sat_fat_g)) out.push("Saturated fat not recorded");
    else if (p.sat_fat_g > max)
      out.push(
        `${p.sat_fat_g} g saturated fat (max ${max} g${nutFat ? " for nuts/seeds" : p.roles.NS && hasAddedTropicalOil(p) ? "; added tropical oil voids the nut/seed allowance" : ""})`,
      );
  }
  return out;
}

/** Final answer for a box: the nutrition rules qualify it AND it passes every gate. */
export function eligibleFor(slug: BoxSlug, p: RuleInput, rules: BoxRules, policy: Settings["policy"], rejectReason?: string | null): BoxFit {
  const q = fitFor(slug, p, rejectReason, rules);
  const gates = gateFailures(slug, p, rules, policy);
  const reasons = [...q.reasons, ...gates];
  return { box: slug, fits: q.fits && gates.length === 0, via: q.via, reasons, codes: reasons.map(reasonCode) };
}

/**
 * Internal high-fiber review list (owner decision 2026-10-18): fails nothing but the box's
 * total-carb limit, with net carbs (total − fiber) and total carbs inside the proposed dual
 * limit. Never makes a product eligible; GDM has no review limit.
 */
export function highFiberReview(slug: BoxSlug, p: RuleInput, rules: BoxRules, policy: Settings["policy"], rejectReason?: string | null): boolean {
  if (rules.netCarbsReviewMax === null || rules.carbsReviewCeiling === null || p.type === "Beverage") return false;
  const e = eligibleFor(slug, p, rules, policy, rejectReason);
  if (e.fits || !e.codes?.length || !e.codes.every((c) => c === "CARBS_OVER")) return false;
  const n = netCarbs(p);
  return n.net !== null && n.net <= rules.netCarbsReviewMax && num(p.carbs_g) && p.carbs_g <= rules.carbsReviewCeiling;
}

export function eligibleBoxes(
  p: RuleInput,
  rules: Record<BoxSlug, BoxRules>,
  policy: Settings["policy"],
  rejectReason?: string | null,
): Record<BoxSlug, BoxFit> {
  return Object.fromEntries(BOX_SLUGS.map((b) => [b, eligibleFor(b, p, rules[b], policy, rejectReason)])) as Record<BoxSlug, BoxFit>;
}

/** Approved by a named clinician (legacy workbook approvals don't count until re-attested). */
export const isClinicianApproved = (s: { status: Snack["status"]; clinicianApprovedBy?: string | null; clinicalDecision?: Snack["clinicalDecision"]; approvalRole?: string | null; diligenceComplete?: boolean }) => s.status === "Approved" && s.clinicianApprovedBy === "Laurie Pham" && s.clinicalDecision === "approved" && s.approvalRole === "clinician" && s.diligenceComplete === true;
/** Clinician-approved and package-verified: the last step before a pick can be packed. */
export const isReadyToPack = (s: Snack) => isClinicianApproved(s) && s.packageVerified === true;

/** Lineup ladder: FIX → READY · PROVISIONAL (Keniya pre-approved, awaiting the clinician) → READY · CLINICIAN APPROVED → CLEARED TO PACK. */
export function lineupStage(picks: { snack: Snack }[], ready: boolean): { label: string; tone: "good" | "warn" | "bad"; detail: string } {
  if (!ready) return { label: "FIX", tone: "bad", detail: "Fails a box rule" };
  const needApproval = picks.filter((p) => !isClinicianApproved(p.snack)).length;
  const needPackage = picks.filter((p) => p.snack.packageVerified !== true).length;
  if (!needApproval && !needPackage) return { label: "CLEARED TO PACK", tone: "good", detail: "Every pick is PharmaGuide Team-approved and package-verified" };
  // Keniya's diligence is done and the clinician has signed every pick; only the package-in-hand checks remain.
  if (!needApproval) return { label: "READY · PharmaGuide Team APPROVED", tone: "good", detail: `${needPackage} need a package check; packing is blocked until done` };
  const parts = [`${needApproval} await the PharmaGuide Team`, needPackage && `${needPackage} need a package check`].filter(Boolean);
  return { label: "READY · PROVISIONAL", tone: "warn", detail: `Pre-approved by Keniya; ${parts.join(", ")}; packing is blocked until done` };
}

/**
 * Launch gate before anything is packed: each pick must be eligible, clinician-approved and
 * package-verified (UPC on file and the label checked with the package in hand).
 */
export function packBlockers(
  slug: BoxSlug,
  items: { snack: Snack; upc: string | null; verifiedAt: string | null }[],
  rules: BoxRules,
  policy: Settings["policy"],
): string[] {
  return items.flatMap(({ snack, upc, verifiedAt }) => {
    const why: string[] = [];
    const e = eligibleFor(slug, snack, rules, policy, snack.rejectReason);
    if (!e.fits) why.push(`not eligible (${e.reasons[0]})`);
    if (snack.status !== "Approved") why.push(`${snack.status}, not PharmaGuide Team-approved`);
    else if (!isClinicianApproved(snack)) why.push("legacy approval, needs PharmaGuide Team re-attestation");
    if (!upc) why.push("no UPC");
    if (!verifiedAt) why.push("package not verified");
    return why.length ? [`${snack.code} ${snack.name}: ${why.join(", ")}`] : [];
  });
}

// ---------------------------------------------------------------- lineup checks
export type Pick = { snack: Snack; category: string | null };

export type Check = {
  key: string;
  label: string;
  /** Shown value, e.g. "12 / 14" or "29.4 oz". */
  value: string;
  /** block = must pass to be READY; warn = should fix; info = no pass/fail. */
  level: "block" | "warn" | "info";
  pass: boolean;
  /** How far from passing (0 when passing). The optimizer minimizes the sum. */
  deficit: number;
};

const check = (
  key: string,
  label: string,
  actual: number,
  rule: { min?: number; max?: number },
  level: Check["level"] = "block",
  unit = "",
): Check => {
  const under = rule.min !== undefined ? Math.max(0, rule.min - actual) : 0;
  const over = rule.max !== undefined ? Math.max(0, actual - rule.max) : 0;
  const target =
    rule.min !== undefined && rule.max !== undefined
      ? rule.min === rule.max
        ? `${rule.min}`
        : `${rule.min}–${rule.max}`
      : rule.min !== undefined
        ? `≥ ${rule.min}`
        : rule.max !== undefined
          ? `≤ ${rule.max}`
          : "";
  const shown = Number.isInteger(actual) ? `${actual}` : actual.toFixed(1);
  return {
    key,
    label,
    value: `${shown}${unit}${target ? ` (need ${target}${unit})` : ""}`,
    level,
    pass: under === 0 && over === 0,
    deficit: under + over,
  };
};

const info = (key: string, label: string, value: string): Check => ({
  key,
  label,
  value,
  level: "info",
  pass: true,
  deficit: 0,
});

/**
 * What kind of snack a product is, for the variety check (two applesauce pouches or three
 * dried-apricot packs read as filler). Brand repeats are caught separately; only kinds that
 * span brands are listed. Order matters: the first match wins.
 */
const KINDS: [RegExp, string][] = [
  [/electrolyte|hydration multiplier|replenisher/, "Electrolyte mix"],
  [/water enhancer|drink mix|lemonade/, "Water enhancer"],
  [/granola minis|granola bites/, "Granola minis"],
  [/that'?s it|fruit bar|fig bar/, "Fruit bar"],
  // Before the pouch rule: "Squeeze Pack" is also how nut butters are sold.
  [/sunbutter|(almond|peanut|sunflower|nut|seed) butter.*(squeeze|pouch|dip|cup|packet)/, "Nut butter pack"],
  [/apple ?sauce|gogo squeez/, "Fruit pouch"],
  [/apricot/, "Dried apricots"],
  [/mango/, "Dried mango"],
  [/crispy fruit|fruit crisps|just strawberries|freeze-dried strawberr/, "Dried strawberries"],
  [/chocolate[- ](covered|cocoa)?\s*almond|almond.*dark chocolate|barkthins/, "Chocolate nuts"],
  [/pumpkin seed|pepita|superseedz/, "Pumpkin seeds"],
  [/chickpea|bada bean|broad bean/, "Roasted beans"],
  [/popcorn|boomchickapop/, "Popcorn"],
  [/pistachio/, "Pistachios"],
  [/\bpeanuts\b/, "Peanuts"],
  [/nut mix|\d-nut|walnuts & almonds/, "Nut mix"],
  [/\balmonds\b/, "Almonds"],
  [/cracker|nut-thins|goldfish|bunnies/, "Crackers"],
  [/pretzel/, "Pretzels"],
  [/cheese crisps|moon cheese|parmcrisps/, "Cheese crisps"],
  [/jerky|meat stick|beef stick|beef bar/, "Jerky"],
  [/\btea\b/, "Tea"],
  [/gumm|chews?\b|candy|giggles|lollies|pop drops/, "Candy"],
];
export const productKind = (name: string): string | null => {
  const n = name.toLowerCase();
  return KINDS.find(([re]) => re.test(n))?.[1] ?? null;
};
const brandKey = (brand: string | null) => (brand ?? "").toLowerCase().replace(/\(.*?\)/g, "").replace(/^the\s+/, "").replace(/[^a-z0-9]/g, "");
/** Picks beyond the first that share a key (null keys never count); labelled by the first pick's label. */
const repeats = (keys: (string | null)[], labels: string[] = []) => {
  const seen = new Map<string, { n: number; label: string }>();
  keys.forEach((k, i) => {
    if (k) seen.set(k, { n: (seen.get(k)?.n ?? 0) + 1, label: seen.get(k)?.label ?? labels[i] ?? k });
  });
  const extra = [...seen.values()].filter((v) => v.n > 1);
  return { count: extra.reduce((t, v) => t + v.n - 1, 0), which: extra.map((v) => `${v.label} ×${v.n}`) };
};
const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export const packedWeightOz = (picks: Pick[], packagingOz: number) =>
  picks.reduce((s, p) => s + (p.snack.unit_wt_oz ?? 0), 0) + packagingOz;

/**
 * Every check from the workbook Builder for one box, plus the composition (category) rules.
 * `packagingOz` = mailer empty weight + packaging items.
 */
export function checkLineup(
  slug: BoxSlug,
  rules: BoxRules,
  picks: Pick[],
  settings: Settings,
  packagingOz: number,
): Check[] {
  const s = picks.map((p) => p.snack);
  const count = (f: (x: Snack) => boolean) => s.filter(f).length;
  const checks: Check[] = [];

  checks.push(check("filled", "Selections filled", s.length, { min: rules.total, max: rules.total }));
  checks.push(
    check("unique", "No duplicate picks", s.length - new Set(s.map((x) => x.id)).size, { max: 0 }),
  );
  checks.push(check("nutrition", "Picks missing nutrition data", count((x) => !nutritionComplete(x)), { max: 0 }));
  checks.push(check("rejected", "Rejected or retired products", count((x) => x.status === "Rejected" || x.status === "Retired"), { max: 0 }));
  // Cost never gates a lineup: the lineup is the shopping list and cost comes from the
  // purchase lot when it's bought. Shown so the landed-cost estimate is read as incomplete.
  checks.push(check("costed", "Picks with no purchase cost yet (estimate incomplete)", count((x) => x.unitCostCents === null), { max: 0 }, "warn"));
  checks.push(
    check("ships", "Picks that don't ship under policy", count((x) => !shipsUnderPolicy(x, settings.policy).ok), {
      max: 0,
    }),
  );
  const weight = packedWeightOz(picks, packagingOz);
  checks.push(check("weight", "Packed weight", Math.round(weight * 10) / 10, { max: settings.policy.maxBoxOz }, "block", " oz"));
  checks.push(
    check("fit", `Picks not eligible for ${BOX_LABEL[slug]}`, count((x) => !eligibleFor(slug, x, rules, settings.policy).fits), { max: 0 }),
  );
  // Candidates haven't passed the pre-screen: they can't be in a lineup at all.
  checks.push(check("candidate", "Unreviewed picks (Candidate)", count((x) => x.status === "Candidate"), { max: 0 }));
  checks.push(check("approved", "Picks not yet PharmaGuide Team-approved (incl. legacy approvals)", count((x) => !isClinicianApproved(x)), { max: 0 }, "warn"));
  checks.push(check("verified", "Picks without a verified package (UPC + label in hand)", count((x) => x.packageVerified !== true), { max: 0 }, "warn"));
  checks.push(
    check("stock", "Picks out of stock", count((x) => x.onHand <= 0), { max: 0 }, "warn"),
  );

  // Composition: category ranges.
  for (const c of rules.categories) {
    checks.push(
      check(`cat:${c.name}`, `${c.name} picks`, picks.filter((p) => p.category === c.name).length, {
        min: c.min,
        max: c.max,
      }),
    );
  }
  const known = new Set(rules.categories.map((c) => c.name));
  const stray = picks.filter((p) => !p.category || !known.has(p.category)).length;
  if (rules.categories.length) checks.push(check("cat:none", "Picks outside the box's categories", stray, { max: 0 }));

  if (rules.substantialMin !== null)
    checks.push(check("substantial", "Substantial selections", count((x) => x.type === "Substantial"), { min: rules.substantialMin }));
  if (rules.miniMax !== null) checks.push(check("mini", "Mini / discovery", count((x) => x.type === "Mini"), { max: rules.miniMax }));
  if (rules.beverageMax !== null)
    checks.push(check("beverage", "Beverage / tea", count((x) => x.type === "Beverage"), { max: rules.beverageMax }));

  // Any box with a caffeine limit needs the number on every pick (label value, or inferred:
  // 0 with no caffeine-bearing ingredient, a worst-case estimate for cocoa).
  if (rules.caffeineMax !== null) {
    checks.push(check("caffeine", "Picks without caffeine disclosed", count((x) => !num(effectiveCaffeine(x))), { max: 0 }));
  }
  if (rules.boxCaffeineMax !== null) {
    const total = s.reduce((t, x) => t + (effectiveCaffeine(x) ?? 0), 0);
    checks.push(check("boxcaffeine", "Total caffeine across the box (estimates count at their maximum)", Math.round(total), { max: rules.boxCaffeineMax }, "warn", " mg"));
  }
  if (rules.chocolateMax !== null)
    checks.push(check("chocolate", "Chocolate / cocoa picks", count((x) => hasFinding(screenIngredients(x.ingredients), "cocoa")), { max: rules.chocolateMax }, "warn"));

  const ok = (x: Snack) => nutritionComplete(x);
  if (rules.proteinOrFiberMin !== null)
    checks.push(
      check("pf", "Protein- or fiber-forward picks", count((x) => ok(x) && (ccProteinForward(x) || ccFiberForward(x))), {
        min: rules.proteinOrFiberMin,
      }),
    );
  if (rules.wholeFoodMin !== null)
    checks.push(check("wholefood", "Whole-food fat/protein picks", count(ccWholeFood), { min: rules.wholeFoodMin }));
  if (rules.nutSeedMin !== null)
    checks.push(check("nutseed", "Nut / seed / unsaturated-fat picks", count(heartNutSeed), { min: rules.nutSeedMin }));
  if (rules.fiberMin !== null)
    checks.push(check("fiber", "Fiber-forward picks (≥3 g)", count(heartFiberForward), { min: rules.fiberMin }));
  // Boxes built on the carb pathways count "treat-only" picks; Heart counts the judged treat role.
  const carbBox = rules.carbsMax !== null;
  if (rules.treatMax !== null) {
    const isTreat = carbBox ? (x: Snack) => ok(x) && ccTreatOnly(x) : heartTreat;
    checks.push(check("treats", carbBox ? "Treat-only picks (no protein/fiber anchor)" : "Controlled treats", count(isTreat), { max: rules.treatMax }));
  }

  // Value and variety: a box that's mostly grocery minis or repeats looks thin next to its
  // price. Warnings only — like cost, they never block a lineup.
  const brands = repeats(s.map((x) => brandKey(x.brand) || null), s.map((x) => x.brand ?? ""));
  checks.push({
    ...check("brand", "Repeated brands (one per brand)", brands.count, { max: 0 }, "warn"),
    ...(brands.count ? { value: `${brands.count} repeat${brands.count > 1 ? "s" : ""}: ${brands.which.join(", ")}` } : {}),
  });
  const kinds = repeats(s.map((x) => productKind(x.name)));
  checks.push({
    ...check("kind", "Repeated snack types (one of each kind)", kinds.count, { max: 0 }, "warn"),
    ...(kinds.count ? { value: `${kinds.count} repeat${kinds.count > 1 ? "s" : ""}: ${kinds.which.join(", ")}` } : {}),
  });
  const { minRetailCents, maxSnackCostCents } = settings.value;
  if (minRetailCents !== null) {
    const known = s.filter((x) => x.retailCents !== null);
    const retail = known.reduce((t, x) => t + x.retailCents!, 0);
    const missing = s.length - known.length;
    checks.push({
      key: "value",
      label: "Shelf value of the picks (what they'd cost at a store)",
      value: `${dollars(retail)}${missing ? ` known, ${missing} without a retail price` : ""} (target ≥ ${dollars(minRetailCents)})`,
      level: "warn",
      pass: retail >= minRetailCents && missing === 0,
      deficit: Math.max(0, minRetailCents - retail) / 100 + missing,
    });
  }
  if (maxSnackCostCents !== null) {
    const cost = s.reduce((t, x) => t + (x.unitCostCents ?? 0), 0);
    checks.push({
      key: "snackcost",
      label: "Snack cost of the picks",
      value: `${dollars(cost)} (target ≤ ${dollars(maxSnackCostCents)})`,
      level: "warn",
      pass: cost <= maxSnackCostCents,
      deficit: Math.max(0, cost - maxSnackCostCents) / 100,
    });
  }

  checks.push(info("treenuts", "Picks containing tree nuts", `${count((x) => x.freeFrom.tree_nut_free === false)}`));
  checks.push(info("peanuts", "Picks containing peanuts", `${count((x) => x.freeFrom.peanut_free === false)}`));
  if (carbBox) {
    checks.push(info("carbs", "Total carbs across the box", `${s.reduce((t, x) => t + (x.carbs_g ?? 0), 0)} g`));
    // The 14 snacks are not eaten together: an inventory summary, never a daily-intake figure.
    const nets = s.map((x) => netCarbs(x).net);
    checks.push(info("netcarbs", "Net carbs across the box (total − fiber; inventory summary, not daily intake)",
      nets.every((n) => n !== null) ? `${Math.round(nets.reduce((t, n) => t! + n!, 0)! * 10) / 10} g` : `${nets.filter((n) => n === null).length} pick(s) without a valid fiber value`));
  }

  return checks;
}

export const blockingFailures = (checks: Check[]) => checks.filter((c) => c.level === "block" && !c.pass);

/**
 * The promised range of little extras, when the recipe promises one. Extras are packed on top
 * of the snack total and checked for eligibility separately; this only counts them.
 */
export function extrasCheck(rules: BoxRules, extraCount: number): Check | null {
  if (rules.extrasMin === null && rules.extrasMax === null) return null;
  return check("extras", "Little extras (not counted in the total)", extraCount, {
    ...(rules.extrasMin !== null && { min: rules.extrasMin }),
    ...(rules.extrasMax !== null && { max: rules.extrasMax }),
  });
}
export const isReady = (checks: Check[]) => blockingFailures(checks).length === 0;
