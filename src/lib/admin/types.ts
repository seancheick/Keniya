import type { Finding, Resolution } from "./ingredients";
// Shared admin domain types and defaults. Pure (no server imports) so rules, costing and
// the optimizer run the same in server components, client forms and tests.
import { z } from "zod";

export const BOX_SLUGS = ["pregnancy_comfort", "blood_sugar", "heart", "gestational_diabetes", "glp1", "postpartum"] as const;
export type BoxSlug = (typeof BOX_SLUGS)[number];
export const BOX_LABEL: Record<BoxSlug, string> = {
  pregnancy_comfort: "Pregnancy",
  blood_sugar: "Blood Sugar",
  heart: "Heart",
  gestational_diabetes: "Gestational Diabetes",
  glp1: "GLP-1",
  postpartum: "Postpartum",
};
/** Column-width labels for tables and chips. */
export const BOX_SHORT: Record<BoxSlug, string> = {
  pregnancy_comfort: "Preg",
  blood_sugar: "Sugar",
  heart: "Heart",
  gestational_diabetes: "GDM",
  glp1: "GLP-1",
  postpartum: "Post",
};
export const isBoxSlug = (v: unknown): v is BoxSlug => BOX_SLUGS.includes(v as BoxSlug);

export const PRODUCT_TYPES = ["Substantial", "Mini", "Beverage"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];
export const FORMS = ["Solid", "Powder", "Tea", "Spread", "Puree", "Liquid"] as const;
export type Form = (typeof FORMS)[number];
/** "Pre-approved" = passed the automated source/ingredient pre-screen; only "Approved" is clinician-approved. */
export const STATUSES = ["Candidate", "Pre-approved", "Approved", "Rejected", "Retired"] as const;
export type Status = (typeof STATUSES)[number];
/** Shared category vocabulary (from the workbook's Slots). Box rules pick from these. */
export const CATEGORIES = ["Comfort", "Protein", "Sweet", "Savory", "Hydration"] as const;
export const NUTRITION_SOURCES = ["Package label", "Manufacturer", "Retailer", "USDA", "Open Food Facts", "Manual"] as const;

/** Pregnancy checks that must all be PASS. P7c is information only and never blocks. */
/**
 * Product-level checks that must all be PASS. P9 (expiry) is not one of them: a product has no
 * expiry, a purchased lot does. It is recorded at the package check and enforced per lot
 * (≥90 days, lotHold in stock.ts) at receiving and packing, so it never decides eligibility.
 */
export const PREGNANCY_BLOCKING = ["P1", "P2", "P3", "P4", "P5", "P6", "P7a", "P7b", "P8"] as const;
export const PREGNANCY_CHECK_KEYS = [...PREGNANCY_BLOCKING, "P7c"] as const;
/** Keniya Pregnancy Standard P1–P9 (revised v3, original box-builder workbook). */
export const PREGNANCY_CHECK_LABEL: Record<(typeof PREGNANCY_CHECK_KEYS)[number], string> = {
  P1: "Pasteurized or fully cooked",
  P2: "No pregnancy no-gos (raw dairy/eggs/fish, deli meat, high-mercury fish, raw sprouts, alcohol, liver)",
  P3: "Caffeine checked and shown per serving (caffeine-free preferred, except incidental chocolate)",
  P4: "Added sugar shown",
  P5: "Sodium shown",
  P6: "Allergens identified",
  P7a: "No ingredient with an established pregnancy concern (watchlist, e.g. saccharin, licorice root, sage)",
  P7b: "Keniya brand preference (e.g. no erythritol or sugar alcohols); never framed as unsafe",
  P7c: "Customer-preference flag (e.g. stevia, sweeteners); information only, never blocks",
  P8: "Honest single-serve count (one pack = one snack)",
};
/** What each status means for a reviewer. */
export const STATUS_MEANING: Record<Status, string> = {
  Candidate: "Not reviewed yet, or waiting on a label check",
  "Pre-approved": "Internal diligence complete; waiting for authenticated PharmaGuide Team approval",
  Approved: "Authenticated PharmaGuide Team approval of the current formula; legacy workbook approval needs re-attestation",
  Rejected: "Not used; reason given",
  Retired: "No longer sold or used",
};

