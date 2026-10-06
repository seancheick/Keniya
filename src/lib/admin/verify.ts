// Pack-floor package verification: the last rung before "ready to pack". Someone holding the
// actual package confirms the UPC, the label, the serving format and the expiry date.
import { sameUpc } from "./fdc";

/** P9: a package needs at least this many days left (3-month ship + shelf window). */
export const MIN_DAYS_TO_EXPIRY = 90;

/** Earliest acceptable expiry date for a package checked today (ISO date). */
export const minExpiryDate = (now = new Date()) => new Date(now.getTime() + MIN_DAYS_TO_EXPIRY * 86_400_000).toISOString().slice(0, 10);

export const normalizeUpc = (raw: string) => raw.replace(/\D/g, "");
export const validUpc = (upc: string) => /^\d{8,14}$/.test(upc);

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

/** Reject impossible calendar dates as well as malformed input. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Label changes invalidate both package verification and the prior formula approval. */
export function packageLabelChanged(previous: Record<string, unknown>, next: Record<string, unknown>): boolean {
  const keys = ["calories", "protein_g", "fiber_g", "carbs_g", "added_sugar_g", "sodium_mg", "caffeine_mg", "sat_fat_g", "sugar_alcohols_g", "unit_wt_oz", "ingredients", "allergens", "free_from"];
  return keys.some((key) => {
    const a = previous[key]; const b = next[key];
    if (key === "free_from") {
      const normalize = (v: unknown) => JSON.stringify(Object.entries((v ?? {}) as Record<string, boolean>).sort(([a], [b]) => a.localeCompare(b)));
      return normalize(a) !== normalize(b);
    }
    if (["ingredients", "allergens"].includes(key)) return (a ?? "") !== (b ?? "");
    return (a === null || a === undefined ? null : Number(a)) !== (b === null || b === undefined ? null : Number(b));
  });
}

export type VerifyInput = {
  scannedUpc: string;
  /** UPC already on file for this product, if any. */
  fileUpc: string | null;
  /** Another product that already owns this UPC, if any. */
  otherOwner: { code: string; name: string } | null;
  nutritionMatches: boolean;
  ingredientsMatch: boolean;
  singleServe: boolean;
  expiresOn: string;
  today: string;
};

/** Reasons the package can't be verified; empty = verified. */
export function verifyProblems(v: VerifyInput): string[] {
  const out: string[] = [];
  if (!validUpc(v.scannedUpc)) out.push("Scan or type the barcode (8–14 digits).");
  else if (v.fileUpc && !sameUpc(v.fileUpc, v.scannedUpc))
    out.push(`This barcode (${v.scannedUpc}) doesn't match the one on file (${v.fileUpc}): wrong item, or a new formula/pack.`);
  else if (v.otherOwner) out.push(`This barcode is already on ${v.otherOwner.code} ${v.otherOwner.name}.`);
  if (!v.nutritionMatches) out.push("The nutrition panel doesn't match: update the product (or start a new formula version) before verifying.");
  if (!v.ingredientsMatch) out.push("The ingredients or allergen statement don't match: update the product before verifying.");
  if (!v.singleServe) out.push("Not a single-serve pack (P8): it can't go in a box as one snack.");
  if (!isIsoDate(v.expiresOn)) out.push("Enter the expiry or best-by date on the package.");
  else {
    const days = daysBetween(v.today, v.expiresOn);
    if (days < MIN_DAYS_TO_EXPIRY) out.push(`Expires in ${days} days; boxes need at least ${MIN_DAYS_TO_EXPIRY} (P9). Check a fresher package.`);
  }
  return out;
}
