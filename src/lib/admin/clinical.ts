// Clinician review sheet: one row per product with the label data and every rule decision,
// so a reviewer can audit box fit without the admin. No costs or vendors (not theirs to audit).
import { fitFor, type BoxFit } from "./rules";
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
    s.status !== "Approved" ? "clinician approval" : !x?.reviewedBy?.trim() ? "clinician re-attestation" : null,
    !x?.upc ? "UPC" : null,
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
  return PRESCREEN.test(first) ? { prescreen: first.replace(PRESCREEN, ""), other: rest.join("\n").trim() } : { prescreen: "", other: (notes ?? "").trim() };
}

export const CLINICIAN_VERDICT = "Clinician verdict (OK / change / reject)";
export const CLINICIAN_COMMENTS = "Clinician comments";
export const pCheckHeader = (k: (typeof PREGNANCY_CHECK_KEYS)[number]) => `${k} · ${PREGNANCY_CHECK_LABEL[k]}`;

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
      "Pre-screen finding (what to check)": notes.prescreen,
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
      "Clinician decision by": x?.reviewedBy ?? (s.status === "Approved" ? "Legacy workbook approval: re-attestation needed" : null),
      "Clinician decision on": day(x?.reviewedAt ?? null),
      UPC: x?.upc,
      "Other notes": notes.other,
    });
    return row;
  });
}