/** Judged roles (reviewer's call, not computed). */
export const ROLE_KEYS = ["UF", "NS", "WG", "MF", "CT", "WHOLE_FOOD"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];
export const ROLE_LABEL: Record<RoleKey, string> = {
  UF: "Unsaturated fat",
  NS: "Nut / seed",
  WG: "Whole grain",
  MF: "Minimally processed fruit",
  CT: "Controlled treat",
  WHOLE_FOOD: "Whole-food fat/protein",
};

export const FREE_FROM_KEYS = [
  "vegan",
  "gluten_free",
  "dairy_free",
  "peanut_free",
  "tree_nut_free",
  "soy_free",
] as const;
export type FreeFromKey = (typeof FREE_FROM_KEYS)[number];

export const NUTRIENT_KEYS = [
  "calories",
  "protein_g",
  "fiber_g",
  "carbs_g",
  "added_sugar_g",
  "sodium_mg",
  "caffeine_mg",
  "sat_fat_g",
  "sugar_alcohols_g",
] as const;
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export type Nutrition = Record<NutrientKey, number | null>;

/** The parts of a product + its current version that eligibility depends on. */
export type RuleInput = Nutrition & {
  type: ProductType;
  form: Form;
  status: Status;
  unit_wt_oz: number | null;
  pregnancy_checks: Record<string, string | undefined>;
  roles: Partial<Record<RoleKey, boolean>>;
  /** Label ingredient list; the nut/seed saturated-fat exception checks it for added tropical oils. */
  ingredients?: string | null;
  /** Label allergen statement; its presence satisfies the data check P6. */
  allergens?: string | null;
  /** Ingredient findings incl. the database watchlist (computed at load); built-in rules when absent. */
  findings?: Finding[];
  /** Recorded decisions on findings for this version (clinician for safety, admin for brand). */
  resolutions?: Resolution[];
};

/** A product as the builder, optimizer and dashboards see it. */
export type Snack = RuleInput & {
  id: string;
  code: string;
  name: string;
  brand: string | null;
  categories: string[];
  rejectReason: string | null;
  allergens: string | null;
  ingredients?: string | null;
  freeFrom: Partial<Record<FreeFromKey, boolean>>;
  /** Effective unit cost in cents (fractional), null when nothing is known. */
  unitCostCents: number | null;
  retailCents: number | null;
  /** Current-formula units with at least 90 days left (physical held stock stays in lots). */
  onHand: number;
  /** Earliest expiry among packable lots (ISO date), null when none recorded. */
  earliestExpiry: string | null;
  /** Share of ratings that were "loved" (Phase 6); null when unrated. */
  loveRate: number | null;
  /** Who made the clinician decision; null for legacy workbook approvals (need re-attestation). */
  clinicianApprovedBy?: string | null;
  clinicalDecision?: "pending" | "approved" | "rejected" | "changes_requested";
  approvalRole?: string | null;
  diligenceComplete?: boolean;
  /** UPC on file and the label checked with the package in hand. */
  packageVerified?: boolean;
};

// ---------------------------------------------------------------- settings
const cents = z.number().int().min(0);
const lineItem = z.object({ name: z.string().min(1).max(60), cents, weightOz: z.number().min(0).default(0) });

