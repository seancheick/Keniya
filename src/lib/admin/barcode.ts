// Barcode identity: GS1 check digits, normalization across UPC-A / EAN-13 / GTIN-14, and the
// confidence rule for automated lookups. Identity is not label verification: a matching
// barcode says "this identifier belongs to this product", nothing about the nutrition panel.

export type BarcodeStatus = "unverified" | "candidate" | "provisional" | "high" | "conflict" | "verified";

export type BarcodeSource = {
  /** USDA, Open Food Facts, UPCitemdb, GS1, manufacturer, package */
  source: string;
  gtin: string;
  /** Brand, product, flavor and individual pack size all matched (not a fuzzy name hit). */
  exact_variant: boolean;
  checked_at: string;
  note?: string;
};

/** Digits only; null unless it is a plausible 8/12/13/14-digit GS1 code. */
export function cleanBarcode(raw: string | null | undefined): string | null {
  const d = (raw ?? "").replace(/\D/g, "");
  return [8, 12, 13, 14].includes(d.length) ? d : null;
}

/** GS1 mod-10 check digit, valid for GTIN-8/12/13/14 (and 8-digit UPC-E is not handled). */
export function validCheckDigit(code: string): boolean {
  const d = cleanBarcode(code);
  if (!d || d !== code) return false;
  const body = d.slice(0, -1);
  const check = Number(d.at(-1));
  let sum = 0;
  // Weights alternate 3,1 from the rightmost body digit.
  for (let i = 0; i < body.length; i++) sum += Number(body[body.length - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10 === check;
}

/** Canonical 14-digit form for matching (UPC-A 0123… and EAN-13 00123… are the same item). */
export function gtin14(code: string): string | null {
  const d = cleanBarcode(code);
  return d ? d.padStart(14, "0") : null;
}

/**
 * The form printed on a US package, for storing in `upc`: GTIN-14/EAN-13 codes that only pad a
 * 12-digit UPC-A with zeros come back as that UPC-A, keeping its own leading zero
 * ("00071146002524" → "071146002524", never "71146002524"). Match with gtin14, not this.
 */
export function printedForm(code: string): string | null {
  const g = gtin14(code);
  if (!g) return null;
  return g.startsWith("00") ? g.slice(2) : g.startsWith("0") ? g.slice(1) : g;
}

/** GTIN-14 indicator digit 0 = the consumer unit; 1–8 = a case or inner pack of it, 9 = variable measure. */
export const isConsumerUnit = (code: string) => gtin14(code)?.startsWith("0") === true;

export const sameGtin = (a: string | null | undefined, b: string | null | undefined) =>
  Boolean(a && b) && gtin14(a!) !== null && gtin14(a!) === gtin14(b!);

export type BarcodeVerdict = { status: Exclude<BarcodeStatus, "verified">; gtin: string | null; agree: number; note?: string };

/**
 * Confidence from automated sources. Identity is established only by exact-variant hits
 * (brand + product + flavor + individual pack size): USDA exact alone, or an exact hit plus
 * an agreeing second source, is provisional; three agreeing sources with an exact hit is high.
 * Name-only hits are candidates at best. Exact hits that disagree are a conflict for a
 * person to settle; a name-only hit that disagrees with an exact one is recorded, not trusted.
 */
export function barcodeVerdict(sources: BarcodeSource[]): BarcodeVerdict {
  const valid = sources.filter((s) => validCheckDigit(s.gtin));
  if (!valid.length) return { status: "unverified", gtin: null, agree: 0 };
  // A case or multipack code can never identify the single pack we put in a box.
  for (const s of valid) if (!isConsumerUnit(s.gtin)) s.exact_variant = false;
  const byGtin = (list: BarcodeSource[]) => {
    const g = new Map<string, BarcodeSource[]>();
    for (const s of list) g.set(gtin14(s.gtin)!, [...(g.get(gtin14(s.gtin)!) ?? []), s]);
    return g;
  };
  const exact = valid.filter((s) => s.exact_variant);
  if (!exact.length) {
    const g = byGtin(valid);
    if (g.size > 1) return { status: "conflict", gtin: null, agree: 0, note: "name-only sources disagree" };
    const [gtin, list] = [...g][0];
    return { status: "candidate", gtin, agree: new Set(list.map((s) => s.source)).size, note: "no source matched the exact pack size" };
  }
  const ge = byGtin(exact);
  if (ge.size > 1) return { status: "conflict", gtin: null, agree: 0, note: "exact-variant sources disagree" };
  const [gtin] = [...ge][0];
  const agreeing = valid.filter((s) => gtin14(s.gtin) === gtin);
  const distinct = new Set(agreeing.map((s) => s.source)).size;
  const dissent = valid.filter((s) => gtin14(s.gtin) !== gtin).map((s) => `${s.source} ${s.gtin}`);
  const note = dissent.length ? `name-only disagreement ignored: ${dissent.join(", ")}` : undefined;
  const usdaExact = exact.some((s) => s.source === "USDA");
  if (distinct >= 3) return { status: "high", gtin, agree: distinct, note };
  if (distinct >= 2 || usdaExact) return { status: "provisional", gtin, agree: distinct, note };
  return { status: "candidate", gtin, agree: distinct, note };
}
