// Open Food Facts (https://world.openfoodfacts.org, ODbL) → a draft product. Community data:
// everything is marked source "Open Food Facts" and unverified until checked on the label.
import type { FreeFromKey, Nutrition } from "./types";

export type OffDraft = {
  upc: string;
  name: string | null;
  brand: string | null;
  nutrition: Partial<Nutrition>;
  unit_wt_oz: number | null;
  serving: string | null;
  ingredients: string | null;
  allergens: string | null;
  /** Only "contains" (false) is ever set from OFF; absence of a tag proves nothing. */
  free_from: Partial<Record<FreeFromKey, boolean>>;
  imageUrl: string | null;
  /** Nutrients OFF had only per 100 g, scaled to the serving. */
  scaled: boolean;
};

type Nutriments = Record<string, number | string | undefined>;
export type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  product_quantity?: number | string;
  nutriments?: Nutriments;
  ingredients_text?: string;
  ingredients_text_en?: string;
  allergens_tags?: string[];
  image_front_url?: string;
};

const G_PER_OZ = 28.3495;
const round = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
const toNum = (v: unknown) => (v === undefined || v === null || v === "" ? null : Number(v));

const CONTAINS: Record<string, FreeFromKey[]> = {
  "en:peanuts": ["peanut_free", "vegan"],
  "en:nuts": ["tree_nut_free"],
  "en:milk": ["dairy_free", "vegan"],
  "en:soybeans": ["soy_free"],
  "en:gluten": ["gluten_free"],
  "en:eggs": ["vegan"],
  "en:fish": ["vegan"],
  "en:crustaceans": ["vegan"],
  "en:molluscs": ["vegan"],
};

export function mapOffProduct(upc: string, p: OffProduct): OffDraft {
  const n = p.nutriments ?? {};
  const servingG = toNum(p.serving_quantity);
  let scaled = false;
  const per = (key: string): number | null => {
    const s = toNum(n[`${key}_serving`]);
    if (s !== null && Number.isFinite(s)) return s;
    const h = toNum(n[`${key}_100g`]);
    if (h !== null && Number.isFinite(h) && servingG) {
      scaled = true;
      return (h * servingG) / 100;
    }
    return null;
  };
  const g = (key: string) => {
    const v = per(key);
    return v === null ? null : round(v);
  };
  const sodiumG = per("sodium") ?? (per("salt") !== null ? per("salt")! / 2.5 : null);
  const caffeineG = per("caffeine");
  const tags = p.allergens_tags ?? [];
  const free_from: Partial<Record<FreeFromKey, boolean>> = {};
  for (const t of tags) for (const k of CONTAINS[t] ?? []) free_from[k] = false;
  const pkgG = toNum(p.product_quantity);

  return {
    upc,
    name: (p.product_name_en || p.product_name || "").trim() || null,
    brand: p.brands?.split(",")[0]?.trim() || null,
    nutrition: {
      calories: (() => {
        const v = per("energy-kcal");
        return v === null ? null : Math.round(v);
      })(),
      protein_g: g("proteins"),
      fiber_g: g("fiber"),
      carbs_g: g("carbohydrates"),
      // Never substitute total sugars: added sugar drives Carb/Heart fit.
      added_sugar_g: g("added-sugars"),
      sodium_mg: sodiumG === null ? null : Math.round(sodiumG * 1000),
      caffeine_mg: caffeineG === null ? null : Math.round(caffeineG * 1000),
      sat_fat_g: g("saturated-fat"),
    },
    unit_wt_oz: pkgG && pkgG > 0 ? round(pkgG / G_PER_OZ, 2) : null,
    serving: p.serving_size?.trim() || null,
    ingredients: (p.ingredients_text_en || p.ingredients_text || "").trim() || null,
    allergens: tags.length ? `Contains: ${tags.map((t) => t.replace(/^\w+:/, "").replace(/-/g, " ")).join(", ")} (Open Food Facts)` : null,
    free_from,
    imageUrl: p.image_front_url ?? null,
    scaled,
  };
}

export const OFF_FIELDS =
  "code,product_name,product_name_en,brands,serving_size,serving_quantity,product_quantity,nutriments,ingredients_text,ingredients_text_en,allergens_tags,image_front_url";
