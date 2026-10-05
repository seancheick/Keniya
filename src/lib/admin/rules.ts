// Eligibility and box checks: a direct port of keniya-box-builder v4 (Products columns
// AQ–BF and the three Builder sheets). Keep thresholds in sync with the workbook / PRODUCT.md.
// Curation aid only, not medical advice: final lineups need clinical sign-off.
import {
  BOX_LABEL,
  PREGNANCY_BLOCKING,
  type BoxRules,
  type BoxSlug,
  type RuleInput,
  type Settings,
  type Snack,
} from "./types";

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
  if (!num(p.unit_wt_oz)) return { ok: false, reason: "No unit weight" };
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
export const ccUnsweetenedDrink = (p: RuleInput) =>
  p.type === "Beverage" && p.added_sugar_g === 0 && p.carbs_g! <= 5;

// Heart helpers.
export const heartFiberForward = (p: RuleInput) => num(p.fiber_g) && p.fiber_g >= 3;
export const highSodium = (p: RuleInput) => num(p.sodium_mg) && p.sodium_mg > 300;
export const heartNutSeed = (p: RuleInput) => p.roles.UF === true || p.roles.NS === true;
export const heartTreat = (p: RuleInput) => p.roles.CT === true;

export type BoxFit = {
  box: BoxSlug;
  fits: boolean;
  /** Which pathway(s) qualified it (empty when it doesn't fit). */
  via: string[];
  /** Why it doesn't fit (empty when it fits). */
  reasons: string[];
};

function base(p: RuleInput, rejectReason?: string | null): string[] {
  const reasons: string[] = [];
  if (p.status === "Rejected") reasons.push(`Rejected${rejectReason ? `: ${rejectReason}` : ""}`);
  const missing = missingNutrients(p);
  if (missing.length) reasons.push(`Missing nutrition: ${missing.join(", ")}`);
  return reasons;
}

export function pregnancyFit(p: RuleInput, rejectReason?: string | null): BoxFit {
  const reasons = base(p, rejectReason);
  if (!num(p.caffeine_mg)) reasons.push("Caffeine value missing");
  const notPass = PREGNANCY_BLOCKING.filter((k) => (p.pregnancy_checks[k] ?? "").toUpperCase() !== "PASS");
  if (notPass.length) {
    const failed = notPass.filter((k) => (p.pregnancy_checks[k] ?? "").toUpperCase() === "FAIL");
    const blank = notPass.filter((k) => !failed.includes(k));
    if (failed.length) reasons.push(`Failed ${failed.join(", ")}`);
    if (blank.length) reasons.push(`Not yet checked: ${blank.join(", ")}`);
  }
  const fits = reasons.length === 0;
  return { box: "pregnancy_comfort", fits, via: fits ? ["All pregnancy checks pass"] : [], reasons };
}

export function carbFit(p: RuleInput, rejectReason?: string | null): BoxFit {
  const reasons = base(p, rejectReason);
  if (reasons.length) return { box: "blood_sugar", fits: false, via: [], reasons };
  const via: string[] = [];
  if (ccProteinForward(p)) via.push("Protein-forward");
  if (ccFiberForward(p)) via.push("Fiber-forward");
  if (ccWholeFood(p)) via.push("Whole-food");
  if (ccPortionedTreat(p)) via.push("Portioned treat");
  if (ccUnsweetenedDrink(p)) via.push("Unsweetened drink");
  if (via.length) return { box: "blood_sugar", fits: true, via, reasons: [] };
  const why =
    p.type === "Beverage"
      ? `Drink has ${p.added_sugar_g} g added sugar / ${p.carbs_g} g carbs (needs 0 g and ≤5 g)`
      : `${p.protein_g} g protein, ${p.fiber_g} g fiber, ${p.added_sugar_g} g added sugar, ${p.carbs_g} g carbs, ${p.calories} cal: ` +
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
  if (p.type === "Beverage" && p.added_sugar_g === 0 && p.sodium_mg! <= 200) via.push("Unsweetened low-sodium drink");
  if (via.length) return { box: "heart", fits: true, via, reasons: [] };
  const why = p.roles.CT
    ? `Treat with ${p.added_sugar_g} g added sugar (max 8 g)`
    : "No heart role: needs a judged role (unsaturated fat, nut/seed, whole grain, fruit), fiber ≥3 g, " +
      "a controlled treat ≤8 g added sugar, or an unsweetened low-sodium drink";
  return { box: "heart", fits: false, via: [], reasons: [why] };
}

/** Future boxes (marked * in the workbook). */
export const glp1Fit = (p: RuleInput) => nutritionComplete(p) && p.protein_g! >= 5 && p.added_sugar_g! <= 5;
export const postpartumFit = (p: RuleInput) =>
  pregnancyFit(p).fits && (p.protein_g! >= 3 || p.fiber_g! >= 3);

