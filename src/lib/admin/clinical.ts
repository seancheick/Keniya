import { reviewTeamRow, reviewTeamText } from "./review-wording";
// Clinician review sheet: one row per product with the label data and every rule decision,
// so a reviewer can audit box fit without the admin. No costs or vendors (not theirs to audit).
import { fitFor, isClinicianApproved, type BoxFit } from "./rules";
import {
  BOX_LABEL,
  BOX_SLUGS,
  FREE_FROM_KEYS,
  PREGNANCY_CHECK_KEYS,
  PREGNANCY_CHECK_LABEL,
  ROLE_KEYS,
  ROLE_LABEL,
  type BoxSlug,
  type Snack,
} from "./types";

export type ClinicalExtra = {
  versionId?: string | null;
  upc: string | null;
  verifiedPackBarcode?: string | null;
  form: string;
  shelfLife: string | null;
  ingredients: string | null;
  nutritionSource: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  prescreenedBy?: string | null;
  prescreenedAt?: string | null;
  notes: string | null;
};

/** Last two rungs of the ladder: clinician approval (named) and package verification. */
function readyToPack(s: Snack, x: ClinicalExtra | undefined): string {
  const missing = [
    s.status !== "Approved" ? "PharmaGuide Team approval" : !isClinicianApproved(s) || !x?.reviewedBy?.trim() ? "PharmaGuide Team re-attestation" : null,
    !s.packageVerified ? "verified package identity and label" : null,
    !x?.verifiedAt ? "label checked in hand" : null,
  ].filter(Boolean);
  return missing.length ? `no: needs ${missing.join(", ")}` : "yes";
}

const yn = (v: boolean | undefined) => (v === true ? "yes" : v === false ? "no" : "unknown");
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

const PRESCREEN = /^\[Pre-screen[^\]]*\]\s*/;

/** The "[Pre-screen …]" verdict line at the top of a product's notes, split from the rest. */
export function splitNotes(notes: string | null | undefined): { prescreen: string; other: string } {
  const [first, ...rest] = (notes ?? "").split("\n");
  return PRESCREEN.test(first) ? { prescreen: reviewTeamText(first.replace(PRESCREEN, "")), other: reviewTeamText(rest.join("\n").trim()) } : { prescreen: "", other: reviewTeamText((notes ?? "").trim()) };
}

export const CLINICIAN_VERDICT = "PharmaGuide Team decision (OK / change / reject)";
export const CLINICIAN_COMMENTS = "PharmaGuide Team comments";
export const pCheckHeader = (k: (typeof PREGNANCY_CHECK_KEYS)[number]) => `${k} · ${PREGNANCY_CHECK_LABEL[k]}`;

/** Recommendations follow current evidence and eligibility, never imported verdict notes. */
export function reviewRecommendation(s: Snack, fits: boolean): string {
  if (s.status === "Rejected" || s.status === "Retired" || !fits) return "Do not approve for these boxes";
  if (!s.diligenceComplete) return "Hold — complete internal diligence";
  if (s.clinicalDecision === "changes_requested") return "Hold — resolve PharmaGuide Team changes";
  return isClinicianApproved(s) ? "Already approved by PharmaGuide Team" : "Recommend Approve — PharmaGuide Team decision required";
}

/** Diagnostics only: the database's diligence predicate remains the approval gate. */
export function reviewWorkRemaining(s: Snack, x: ClinicalExtra | undefined): string {
  const missing = [
    !x?.nutritionSource?.trim() && "label source",
    !x?.ingredients?.trim() && "ingredients",
    !s.allergens?.trim() && "allergen statement",
    !(typeof s.unit_wt_oz === "number" && s.unit_wt_oz > 0) && "pack weight",
    ...(["calories", "protein_g", "fiber_g", "carbs_g", "added_sugar_g", "sodium_mg", "sat_fat_g", "caffeine_mg"] as const)
      .filter((k) => typeof s[k] !== "number" || s[k]! < 0).map((k) => k.replaceAll("_", " ")),
    ...(["P1", "P2", "P3", "P4", "P5", "P6", "P7a", "P7b", "P8"] as const)
      .filter((k) => !["PASS", "FAIL"].includes(String(s.pregnancy_checks[k] ?? "").toUpperCase())).map((k) => `${k} screening decision`),
    String(s.pregnancy_checks.P8).toUpperCase() !== "PASS" && "manufacturer single-pack evidence",
    !s.diligenceComplete && "internal diligence sign-off",
  ].filter(Boolean);
  return missing.join("; ");
}

