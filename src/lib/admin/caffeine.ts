// Caffeine per pack when the label doesn't print it (most snacks don't). Owner decision
// 2026-10-17, pending clinician confirmation:
//   - label value always wins;
//   - no caffeine-bearing ingredient → 0;
//   - cocoa/chocolate → a screening estimate: the whole pack counted as dark chocolate
//     (USDA SR Legacy 170273: ~80 mg/100 g) or as cocoa powder (~230 mg/100 g) when cocoa
//     powder is listed. Conservative for most snacks, but not a guaranteed maximum (cacao
//     content varies), so it is never shown as a label value and an estimate using more than
//     half the per-pack limit waits for the manufacturer's number (rules.ts gateFailures);
//   - coffee, tea leaf, matcha, guarana… with no label value stays unknown (a person must find it).
import { hasFinding, screenIngredients } from "./ingredients";

export const G_PER_OZ = 28.3495;
/** mg caffeine per gram (USDA): dark chocolate 70–85% cacao, unsweetened cocoa powder. */
export const DARK_CHOCOLATE_MG_PER_G = 0.8;
export const COCOA_POWDER_MG_PER_G = 2.3;

export type CaffeineSource = "label" | "none_present" | "estimate_max";
export type ResolvedCaffeine = { mg: number | null; source: CaffeineSource | null; note: string };

const COCOA_POWDER = /\b(cocoa|cacao)\s+(powder|processed with alkali)\b|\bdutch(ed)?[- ]process/i;

export function resolveCaffeine(input: {
  labelMg: number | null | undefined;
  ingredients: string | null | undefined;
  unitOz: number | null | undefined;
}): ResolvedCaffeine {
  if (typeof input.labelMg === "number" && Number.isFinite(input.labelMg) && input.labelMg >= 0)
    return { mg: input.labelMg, source: "label", note: "From the label or manufacturer" };
  const ingredients = input.ingredients?.trim();
  // Without an ingredient list nothing can be inferred.
  if (!ingredients) return { mg: null, source: null, note: "Needs the ingredient list (or a label value)" };
  const findings = screenIngredients(ingredients);
  if (hasFinding(findings, "caffeine_source"))
    return { mg: null, source: null, note: "Contains coffee/tea/guarana: enter caffeine from the label or manufacturer" };
  if (!hasFinding(findings, "cocoa")) return { mg: 0, source: "none_present", note: "No caffeine-bearing ingredient" };
  const grams = typeof input.unitOz === "number" && input.unitOz > 0 ? input.unitOz * G_PER_OZ : null;
  if (grams === null) return { mg: null, source: null, note: "Contains cocoa: needs the pack weight to estimate caffeine" };
  const powder = COCOA_POWDER.test(ingredients);
  const rate = powder ? COCOA_POWDER_MG_PER_G : DARK_CHOCOLATE_MG_PER_G;
  return {
    mg: Math.ceil(grams * rate),
    source: "estimate_max",
    note: `Screening estimate, not a label value: whole ${Math.round(grams)} g pack counted as ${powder ? "cocoa powder" : "dark chocolate"} (${rate} mg/g, USDA)`,
  };
}

/** Caffeine the rules should use: the stored value, or the inferred one when it's blank. */
export const effectiveCaffeine = (p: { caffeine_mg: number | null; ingredients?: string | null; unit_wt_oz: number | null }) =>
  resolveCaffeine({ labelMg: p.caffeine_mg, ingredients: p.ingredients, unitOz: p.unit_wt_oz }).mg;

/** Caffeine for display: "12" from the label, "0 (no source)", "~12 (screening est.)", or null when unknown. */
export function caffeineDisplay(p: { caffeine_mg: number | null; ingredients?: string | null; unit_wt_oz: number | null }): string | null {
  const r = resolveCaffeine({ labelMg: p.caffeine_mg, ingredients: p.ingredients, unitOz: p.unit_wt_oz });
  if (r.mg === null) return null;
  return r.source === "estimate_max" ? `~${r.mg} (screening est.)` : r.source === "none_present" ? `0 (no source)` : String(r.mg);
}
