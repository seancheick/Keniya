// FormData → typed rows for products and versions. Shared by server actions and the
// client form's live fit preview, so both read the form the same way.
import { z } from "zod";
import {
  FORMS,
  FREE_FROM_KEYS,
  NUTRIENT_KEYS,
  PREGNANCY_CHECK_KEYS,
  PRODUCT_TYPES,
  ROLE_KEYS,
  type RuleInput,
} from "./types";

type FD = Pick<FormData, "get" | "getAll">;

const str = (fd: FD, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
export const numOrNull = (v: string | null | undefined) => {
  if (v === null || v === undefined || v.trim() === "") return null;
  const x = Number(v.replace(/[$,\s]/g, ""));
  return Number.isFinite(x) ? x : null;
};
/** "$11.99" / "11.99" → 1199 */
export const dollarsToCents = (v: string | null | undefined) => {
  const x = numOrNull(v);
  return x === null ? null : Math.round(x * 100);
};

/** Unit costs keep fractional cents: "$0.4996" → 49.96 */
export const dollarsToFractionalCents = (v: string | null | undefined) => {
  const x = numOrNull(v);
  return x === null ? null : Math.round(x * 1_000_000) / 10_000;
};

export const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  brand: z.string().max(120).nullable(),
  upc: z
    .string()
    .regex(/^[0-9]{6,14}$/, "UPC should be 6–14 digits")
    .nullable(),
  type: z.enum(PRODUCT_TYPES),
  form: z.enum(FORMS),
  categories: z.array(z.string().max(40)).max(10),
  url: z.string().max(500).nullable(),
  retail_cents: z.number().int().min(0).nullable(),
  estimate_cost_cents: z.number().min(0).nullable(),
  quote_cost_cents: z.number().min(0).nullable(),
  price_checked_on: z.string().nullable(),
  sensory: z.string().max(200).nullable(),
  notes: z.string().max(4000).nullable(),
});

export const versionSchema = z.object({
  calories: z.number().min(0).nullable(),
  protein_g: z.number().min(0).nullable(),
  fiber_g: z.number().min(0).nullable(),
  carbs_g: z.number().min(0).nullable(),
  added_sugar_g: z.number().min(0).nullable(),
  sodium_mg: z.number().min(0).nullable(),
  caffeine_mg: z.number().min(0).nullable(),
  sat_fat_g: z.number().min(0).nullable(),
  sugar_alcohols_g: z.number().min(0).nullable(),
  unit_wt_oz: z.number().min(0).nullable(),
  ingredients: z.string().max(4000).nullable(),
  allergens: z.string().max(500).nullable(),
  free_from: z.record(z.string(), z.boolean()),
  shelf_life: z.string().max(100).nullable(),
  pregnancy_checks: z.record(z.string(), z.string()),
  roles: z.record(z.string(), z.boolean()),
  nutrition_source: z.string().max(60).nullable(),
});

export function readProductForm(fd: FD) {
  const product = {
    name: str(fd, "name") ?? "",
    brand: str(fd, "brand"),
    upc: str(fd, "upc")?.replace(/\D/g, "") || null,
    type: (str(fd, "type") ?? "Substantial") as (typeof PRODUCT_TYPES)[number],
    form: (str(fd, "form") ?? "Solid") as (typeof FORMS)[number],
    categories: [...new Set(fd.getAll("categories").map(String).filter(Boolean))],
    url: str(fd, "url"),
    retail_cents: dollarsToCents(str(fd, "retail")),
    estimate_cost_cents: dollarsToFractionalCents(str(fd, "estimate")),
    quote_cost_cents: dollarsToFractionalCents(str(fd, "quote")),
    price_checked_on: str(fd, "price_checked_on"),
    sensory: str(fd, "sensory"),
    notes: str(fd, "notes"),
  };
  const nutrients = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, numOrNull(str(fd, k))])) as Record<
    (typeof NUTRIENT_KEYS)[number],
    number | null
  >;
  const version = {
    ...nutrients,
    unit_wt_oz: numOrNull(str(fd, "unit_wt_oz")),
    ingredients: str(fd, "ingredients"),
    allergens: str(fd, "allergens"),
    // Free-from is tri-state: "yes" / "no" / unknown (omitted).
    free_from: Object.fromEntries(
      FREE_FROM_KEYS.flatMap((k) => {
        const v = str(fd, `ff_${k}`);
        return v === "yes" ? [[k, true]] : v === "no" ? [[k, false]] : [];
      }),
    ),
    shelf_life: str(fd, "shelf_life"),
    pregnancy_checks: Object.fromEntries(
      PREGNANCY_CHECK_KEYS.flatMap((k) => {
        const v = str(fd, `pc_${k}`);
        return v ? [[k, v]] : [];
      }),
    ),
    roles: Object.fromEntries(ROLE_KEYS.flatMap((k) => (fd.get(`role_${k}`) ? [[k, true]] : []))),
    nutrition_source: str(fd, "nutrition_source"),
  };
  return { product, version };
}

/** What the rules engine needs, straight from the form (for the live preview). */
export function ruleInputFromForm(fd: FD, status: RuleInput["status"] = "Candidate"): RuleInput {
  const { product, version } = readProductForm(fd);
  return {
    ...version,
    type: product.type,
    form: product.form,
    status,
    pregnancy_checks: version.pregnancy_checks,
    roles: version.roles,
  };
}
