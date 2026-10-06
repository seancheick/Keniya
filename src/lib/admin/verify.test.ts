import { describe, expect, it } from "vitest";
import { verifyProblems, type VerifyInput } from "./verify";

const ok: VerifyInput = {
  scannedUpc: "012345678905",
  fileUpc: null,
  otherOwner: null,
  nutritionMatches: true,
  ingredientsMatch: true,
  singleServe: true,
  expiresOn: "2027-03-01",
  today: "2026-10-05",
};

describe("verifyProblems", () => {
  it("rejects incorrect GS1 check digits and unsupported lengths", () => {
    expect(verifyProblems({ ...ok, scannedUpc: "012345678906" })[0]).toContain("valid check digit");
    expect(verifyProblems({ ...ok, scannedUpc: "1234567890" })[0]).toContain("valid check digit");
  });
  it("passes a matching single-serve package with enough shelf life", () => {
    expect(verifyProblems(ok)).toEqual([]);
  });
  it("treats UPC-A and EAN-13 forms as the same barcode", () => {
    expect(verifyProblems({ ...ok, fileUpc: "0012345678905" })).toEqual([]);
  });
  it("catches a wrong item, a taken barcode, a label mismatch, multi-serve and a short date", () => {
    expect(verifyProblems({ ...ok, fileUpc: "099999999999" })[0]).toMatch(/doesn't match the one on file/);
    expect(verifyProblems({ ...ok, otherOwner: { code: "P001", name: "X" } })[0]).toMatch(/already on P001/);
    expect(verifyProblems({ ...ok, nutritionMatches: false })[0]).toMatch(/nutrition panel/);
    expect(verifyProblems({ ...ok, singleServe: false })[0]).toMatch(/P8/);
    expect(verifyProblems({ ...ok, expiresOn: "2026-12-01" })[0]).toMatch(/Expires in 57 days/);
    expect(verifyProblems({ ...ok, scannedUpc: "123" })[0]).toMatch(/8–14 digits/);
  });
});

import { isIsoDate } from "./verify";

describe("package verification invalidation", () => {
  it("rejects impossible dates", () => {
    expect(isIsoDate("2026-02-31")).toBe(false);
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-13-01")).toBe(false);
  });
});