export const settingsSchema = z.object({
  prices: z.record(z.enum(BOX_SLUGS), cents),
  runSize: z.record(z.enum(BOX_SLUGS), z.number().int().min(0)),
  shipping: z.object({
    method: z.enum(["table", "flat", "custom"]),
    flatCents: cents,
    customCents: z.record(z.enum(BOX_SLUGS), cents.nullable()),
    varianceCents: cents,
    /** Estimate brackets: rate applies from `fromOz` up to the next bracket. */
    table: z.array(z.object({ fromOz: z.number().min(0), cents })),
    defaultCarrier: z.string().max(40),
    defaultService: z.string().max(60),
  }),
  /** Per-box packaging besides the mailer (the mailer lives on the package profile). */
  packaging: z.array(lineItem),
  /** Per-box overheads: labor, inbound freight, storage, refund reserve, CAC, promo… */
  overheads: z.array(lineItem.omit({ weightOz: true })),
  fees: z.object({ pct: z.number().min(0).max(0.2), fixedCents: cents }),
  wastePct: z.number().min(0).max(0.5),
  purchaseBufferPct: z.number().min(0).max(1),
  policy: z.object({
    allowedForms: z.array(z.enum(FORMS)),
    maxItemOz: z.number().positive(),
    maxBoxOz: z.number().positive(),
  }),
  expiryTiersDays: z.tuple([z.number().int(), z.number().int(), z.number().int()]),
  /** Lineup value targets (warnings only, never block): shelf value of the picks and their snack cost. null = off. */
  value: z.object({ minRetailCents: cents.nullable(), maxSnackCostCents: cents.nullable() }),
  /** Customer offers. Each is off until switched on here; the site shows only what is on. */
  offers: z.object({
    /** First-order discount (WELCOME20): one-time boxes and gifts, never subscriptions, one per buyer email. */
    welcome: z.object({
      enabled: z.boolean(),
      code: z.string().regex(/^[A-Z0-9]{3,24}$/),
      percentOff: z.number().int().min(1).max(50),
      /** Launch cap across all buyers (the Stripe coupon's max redemptions); null = no cap. */
      limit: z.number().int().min(1).nullable(),
    }),
    /** A small surprise packed into the first `limit` paid one-time orders (real orders, real stock). */
    foundingBonus: z.object({
      enabled: z.boolean(),
      limit: z.number().int().min(0),
      description: z.string().max(120),
    }),
    /** Monthly Snack Club. Built, but off until the margin and fulfillment are confirmed. */
    subscription: z.object({ enabled: z.boolean(), priceCents: cents }),
  }),
});
export type Settings = z.infer<typeof settingsSchema>;

// Business costs are deliberately zero here (this repo is public): the workbook import or
// the Settings tab fills in the real numbers. Prices and public policy are not secret.
export const DEFAULT_SETTINGS: Settings = {
  prices: { pregnancy_comfort: 4700, blood_sugar: 4700, heart: 4700, gestational_diabetes: 4700, glp1: 4700, postpartum: 4700 },
  // Founding run per box: the first three at 50, the new boxes smaller until they prove out.
  runSize: { pregnancy_comfort: 50, blood_sugar: 50, heart: 50, gestational_diabetes: 20, glp1: 20, postpartum: 20 },
  shipping: {
    method: "table",
    flatCents: 0,
    customCents: { pregnancy_comfort: null, blood_sugar: null, heart: null, gestational_diabetes: null, glp1: null, postpartum: null },
    varianceCents: 0,
    table: [{ fromOz: 0, cents: 0 }],
    defaultCarrier: "USPS",
    defaultService: "Ground Advantage",
  },
  packaging: [
    { name: "Packed for You card", cents: 0, weightOz: 0 },
    { name: "Gift note (blended)", cents: 0, weightOz: 0 },
    { name: "Filler / tissue", cents: 0, weightOz: 0 },
    { name: "Sticker", cents: 0, weightOz: 0 },
  ],
  overheads: [
    { name: "Pick / pack labor", cents: 0 },
    { name: "Receiving labor", cents: 0 },
    { name: "Inbound freight", cents: 0 },
    { name: "Storage", cents: 0 },
    { name: "Refund reserve", cents: 0 },
    { name: "Marketing / CAC", cents: 0 },
    { name: "Discount / promo", cents: 0 },
  ],
  fees: { pct: 0.029, fixedCents: 30 },
  wastePct: 0,
  purchaseBufferPct: 0.05,
  policy: {
    allowedForms: ["Solid", "Powder", "Tea", "Spread", "Puree"],
    maxItemOz: 3.5,
    maxBoxOz: 32,
  },
  expiryTiersDays: [30, 60, 90],
  // A $47 box should hold snacks worth at least ~$40 at a store. The cost ceiling is a
  // business number, so it stays off here (public repo) and is set on the Settings tab.
  value: { minRetailCents: 4000, maxSnackCostCents: null },
  offers: {
    welcome: { enabled: false, code: "WELCOME20", percentOff: 20, limit: 100 },
    foundingBonus: { enabled: false, limit: 100, description: "A little founding-customer surprise" },
    subscription: { enabled: false, priceCents: 3900 },
  },
};

