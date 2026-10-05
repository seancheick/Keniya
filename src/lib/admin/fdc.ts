// USDA FoodData Central, Branded Foods (manufacturer-submitted label data, public domain).
// Search by UPC, then read the food's labelNutrients (per serving, as printed on the label).
import type { OffDraft } from "./openfoodfacts";

export type FdcLabelNutrients = Partial<Record<string, { value?: number }>>;
export type FdcFood = {
  fdcId: number;
  description?: string;
  gtinUpc?: string;
  brandOwner?: string;
  brandName?: string;
  ingredients?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  packageWeight?: string;
  labelNutrients?: FdcLabelNutrients;
  /** Per 100 g (search results) — used only when labelNutrients lacks a value. */
  foodNutrients?: { nutrientNumber?: string; nutrient?: { number?: string }; value?: number; amount?: number }[];
};

const G_PER_OZ = 28.3495;
const round = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
const title = (s?: string) => (s ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim() : null);

/** "1.25 oz/35 g" → 1.25 */
export function packageOz(pw?: string): number | null {
  if (!pw) return null;
  const oz = pw.match(/([\d.]+)\s*oz/i);
  if (oz) return round(Number(oz[1]), 2);
  const g = pw.match(/([\d.]+)\s*g\b/i);
  return g ? round(Number(g[1]) / G_PER_OZ, 2) : null;
}

const NUMBERS = { calories: "208", protein: "203", fiber: "291", carbs: "205", added: "539", sodium: "307", caffeine: "262", satfat: "606" };

export function mapFdcFood(upc: string, f: FdcFood): OffDraft {
  const label = f.labelNutrients ?? {};
  const grams = f.servingSizeUnit?.toLowerCase().startsWith("g") || f.servingSizeUnit?.toLowerCase() === "ml" ? f.servingSize : undefined;
  let scaled = false;
  const per100 = (num: string) => {
    const hit = f.foodNutrients?.find((n) => (n.nutrientNumber ?? n.nutrient?.number) === num);
    const v = hit?.value ?? hit?.amount;
    return typeof v === "number" ? v : null;
  };
  const pick = (labelKey: string, num: string, d = 1) => {
    const lv = label[labelKey]?.value;
    if (typeof lv === "number") return round(lv, d);
    const h = per100(num);
    if (h !== null && grams) {
      scaled = true;
      return round((h * grams) / 100, d);
    }
    return null;
  };
  return {
    upc,
    name: title(f.description),
    brand: title(f.brandName || f.brandOwner),
    nutrition: {
      calories: pick("calories", NUMBERS.calories, 0),
      protein_g: pick("protein", NUMBERS.protein),
      fiber_g: pick("fiber", NUMBERS.fiber),
      carbs_g: pick("carbohydrates", NUMBERS.carbs),
      added_sugar_g: pick("addedSugar", NUMBERS.added),
      sodium_mg: pick("sodium", NUMBERS.sodium, 0),
      caffeine_mg: pick("caffeine", NUMBERS.caffeine, 0),
      sat_fat_g: pick("saturatedFat", NUMBERS.satfat),
    },
    unit_wt_oz: packageOz(f.packageWeight),
    serving: f.householdServingFullText ?? (f.servingSize ? `${f.servingSize} ${f.servingSizeUnit ?? ""}`.trim() : null),
    ingredients: f.ingredients?.trim() || null,
    allergens: null,
    free_from: {},
    imageUrl: null,
    scaled,
  };
}

/** Same item regardless of UPC-A / EAN-13 leading zeros. */
export const sameUpc = (a?: string, b?: string) => Boolean(a && b) && a!.replace(/^0+/, "") === b!.replace(/^0+/, "");