export function fitsBoxes(p: RuleInput, rejectReason?: string | null): Record<BoxSlug, BoxFit> {
  return {
    pregnancy_comfort: pregnancyFit(p, rejectReason),
    blood_sugar: carbFit(p, rejectReason),
    heart: heartFit(p, rejectReason),
  };
}

const FIT = { pregnancy_comfort: pregnancyFit, blood_sugar: carbFit, heart: heartFit } as const;
// Lineup checks and the optimizer ask the same question thousands of times per run; inputs
// are treated as immutable, so cache per object.
const fitCache = new WeakMap<RuleInput, Partial<Record<BoxSlug, BoxFit>>>();

export function fitFor(slug: BoxSlug, p: RuleInput, rejectReason?: string | null): BoxFit {
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
  const ships = shipsUnderPolicy(p, policy);
  if (!ships.ok) out.push(ships.reason!);
  if (slug !== "pregnancy_comfort" && (p.pregnancy_checks.P8 ?? "").toUpperCase() === "FAIL") out.push("Multi-serve pack (P8)");
  const over = (v: number | null, max: number | null, what: string, unit: string) => {
    if (max !== null && num(v) && v > max) out.push(`${v} ${unit} ${what} (max ${max} ${unit})`);
  };
  over(p.carbs_g, rules.carbsMax, "carbs", "g");
  over(p.added_sugar_g, rules.addedSugarMax, "added sugar", "g");
  over(p.sodium_mg, rules.sodiumMax, "sodium", "mg");
  if (rules.satFatMax !== null) {
    const nutFat = p.roles.NS === true || p.roles.UF === true;
    const max = nutFat && rules.satFatNutMax !== null ? rules.satFatNutMax : rules.satFatMax;
    if (!num(p.sat_fat_g)) out.push("Saturated fat not recorded");
    else if (p.sat_fat_g > max) out.push(`${p.sat_fat_g} g saturated fat (max ${max} g${nutFat ? " for nuts/seeds" : ""})`);
  }
  return out;
}

/** Final answer for a box: the nutrition rules qualify it AND it passes every gate. */
export function eligibleFor(slug: BoxSlug, p: RuleInput, rules: BoxRules, policy: Settings["policy"], rejectReason?: string | null): BoxFit {
  const q = fitFor(slug, p, rejectReason);
  const gates = gateFailures(slug, p, rules, policy);
  return { box: slug, fits: q.fits && gates.length === 0, via: q.via, reasons: [...q.reasons, ...gates] };
}

export function eligibleBoxes(
  p: RuleInput,
  rules: Record<BoxSlug, BoxRules>,
  policy: Settings["policy"],
  rejectReason?: string | null,
): Record<BoxSlug, BoxFit> {
  return {
    pregnancy_comfort: eligibleFor("pregnancy_comfort", p, rules.pregnancy_comfort, policy, rejectReason),
    blood_sugar: eligibleFor("blood_sugar", p, rules.blood_sugar, policy, rejectReason),
    heart: eligibleFor("heart", p, rules.heart, policy, rejectReason),
  };
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
    if (snack.status !== "Approved") why.push(`${snack.status}, not clinician-approved`);
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
  checks.push(check("costed", "Picks with no cost", count((x) => x.unitCostCents === null), { max: 0 }));
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
  checks.push(check("approved", "Picks not yet approved (clinical review)", count((x) => x.status !== "Approved"), { max: 0 }, "warn"));
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

  if (slug === "pregnancy_comfort") {
    checks.push(check("caffeine", "Picks without caffeine disclosed", count((x) => !num(x.caffeine_mg)), { max: 0 }));
  }

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
  if (rules.highSodiumMax !== null)
    checks.push(check("sodium", "Higher-sodium picks (>300 mg)", count(highSodium), { max: rules.highSodiumMax }));
  if (rules.treatMax !== null) checks.push(check("treats", "Controlled treats", count(heartTreat), { max: rules.treatMax }));

  checks.push(info("treenuts", "Picks containing tree nuts", `${count((x) => x.freeFrom.tree_nut_free === false)}`));
  checks.push(info("peanuts", "Picks containing peanuts", `${count((x) => x.freeFrom.peanut_free === false)}`));
  if (slug === "blood_sugar")
    checks.push(info("carbs", "Total carbs across the box", `${s.reduce((t, x) => t + (x.carbs_g ?? 0), 0)} g`));

  return checks;
}

export const blockingFailures = (checks: Check[]) => checks.filter((c) => c.level === "block" && !c.pass);
export const isReady = (checks: Check[]) => blockingFailures(checks).length === 0;