/** Stored settings merged over defaults, so new fields never break an old row. */
export function resolveSettings(stored: unknown): Settings {
  if (stored !== undefined && (stored === null || typeof stored !== "object" || Array.isArray(stored))) throw new Error("Invalid live settings");
  const s = (stored ?? {}) as Partial<Settings>;
  const merged = {
    ...DEFAULT_SETTINGS,
    ...s,
    prices: { ...DEFAULT_SETTINGS.prices, ...s.prices },
    runSize: { ...DEFAULT_SETTINGS.runSize, ...s.runSize },
    shipping: {
      ...DEFAULT_SETTINGS.shipping,
      ...s.shipping,
      customCents: { ...DEFAULT_SETTINGS.shipping.customCents, ...s.shipping?.customCents },
    },
    fees: { ...DEFAULT_SETTINGS.fees, ...s.fees },
    policy: { ...DEFAULT_SETTINGS.policy, ...s.policy },
    value: { ...DEFAULT_SETTINGS.value, ...s.value },
    offers: {
      welcome: { ...DEFAULT_SETTINGS.offers.welcome, ...s.offers?.welcome },
      foundingBonus: { ...DEFAULT_SETTINGS.offers.foundingBonus, ...s.offers?.foundingBonus },
      subscription: { ...DEFAULT_SETTINGS.offers.subscription, ...s.offers?.subscription },
    },
  };
  const parsed = settingsSchema.safeParse(merged);
  if (!parsed.success) throw new Error("Invalid live settings");
  return parsed.data;
}

// ---------------------------------------------------------------- box rules
export const boxRulesSchema = z.object({
  total: z.number().int().min(1).max(30),
  categories: z.array(
    z.object({ name: z.string().min(1).max(40), min: z.number().int().min(0), max: z.number().int().min(0) }),
  ),
  substantialMin: z.number().int().min(0).nullable(),
  miniMax: z.number().int().min(0).nullable(),
  beverageMax: z.number().int().min(0).nullable(),
  /** Carb Conscious: protein- or fiber-forward picks. */
  proteinOrFiberMin: z.number().int().min(0).nullable(),
  /** Carb Conscious: whole-food fat/protein picks. */
  wholeFoodMin: z.number().int().min(0).nullable(),
  /** Heart: nut / seed / unsaturated-fat picks. */
  nutSeedMin: z.number().int().min(0).nullable(),
  /** Heart: fiber-forward (≥3 g) picks. */
  fiberMin: z.number().int().min(0).nullable(),
  /** Treats: controlled treats (Heart: CT role; Blood Sugar: picks that qualify only as a portioned treat). */
  treatMax: z.number().int().min(0).nullable(),
  // Hard limits every pick must meet before any pathway counts (null = no limit).
  carbsMax: z.number().min(0).nullable().default(null),
  /** Separate total-carb ceiling for hydration sticks; null uses the normal pack ceiling. */
  beverageCarbsMax: z.number().min(0).nullable().default(null),
  beverageAddedSugarMax: z.number().min(0).nullable().default(null),
  addedSugarMax: z.number().min(0).nullable().default(null),
  /** Added-sugar limit for treats instead of addedSugarMax (Heart: CT role; Blood Sugar/GDM: treat-only picks). */
  treatAddedSugarMax: z.number().min(0).nullable().default(null),
  sodiumMax: z.number().min(0).nullable().default(null),
  satFatMax: z.number().min(0).nullable().default(null),
  /** Sat-fat limit for nut/seed picks whose fat is intrinsic (no added tropical or hydrogenated oils). */
  satFatNutMax: z.number().min(0).nullable().default(null),
  /** Caffeine per pack; unknown caffeine already fails Pregnancy. */
  caffeineMax: z.number().min(0).nullable().default(null),
  /** Total caffeine across the whole box (inferred values count; warning, not a block). */
  boxCaffeineMax: z.number().min(0).nullable().default(null),
  /** Cocoa/chocolate picks per box (dark chocolate carries lead and cadmium; warning). */
  chocolateMax: z.number().int().min(0).nullable().default(null),
  /**
   * Internal high-fiber review only, never eligibility: a pick failing nothing but the total-carb
   * limit is listed for review when net carbs (total − fiber) ≤ this and total ≤ carbsReviewCeiling.
   */
  netCarbsReviewMax: z.number().min(0).nullable().default(null),
  carbsReviewCeiling: z.number().min(0).nullable().default(null),
  /**
   * Little extras (drink sticks, tea, a sample) packed on top of `total` and never counted in
   * it. null = extras optional and not promised; set both to promise "14 snacks + 2–4 extras".
   */
  extrasMin: z.number().int().min(0).nullable().default(null),
  extrasMax: z.number().int().min(0).nullable().default(null),
});
export type BoxRules = z.infer<typeof boxRulesSchema>;

