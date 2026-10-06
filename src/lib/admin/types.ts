// Shared admin domain types and defaults. Pure (no server imports) so rules, costing and
// the optimizer run the same in server components, client forms and tests.
import { z } from "zod";

export const BOX_SLUGS = ["pregnancy_comfort", "blood_sugar", "heart"] as const;
export type BoxSlug = (typeof BOX_SLUGS)[number];
export const BOX_LABEL: Record<BoxSlug, string> = {
  pregnancy_comfort: "Pregnancy",
  blood_sugar: "Carb Conscious",
  heart: "Heart",
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
export const PREGNANCY_BLOCKING = ["P1", "P2", "P3", "P4", "P5", "P6", "P7a", "P7b", "P8", "P9"] as const;
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
  P9: "Expiry fits the 3-month ship + shelf window",
};
/** What each status means for a reviewer. */
export const STATUS_MEANING: Record<Status, string> = {
  Candidate: "Not reviewed yet, or waiting on a label check",
  "Pre-approved": "Passed the automated source and ingredient pre-screen; waiting for the clinician",
  Approved: "Approved by the clinician (or approved earlier in the workbook)",
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
});
export type Settings = z.infer<typeof settingsSchema>;

// Business costs are deliberately zero here (this repo is public): the workbook import or
// the Settings tab fills in the real numbers. Prices and public policy are not secret.
export const DEFAULT_SETTINGS: Settings = {
  prices: { pregnancy_comfort: 4700, blood_sugar: 4700, heart: 4700 },
  runSize: { pregnancy_comfort: 50, blood_sugar: 50, heart: 50 },
  shipping: {
    method: "table",
    flatCents: 0,
    customCents: { pregnancy_comfort: null, blood_sugar: null, heart: null },
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
};

/** Stored settings merged over defaults, so new fields never break an old row. */
export function resolveSettings(stored: unknown): Settings {
  const s = (stored && typeof stored === "object" ? stored : {}) as Partial<Settings>;
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
  };
  const parsed = settingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
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
  addedSugarMax: z.number().min(0).nullable().default(null),
  /** Added-sugar limit for controlled treats (CT role) instead of addedSugarMax. */
  treatAddedSugarMax: z.number().min(0).nullable().default(null),
  sodiumMax: z.number().min(0).nullable().default(null),
  satFatMax: z.number().min(0).nullable().default(null),
  /** Sat-fat limit for nut/seed picks whose fat is intrinsic (no added tropical or hydrogenated oils). */
  satFatNutMax: z.number().min(0).nullable().default(null),
  /** Caffeine per pack; unknown caffeine already fails Pregnancy. */
  caffeineMax: z.number().min(0).nullable().default(null),
});
export type BoxRules = z.infer<typeof boxRulesSchema>;

const none = {
  substantialMin: null,
  miniMax: null,
  beverageMax: null,
  proteinOrFiberMin: null,
  wholeFoodMin: null,
  nutSeedMin: null,
  fiberMin: null,
  treatMax: null,
  carbsMax: null,
  addedSugarMax: null,
  treatAddedSugarMax: null,
  sodiumMax: null,
  satFatMax: null,
  satFatNutMax: null,
  caffeineMax: null,
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
      { name: "Hydration", min: 1, max: 2 },
      { name: "Savory", min: 1, max: 3 },
    ],
    substantialMin: 8,
    miniMax: 4,
    beverageMax: 2,
    // Keniya curation threshold, not a medical cutoff: ACOG advises under 200 mg caffeine per
    // day in pregnancy, so one pack stays well inside that. Chocolate (≤20 mg) passes.
    caffeineMax: 50,
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
    // Keniya standard (2026-10-06): ≤20 g total carbs (ADA snack examples use 15–20 g carbs
    // plus protein; ADA counts total carbs, not "net carbs") and ≤5 g added sugar per pack.
    carbsMax: 20,
    addedSugarMax: 5,
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
    addedSugarMax: 5,
    treatAddedSugarMax: 8,
    satFatMax: 2,
    satFatNutMax: 4,
  },
};

export function resolveBoxRules(slug: BoxSlug, stored: unknown): BoxRules {
  const parsed = boxRulesSchema.safeParse({ ...DEFAULT_BOX_RULES[slug], ...(stored as object) });
  return parsed.success ? parsed.data : DEFAULT_BOX_RULES[slug];
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
