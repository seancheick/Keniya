import { describe, expect, it } from "vitest";
import { settings, snack } from "./__fixtures__/snacks";
import { eligibleFor } from "./rules";
import { DEFAULT_BOX_RULES } from "./types";
import { CLINICIAN_VERDICT, clinicalReviewRows, pCheckHeader, splitNotes } from "./clinical";
import { clinicalWorkbook } from "./clinical-xlsx";
import ExcelJS from "exceljs";

describe("clinicalReviewRows", () => {
  it("shows every rule decision with its reason and no costs", () => {
    const ok = snack({ name: "Roasted chickpeas", unitCostCents: 55 });
    const sweet = snack({ name: "Candy", added_sugar_g: 20, fiber_g: 0, protein_g: 0, pregnancy_checks: { P1: "FAIL" } });
    const [a, b] = clinicalReviewRows([ok, sweet], () => undefined, (id) => (id === ok.id ? ["heart"] : []));

    expect(a["Eligible Pregnancy"]).toBe("yes");
    expect(a["In active box lineup"]).toBe("Heart");
    expect(b["Eligible Pregnancy"]).toBe("no");
    expect(String(b["Pregnancy: why"])).toMatch(/P1/);
    expect(b[pCheckHeader("P1")]).toBe("FAIL");
    expect(pCheckHeader("P1")).toBe("P1 · Pasteurized or fully cooked");
    expect(b[CLINICIAN_VERDICT]).toBe("");
    expect(Object.keys(a).some((k) => /cost|price|vendor/i.test(k))).toBe(false);
  });

  it("eligibility overrides the nutrition rules and the approver is never blank for Approved", () => {
    const salty = snack({ status: "Approved", roles: { NS: true }, sodium_mg: 2142 });
    const [r] = clinicalReviewRows([salty], () => undefined, () => [], (slug, s) =>
      eligibleFor(slug, s, DEFAULT_BOX_RULES[slug], settings.policy, s.rejectReason),
    );
    expect(r["Heart nutrition rules alone"]).toBe("qualify");
    expect(r["Eligible Heart"]).toBe("no");
    expect(String(r["Heart: why"])).toContain("2142 mg sodium");
    expect(r["Clinician decision by"]).toBe("Legacy workbook approval: re-attestation needed");
  });

  it("splits the pre-screen line out of the notes", () => {
    expect(splitNotes("[Pre-screen 2026-10-05 · Claude] Pre-approved. Source: X.\nOld note")).toEqual({ prescreen: "Pre-approved. Source: X.", other: "Old note" });
    expect(splitNotes("Just a note")).toEqual({ prescreen: "", other: "Just a note" });
  });

  it("prioritizes review work and preserves excluded products in Details", async () => {
    const rows = clinicalReviewRows([
      snack({ code: "REJECT", status: "Rejected" }),
      snack({ code: "LEGACY", status: "Approved" }),
      snack({ code: "WAIT", status: "Pre-approved" }),
      snack({ code: "CAND", status: "Candidate" }),
    ], () => undefined, () => []);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await clinicalWorkbook(rows) as never);
    expect(wb.getWorksheet("Review")!.getColumn(1).values).toEqual([undefined, "Code", "WAIT", "LEGACY", "CAND"]);
    expect(wb.getWorksheet("Details")!.rowCount).toBe(5);
    expect(rows[1]["Product verification"]).toContain("re-attestation");
    expect(rows[1]["Ready to pack"]).toBeUndefined();
  });

  it("exports an empty catalog without invalid cells", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await clinicalWorkbook([]) as never);
    expect(wb.getWorksheet("Review")!.rowCount).toBe(1);
    expect(wb.getWorksheet("Details")!.getRow(1).getCell(1).value).toBe("Code");
  });

  it("builds a workbook with the review sheet and a legend", async () => {
    const rows = clinicalReviewRows([snack({ status: "Pre-approved" })], () => ({ notes: "[Pre-screen x] Check the label." } as never), () => []);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await clinicalWorkbook(rows)) as never);
    const ws = wb.getWorksheet("Details")!;
    expect(ws.getRow(1).getCell(4).value).toBe("Status");
    expect(ws.getRow(2).getCell(4).value).toBe("Pre-approved");
    expect(ws.getRow(2).getCell(5).value).toBe("Check the label.");
    const review = wb.getWorksheet("Review")!;
    expect(review.getRow(2).getCell(6).value).toBeNull();
    expect(review.getRow(2).getCell(6).dataValidation.formulae).toEqual(['"Approve,Changes needed,Reject"']);
    expect(wb.worksheets.map((s) => s.name)).toEqual(["Start here", "Review", "Details", "Legend"]);
    const legend = wb.getWorksheet("Legend")!.getSheetValues().flat().join(" ");
    expect(legend).toContain("Pasteurized or fully cooked");
    expect(legend).toContain("waiting for the clinician");
  });
});
