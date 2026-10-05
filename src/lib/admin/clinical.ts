// Clinician review sheet: one row per product with the label data and every rule decision,
// so a reviewer can audit box fit without the admin. No costs or vendors (not theirs to audit).
import { fitFor } from "./rules";
import {
  BOX_LABEL,
  BOX_SLUGS,
  FREE_FROM_KEYS,
  PREGNANCY_CHECK_KEYS,
  ROLE_KEYS,
  ROLE_LABEL,
  type BoxSlug,
  type Snack,
} from "./types";

export type ClinicalExtra = {
  upc: string | null;
  form: string;
  shelfLife: string | null;
  ingredients: string | null;
  nutritionSource: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string | null;
};

const yn = (v: boolean | undefined) => (v === true ? "yes" : v === false ? "no" : "unknown");
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export function clinicalReviewRows(
  snacks: Snack[],
  extra: (id: string) => ClinicalExtra | undefined,
  inLineup: (id: string) => BoxSlug[],
): Record<string, unknown>[] {
  return snacks.map((s) => {
    const x = extra(s.id);
    const row: Record<string, unknown> = {
      Code: s.code,
      Product: s.name,
      Brand: s.brand,
      UPC: x?.upc,
      Status: s.status,
      "Reject reason": s.rejectReason,
      "Reviewed by": x?.reviewedBy,
      "Reviewed on": day(x?.reviewedAt ?? null),
      Type: s.type,
      Form: x?.form,
      Categories: s.categories.join("; "),
      "In active box lineup": inLineup(s.id).map((b) => BOX_LABEL[b]).join("; "),
      "Serving weight (oz)": s.unit_wt_oz,
      Calories: s.calories,
      "Protein (g)": s.protein_g,
      "Fiber (g)": s.fiber_g,
      "Total carbs (g)": s.carbs_g,
      "Added sugar (g)": s.added_sugar_g,
      "Sodium (mg)": s.sodium_mg,
      "Caffeine (mg)": s.caffeine_mg,
      "Saturated fat (g)": s.sat_fat_g,
      "Sugar alcohols (g)": s.sugar_alcohols_g,
      Allergens: s.allergens,
      Ingredients: x?.ingredients,
      "Shelf life": x?.shelfLife,
      "Nutrition source": x?.nutritionSource,
      "Nutrition verified on": day(x?.verifiedAt ?? null),
      "Nutrition verified by": x?.verifiedBy,
    };
    for (const k of FREE_FROM_KEYS) row[k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())] = yn(s.freeFrom[k]);
    for (const k of PREGNANCY_CHECK_KEYS) row[k === "P7c" ? "P7c (info only)" : k] = s.pregnancy_checks[k] ?? "";
    // Roles are reviewer tick-boxes: unticked means "not marked", not unknown data.
    for (const k of ROLE_KEYS) row[`Role: ${ROLE_LABEL[k]}`] = s.roles[k] ? "yes" : "";
    for (const b of BOX_SLUGS) {
      const f = fitFor(b, s, s.rejectReason);
      row[`Fits ${BOX_LABEL[b]}`] = f.fits ? "yes" : "no";
      row[`${BOX_LABEL[b]}: why`] = f.fits ? f.via.join("; ") : f.reasons.join("; ");
    }
    row.Notes = x?.notes;
    row["Clinician verdict (OK / change / reject)"] = "";
    row["Clinician comments"] = "";
    return row;
  });
}
