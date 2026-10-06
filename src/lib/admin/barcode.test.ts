import { describe, expect, it } from "vitest";
import { barcodeVerdict, cleanBarcode, gtin14, isConsumerUnit, printedForm, sameGtin, validCheckDigit, type BarcodeSource } from "./barcode";

const at = "2026-10-06T00:00:00Z";
const src = (source: string, gtin: string, exact_variant = false): BarcodeSource => ({ source, gtin, exact_variant, checked_at: at });

describe("barcode identity", () => {
  it("validates GS1 check digits and normalizes UPC-A / EAN-13 to GTIN-14", () => {
    expect(validCheckDigit("850397004996")).toBe(true); // That's It mini (USDA)
    expect(validCheckDigit("0850397004996")).toBe(true);
    expect(validCheckDigit("850397004997")).toBe(false);
    expect(validCheckDigit("12345")).toBe(false);
    expect(validCheckDigit("UPC 850397004996")).toBe(false);
    expect(gtin14("850397004996")).toBe("00850397004996");
    expect(sameGtin("850397004996", "00850397004996")).toBe(true);
    expect(cleanBarcode("8-50397-00499-6")).toBe("850397004996");
    // The printed form keeps a UPC-A's own leading zero (the old .replace(/^0+/) made 11 digits).
    expect(printedForm("00071146002524")).toBe("071146002524");
    expect(printedForm("0071146002524")).toBe("071146002524");
    expect(printedForm("071146002524")).toBe("071146002524");
    expect(validCheckDigit(printedForm("00021908241326")!)).toBe(true);
    expect(printedForm("5000159527118")).toBe("5000159527118"); // a real EAN-13 stays 13
  });
  it("identity needs an exact pack-size match; name-only hits stay candidates; exact disagreement is a conflict", () => {
    expect(barcodeVerdict([src("UPCitemdb", "850397004996")]).status).toBe("candidate");
    expect(barcodeVerdict([src("Open Food Facts", "850397004996"), src("UPCitemdb", "850397004996")]).status).toBe("candidate"); // two name-only hits
    expect(barcodeVerdict([src("USDA", "850397004996", true)]).status).toBe("provisional");
    expect(barcodeVerdict([src("Open Food Facts", "850397004996", true), src("UPCitemdb", "0850397004996")])).toMatchObject({ status: "provisional", gtin: "00850397004996", agree: 2 });
    expect(barcodeVerdict([src("USDA", "850397004996", true), src("Open Food Facts", "850397004996"), src("UPCitemdb", "850397004996")]).status).toBe("high");
    expect(barcodeVerdict([src("USDA", "850397004996", true), src("Open Food Facts", "850397004989", true)]).status).toBe("conflict");
    const v = barcodeVerdict([src("USDA", "850397004996", true), src("Open Food Facts", "850397004989")]);
    expect(v.status).toBe("provisional");
    expect(v.note).toMatch(/name-only disagreement/);
    expect(barcodeVerdict([src("UPCitemdb", "850397004997")]).status).toBe("unverified"); // bad check digit is ignored
    // A case-level GTIN-14 (indicator 1) is never the single pack, however exact the name and size.
    expect(isConsumerUnit("10014100275166")).toBe(false);
    expect(barcodeVerdict([src("USDA", "10014100275166", true)]).status).toBe("candidate");
  });
});
