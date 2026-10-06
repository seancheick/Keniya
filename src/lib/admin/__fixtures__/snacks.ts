// Test fixtures: public label nutrition for real snack types; costs and stock are synthetic.
import { DEFAULT_SETTINGS, type Settings, type Snack } from "../types";

const pass = { P1: "PASS", P2: "PASS", P3: "PASS", P4: "PASS", P5: "PASS", P6: "PASS", P7a: "PASS", P7b: "PASS", P8: "PASS" };

let n = 0;
export function snack(over: Partial<Snack> = {}): Snack {
  n += 1;
  return {
    id: `id-${n}`,
    code: `T${String(n).padStart(3, "0")}`,
    name: `Snack ${n}`,
    brand: null,
    type: "Substantial",
    form: "Solid",
    status: "Approved",
    rejectReason: null,
    categories: [],
    calories: 150,
    protein_g: 6,
    fiber_g: 3,
    carbs_g: 12,
    added_sugar_g: 2,
    sodium_mg: 120,
    caffeine_mg: 0,
    sat_fat_g: 1,
    sugar_alcohols_g: 0,
    unit_wt_oz: 1,
    pregnancy_checks: { ...pass },
    roles: {},
    allergens: "None",
    ingredients: "Almonds",
    freeFrom: {},
    unitCostCents: 80,
    retailCents: 150,
    onHand: 100,
    earliestExpiry: null,
    loveRate: null,
    clinicianApprovedBy: "Laurie Pham",
    clinicalDecision: "approved",
    approvalRole: "clinician",
    diligenceComplete: true,
    packageVerified: true,
    ...over,
  };
}

/** Workbook P001: Angie's BOOMCHICKAPOP Sea Salt 1.25 oz (whole grain). */
export const popcorn = () =>
  snack({
    name: "Sea salt popcorn 1.25 oz",
    calories: 190, protein_g: 2, fiber_g: 3, carbs_g: 19, added_sugar_g: 0, sodium_mg: 190, caffeine_mg: 0,
    unit_wt_oz: 1.25, roles: { WG: true }, categories: ["Savory", "Comfort"],
  });

/** Ginger chews: 9 g added sugar, low sodium. v2 let this into Heart via low sodium alone. */
export const gingerChews = () =>
  snack({
    name: "Ginger chews", type: "Mini",
    calories: 60, protein_g: 0, fiber_g: 0, carbs_g: 14, added_sugar_g: 9, sodium_mg: 0, caffeine_mg: 0,
    unit_wt_oz: 0.5, categories: ["Comfort"],
  });

export const settings: Settings = {
  ...DEFAULT_SETTINGS,
  shipping: { ...DEFAULT_SETTINGS.shipping, table: [{ fromOz: 0, cents: 600 }, { fromOz: 16, cents: 800 }, { fromOz: 32, cents: 950 }] },
  packaging: [{ name: "Card", cents: 35, weightOz: 0 }],
  overheads: [{ name: "Pick / pack labor", cents: 150 }],
  wastePct: 0.03,
};