export function clinicalReviewRows(
  snacks: Snack[],
  extra: (id: string) => ClinicalExtra | undefined,
  inLineup: (id: string) => BoxSlug[],
  /** Final eligibility (qualifies + hard limits + policy + status). Defaults to the nutrition rules alone. */
  eligible: (slug: BoxSlug, s: Snack) => BoxFit = (slug, s) => fitFor(slug, s, s.rejectReason),
): Record<string, unknown>[] {
  return snacks.map((s) => {
    const x = extra(s.id);
    const notes = splitNotes(x?.notes);
    // Decision columns first, so the clinician sees what to check before the data.
    const row: Record<string, unknown> = {
      Code: s.code,
      Product: s.name,
      Brand: s.brand,
      Status: s.status,
      "Keniya recommendation": inLineup(s.id).length ? reviewRecommendation(s, inLineup(s.id).every((b) => eligible(b, s).fits)) : "Hold — no active box assignment",
      "Internal diligence": s.diligenceComplete ? "complete" : "incomplete",
      "Review work remaining": reviewWorkRemaining(s, x),
      "Historical pre-screen note (not a current decision)": notes.prescreen,
      [CLINICIAN_VERDICT]: "",
      [CLINICIAN_COMMENTS]: "",
      "In active box lineup": inLineup(s.id).map((b) => BOX_LABEL[b]).join("; "),
      "Product verification": readyToPack(s, x),
      "Product ID": s.id,
      "Label version ID": x?.versionId,
    };
    for (const b of BOX_SLUGS) {
      const e = eligible(b, s);
      row[`Eligible ${BOX_LABEL[b]}`] = e.fits ? "yes" : "no";
      row[`${BOX_LABEL[b]}: why`] = e.fits ? e.via.join("; ") : e.reasons.join("; ");
      row[`${BOX_LABEL[b]} nutrition rules alone`] = fitFor(b, s, s.rejectReason).fits ? "qualify" : "don't qualify";
    }
    for (const k of PREGNANCY_CHECK_KEYS) row[pCheckHeader(k)] = s.pregnancy_checks[k] ?? "";
    Object.assign(row, {
      Ingredients: x?.ingredients,
      Allergens: s.allergens,
    });
    for (const k of FREE_FROM_KEYS) row[k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())] = yn(s.freeFrom[k]);
    Object.assign(row, {
      "Pack weight (oz)": s.unit_wt_oz,
      Calories: s.calories,
      "Protein (g)": s.protein_g,
      "Fiber (g)": s.fiber_g,
      "Total carbs (g)": s.carbs_g,
      "Added sugar (g)": s.added_sugar_g,
      "Sodium (mg)": s.sodium_mg,
      "Caffeine (mg)": s.caffeine_mg,
      "Saturated fat (g)": s.sat_fat_g,
      "Sugar alcohols (g)": s.sugar_alcohols_g,
    });
    // Roles are reviewer tick-boxes: unticked means "not marked", not unknown data.
    for (const k of ROLE_KEYS) row[`Role: ${ROLE_LABEL[k]}`] = s.roles[k] ? "yes" : "";
    Object.assign(row, {
      Type: s.type,
      Form: x?.form,
      Categories: s.categories.join("; "),
      "Shelf life": x?.shelfLife,
      "Nutrition source": x?.nutritionSource,
      "Nutrition verified on (package in hand)": day(x?.verifiedAt ?? null),
      "Nutrition verified by": x?.verifiedBy,
      "Reject reason": s.rejectReason,
      "Pre-screened by": x?.prescreenedBy,
      "Pre-screened on": day(x?.prescreenedAt ?? null),
      "PharmaGuide Team decision by": x?.reviewedBy ?? (s.status === "Approved" ? "Legacy workbook approval: re-attestation needed" : null),
      "PharmaGuide Team decision on": day(x?.reviewedAt ?? null),
      "Unit UPC": x?.upc,
      "Verified outer-pack barcode": x?.verifiedPackBarcode,
      "Other notes": notes.other,
      "Authenticated PharmaGuide Team approval": isClinicianApproved(s) ? "yes" : "no",
      "PharmaGuide Team review state": s.clinicalDecision ?? "pending",
    });
    return reviewTeamRow(row);
  });
}