const none = {
  extrasMin: null,
  extrasMax: null,
  substantialMin: null,
  miniMax: null,
  beverageMax: null,
  proteinOrFiberMin: null,
  wholeFoodMin: null,
  nutSeedMin: null,
  fiberMin: null,
  treatMax: null,
  carbsMax: null,
  beverageCarbsMax: null,
  beverageAddedSugarMax: null,
  addedSugarMax: null,
  treatAddedSugarMax: null,
  netCarbsReviewMax: null,
  carbsReviewCeiling: null,
  sodiumMax: null,
  satFatMax: null,
  satFatNutMax: null,
  caffeineMax: null,
  boxCaffeineMax: null,
  chocolateMax: null,
};

/** Starting rules (workbook v4 + v3.1 proposals). Editable on the Boxes tab. */
export const DEFAULT_BOX_RULES: Record<BoxSlug, BoxRules> = {
  pregnancy_comfort: {
    ...none,
    total: 14,
    categories: [
      { name: "Comfort", min: 3, max: 5 },
      { name: "Protein", min: 2, max: 4 },
      { name: "Sweet", min: 2, max: 4 },
      // Two sips, as the public card promises; a second hydration product also removes the
      // single point of failure the feasibility check found.
      { name: "Hydration", min: 2, max: 2 },
      { name: "Savory", min: 1, max: 3 },
    ],
    substantialMin: 8,
    miniMax: 4,
    beverageMax: 2,
    // Keniya conservative per-pack cap, informed by ACOG's <200 mg/day pregnancy guidance.
    // Not an ACOG number: ACOG sets a daily total, Keniya chooses 50 mg per pack so one snack
    // never spends a large share of the day. Chocolate (≤20 mg) passes.
    caffeineMax: 50,
    // Founder-set 2026-10-17, pending clinician: the whole box ≤100 mg (half of ACOG's daily
    // 200 mg, spread over 14 snacks), and at most 4 chocolate picks (Consumer Reports found
    // lead/cadmium in dark chocolate; pregnancy is the most sensitive group).
    boxCaffeineMax: 100,
    chocolateMax: 4,
  },
  blood_sugar: {
    ...none,
    total: 14,
    categories: [
      { name: "Savory", min: 5, max: 8 },
      { name: "Protein", min: 2, max: 4 },
      { name: "Sweet", min: 2, max: 4 },
      { name: "Hydration", min: 0, max: 1 },
      { name: "Comfort", min: 0, max: 2 },
    ],
    proteinOrFiberMin: 5,
    wholeFoodMin: 2,
    // Picks that qualify only as a portioned treat (no protein/fiber/whole-food anchor).
    treatMax: 3,
    // Separate snack and hydration standards; zero added sugar is a preference, not a gate.
    carbsMax: 15,
    beverageCarbsMax: 3,
    addedSugarMax: 3,
    // Founder-set 2026-10-17, pending clinician: a treat (counted by treatMax) may carry up to
    // 5 g added sugar; core picks stay at 3 g. Without it the treat allowance held nothing.
    treatAddedSugarMax: 5,
    // Owner 2026-10-18: proposed dual limit for a future policy, review list only (ADA counts
    // total carbs; net carbs is not a standardized clinical measure).
    netCarbsReviewMax: 15,
    carbsReviewCeiling: 25,
  },
  heart: {
    ...none,
    total: 14,
    categories: [
      { name: "Savory", min: 4, max: 7 },
      { name: "Protein", min: 1, max: 3 },
      { name: "Sweet", min: 3, max: 5 },
      { name: "Comfort", min: 0, max: 2 },
      { name: "Hydration", min: 1, max: 2 },
    ],
    nutSeedMin: 4,
    fiberMin: 3,
    treatMax: 2,
    // Keniya Heart standard (2026-10-06, clinician-confirmed): sodium ≤140 mg per pack (FDA
    // "low sodium" / AHA snack guidance); sat fat ≤2 g, or ≤4 g when intrinsic to nuts/seeds
    // (AHA Heart-Check nut category); added sugar ≤5 g on core picks (FDA "healthy" range),
    // ≤8 g on a controlled treat.
    sodiumMax: 140,
    beverageAddedSugarMax: 0,
    addedSugarMax: 5,
    treatAddedSugarMax: 8,
    satFatMax: 2,
    satFatNutMax: 4,
  },
  // Pregnancy screening AND the Blood Sugar limits: a snack must pass both. ADA notes GDM
  // nutrition is individualized with a carbohydrate floor, so this is a screened snack
  // assortment, never a GDM diet.
  gestational_diabetes: {
    ...none,
    total: 14,
    categories: [
      { name: "Comfort", min: 2, max: 4 },
      { name: "Protein", min: 3, max: 5 },
      { name: "Savory", min: 3, max: 6 },
      { name: "Sweet", min: 2, max: 3 },
      { name: "Hydration", min: 2, max: 2 },
    ],
    substantialMin: 8,
    miniMax: 4,
    beverageMax: 2,
    proteinOrFiberMin: 5,
    treatMax: 2,
    carbsMax: 15,
    beverageCarbsMax: 3,
    addedSugarMax: 3,
    treatAddedSugarMax: 5,
    caffeineMax: 50,
    boxCaffeineMax: 100,
    chocolateMax: 4,
  },
  // 2025 joint GLP-1 nutrition guidance (ASN/OMA/TOS/ACLM): adequate protein, nutrient-dense,
  // smaller portions, hydration, GI-tolerable foods; ginger and peppermint for nausea.
  glp1: {
    ...none,
    total: 14,
    categories: [
      { name: "Protein", min: 5, max: 8 },
      { name: "Savory", min: 2, max: 5 },
      { name: "Comfort", min: 1, max: 3 },
      { name: "Sweet", min: 1, max: 2 },
      { name: "Hydration", min: 1, max: 3 },
    ],
    substantialMin: 6,
    beverageMax: 3,
    proteinOrFiberMin: 6,
    wholeFoodMin: 2,
    treatMax: 2,
    carbsMax: 20,
    // Review list only (see Blood Sugar). GDM has no exception: GDM nutrition therapy counts total carbs.
    netCarbsReviewMax: 20,
    carbsReviewCeiling: 25,
    beverageAddedSugarMax: 0,
    addedSugarMax: 5,
  },
  // Pregnancy food-safety checks still apply. Caffeine: Keniya per-pack cap of 100 mg,
  // informed by ACOG (about 200 mg/day while nursing is unlikely to affect the baby) and CDC
  // (≤300 mg/day is low-to-moderate). Those are daily totals; 100 mg per pack is Keniya's
  // own number, not an ACOG or CDC cutoff.
  postpartum: {
    ...none,
    total: 14,
    categories: [
      { name: "Comfort", min: 2, max: 4 },
      { name: "Protein", min: 3, max: 5 },
      { name: "Savory", min: 2, max: 4 },
      { name: "Sweet", min: 2, max: 4 },
      { name: "Hydration", min: 2, max: 3 },
    ],
    substantialMin: 8,
    miniMax: 4,
    beverageMax: 3,
    proteinOrFiberMin: 5,
    caffeineMax: 100,
    boxCaffeineMax: 150,
    chocolateMax: 4,
  },
};

export function resolveBoxRules(slug: BoxSlug, stored: unknown): BoxRules {
  if (stored !== undefined && (!stored || typeof stored !== "object" || Array.isArray(stored))) throw new Error(`Invalid live rules for ${slug}`);
  if (stored !== undefined && !boxRulesSchema.safeParse(stored).success) throw new Error(`Invalid live rules for ${slug}`);
  const parsed = boxRulesSchema.safeParse({ ...DEFAULT_BOX_RULES[slug], ...(stored as object) });
  if (!parsed.success) throw new Error(`Invalid live rules for ${slug}`);
  return parsed.data;
}

export const OBJECTIVES = ["balanced", "margin", "expiring", "overstock", "favorites"] as const;
export type Objective = (typeof OBJECTIVES)[number];
export const OBJECTIVE_LABEL: Record<Objective, string> = {
  balanced: "Keniya Recommended (balanced)",
  margin: "Best margin",
  expiring: "Use expiring inventory",
  overstock: "Use overstock",
  favorites: "Customer favorites",
};
