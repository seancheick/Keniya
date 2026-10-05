// Combine barcode lookups: USDA (manufacturer label) wins; Open Food Facts fills the gaps.
import type { OffDraft } from "./openfoodfacts";

export type LookupDraft = OffDraft & {
  /** "USDA", "Open Food Facts", or "USDA + Open Food Facts". */
  source: string;
  /** Fields that came from Open Food Facts when USDA was the base (verify these first). */
  fromOff: string[];
};

export function mergeDrafts(usda: OffDraft | null, off: OffDraft | null): LookupDraft | null {
  if (!usda && !off) return null;
  if (!usda) return { ...off!, source: "Open Food Facts", fromOff: [] };
  if (!off) return { ...usda, source: "USDA", fromOff: [] };
  const fromOff: string[] = [];
  const nutrition = { ...usda.nutrition };
  for (const [k, v] of Object.entries(off.nutrition) as [keyof typeof nutrition, number | null][]) {
    if ((nutrition[k] === null || nutrition[k] === undefined) && v !== null && v !== undefined) {
      nutrition[k] = v;
      fromOff.push(k);
    }
  }
  const take = <K extends "name" | "brand" | "unit_wt_oz" | "ingredients" | "allergens" | "imageUrl" | "serving">(k: K) => {
    if (usda[k] !== null && usda[k] !== undefined) return usda[k];
    if (off[k] !== null && off[k] !== undefined) fromOff.push(k);
    return off[k];
  };
  return {
    ...usda,
    name: take("name"),
    brand: take("brand"),
    unit_wt_oz: take("unit_wt_oz"),
    ingredients: take("ingredients"),
    allergens: take("allergens"),
    imageUrl: take("imageUrl"),
    serving: take("serving"),
    free_from: { ...off.free_from, ...usda.free_from },
    nutrition,
    scaled: usda.scaled || off.scaled,
    source: fromOff.length ? "USDA + Open Food Facts" : "USDA",
    fromOff,
  };
}
