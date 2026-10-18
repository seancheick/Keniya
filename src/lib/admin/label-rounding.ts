// FDA Nutrition Facts rounding (21 CFR 101.9(c)). A printed label value always follows these
// steps, so a value that doesn't (99 cal, 12.9 g carbs) was calculated, usually scaled from
// per-100 g data, and must be replaced with the printed value before the package is verified.
// Values under 1 g may print as "less than 1 g"; 0 and 0.5 are accepted for those.
import type { Nutrition } from "./types";

const step = (v: number, s: number) => Math.abs(v / s - Math.round(v / s)) < 1e-9;

const RULES: [key: keyof Nutrition, label: string, unit: string, ok: (v: number) => boolean][] = [
  ["calories", "Calories", "", (v) => (v < 5 ? v === 0 : v <= 50 ? step(v, 5) : step(v, 10))],
  ["protein_g", "Protein", " g", gram],
  ["fiber_g", "Fiber", " g", gram],
  ["carbs_g", "Total carbs", " g", gram],
  ["added_sugar_g", "Added sugar", " g", gram],
  ["sat_fat_g", "Saturated fat", " g", (v) => (v < 0.5 ? v === 0 : v < 5 ? step(v, 0.5) : step(v, 1))],
  ["sodium_mg", "Sodium", " mg", (v) => (v < 5 ? v === 0 : v <= 140 ? step(v, 5) : step(v, 10))],
];

function gram(v: number) {
  return v < 1 ? v === 0 || v === 0.5 : step(v, 1);
}

/** Values that can't be a printed label value, e.g. "Calories 99", empty when all could be. */
export function labelRoundingIssues(n: Partial<Nutrition>): string[] {
  return RULES.flatMap(([k, label, unit, ok]) => {
    const v = n[k];
    return typeof v === "number" && !ok(v) ? [`${label} ${v}${unit}`] : [];
  });
}

export const derivedNutritionNote = (issues: string[]) =>
  `Looks calculated, not printed on the label (${issues.join(", ")}): enter the package's Nutrition Facts values.`;
