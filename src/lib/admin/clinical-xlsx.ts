// Short clinician decision queue with separate full evidence and current-rule guidance.
import ExcelJS from "exceljs";
import { CLINICIAN_COMMENTS, CLINICIAN_VERDICT } from "./clinical";
import { PREGNANCY_BLOCKING, PREGNANCY_CHECK_KEYS, PREGNANCY_CHECK_LABEL, STATUSES, STATUS_MEANING, type Status } from "./types";

const STATUS_FILL: Record<Status, string> = {
  Approved: "FFD1FAE5",
  "Pre-approved": "FFFEF3C7",
  Candidate: "FFDBEAFE",
  Rejected: "FFFEE2E2",
  Retired: "FFE5E7EB",
};
const INPUT_FILL = "FFFFFBEB";
const HEADER_FILL = "FFF3F4F6";

function widthFor(header: string): number {
  if (header === "Product" || header === "Historical pre-screen note (not a current decision)") return header === "Product" ? 34 : 60;
  if (header === CLINICIAN_COMMENTS || header === "Ingredients" || header === "Other notes") return 48;
  if (header === CLINICIAN_VERDICT) return 18;
  if (header === "Product verification") return 30;
  if (/: why$|Nutrition source|Allergens/.test(header)) return 34;
  if (/^P\d/.test(header)) return 14;
  if (/^(Eligible |Role: )/.test(header)) return 11;
  if (/nutrition rules alone$/.test(header)) return 13;
  if (/^(Code|Calories|Type|Form)$|\((g|mg|oz)\)/.test(header)) return 9;
  return 15;
}

const fill = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

export async function clinicalWorkbook(rows: Record<string, unknown>[], ruleSummary: string[] = []): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  wb.creator = "Keniya";
  const start = wb.addWorksheet("Start here");
  start.columns = [{ width: 28 }, { width: 100 }];
  const instructions = [
    ["Keniya PharmaGuide Team review", `Exported ${new Date().toISOString().slice(0, 10)}. ${rows.length} products. This is a snapshot.`],
    ["Review team", "PharmaGuide Team, led by Dr. Pham, brings together pharmacy, nutrition and other expertise. Team members contribute review comments; recorded decisions retain the reviewer name and date."],
    ["1. Open Review", "Start with Recommend Approve rows. Hold rows need operator diligence before PharmaGuide Team review. Active lineup products appear first within each group."],
    ["2. Check the evidence", "Click the product name to open its row on Details, or use the same product code to check ingredients, allergens, per-pack nutrition, sources and Pregnancy checks. Blank values mean not recorded, not zero or safe."],
    ["3. Record your decision", "Fill the yellow Decision, Comments, Reviewer and Review date cells. Use Approve, Changes needed or Reject. State which boxes your decision covers and any corrections or restrictions in Comments."],
    ["4. Record in the PharmaGuide Team account", "Workbook decisions are comments only and do not approve a product. The PharmaGuide Team records its decision through the authenticated review account after internal diligence is complete. Check the Product ID and Label version ID for changes since export; the operator corrects evidence and requested changes."],
    ["Before packing", "Product verification is only PharmaGuide Team approval, unit or verified outer-pack barcode and package-in-hand verification. Box rules, customer restrictions, current lot availability and expiry are checked separately when packing."],
    ["Review groups", `Awaiting PharmaGuide Team = completed internal diligence. Operator work required = evidence or diligence remains. Label / initial review = Candidate. Rejected and Retired remain in Details.${rows.some((r) => r.Status === "Approved" && r["Authenticated PharmaGuide Team approval"] !== "yes") ? " Re-attest legacy approval = recorded Approved without authenticated PharmaGuide Team approval." : ""}`],
    ["Review total", String(rows.filter((r) => !["Rejected", "Retired"].includes(String(r.Status))).length)],
  ];
  for (const values of instructions) { const r = start.addRow(values); r.height = 60; r.alignment = { wrapText: true, vertical: "top" }; r.getCell(1).font = { bold: true }; }
  start.getRow(1).fill = fill(HEADER_FILL);
  const review = wb.addWorksheet("Review", { views: [{ state: "frozen", xSplit: 2, ySplit: 1 }] });
  const reviewHeaders = ["Code", "Product", "Review group", "In active box lineup", "Keniya recommendation", "Decision", "Comments", "Reviewer", "Review date"];
  review.columns = reviewHeaders.map((header) => ({ header, key: header, width: header === "Product" ? 34 : header === "Comments" || header.startsWith("Pre-screen") ? 48 : header === "Code" ? 12 : 24 }));
  const group = (r: Record<string, unknown>) => r.Status === "Approved" && r["Authenticated PharmaGuide Team approval"] !== "yes" ? "Re-attest legacy approval" : String(r["Keniya recommendation"]).startsWith("Hold") ? "Operator work required" : r.Status === "Pre-approved" ? "Awaiting PharmaGuide Team" : r.Status === "Candidate" ? "Label / initial review" : "Already approved";
  const rank = ["Awaiting PharmaGuide Team", "Operator work required", "Re-attest legacy approval", "Label / initial review", "Already approved"];
  const queue = rows.filter((r) => !["Rejected", "Retired"].includes(String(r.Status))).sort((a, b) => rank.indexOf(group(a)) - rank.indexOf(group(b)) || Number(Boolean(b["In active box lineup"])) - Number(Boolean(a["In active box lineup"])) || String(a.Product).localeCompare(String(b.Product)));
  for (const r of queue) {
    const row = review.addRow([r.Code, r.Product, group(r), r["In active box lineup"] || null, r["Keniya recommendation"] || null, null, null, null, null]);
    row.height = Math.min(409, Math.max(60, Math.ceil(String(r["Keniya recommendation"] ?? "").length / 46) * 15 + 15));
    row.alignment = { wrapText: true, vertical: "top" };
    for (let c = 6; c <= 9; c++) row.getCell(c).fill = fill(INPUT_FILL);
    row.getCell(6).dataValidation = { type: "list", allowBlank: true, formulae: ['"Approve,Changes needed,Reject"'], showErrorMessage: true, errorStyle: "stop", errorTitle: "Choose a decision", error: "Choose Approve, Changes needed or Reject." };
    row.getCell(9).numFmt = "yyyy-mm-dd";
    row.getCell(9).dataValidation = { type: "date", operator: "between", allowBlank: true, formulae: [new Date("2000-01-01T00:00:00Z"), new Date("2100-12-31T00:00:00Z")], showErrorMessage: true, errorStyle: "stop", error: "Enter a calendar date." };
  }
  review.getRow(1).height = 48;
  review.getRow(1).font = { bold: true };
  review.getRow(1).fill = fill(HEADER_FILL);
  review.getRow(1).alignment = { wrapText: true, vertical: "top" };
  review.autoFilter = { from: "A1", to: `I${Math.max(1, queue.length + 1)}` };
  const ws = wb.addWorksheet("Details", { views: [{ state: "frozen", xSplit: 2, ySplit: 1 }] });
  const headers = Object.keys(rows[0] ?? { Code: null, Product: null, Status: null }).filter((h) => ![CLINICIAN_VERDICT, CLINICIAN_COMMENTS].includes(h));
  ws.columns = headers.map((h) => ({ header: h, key: h, width: widthFor(h) }));
  // Blanks stay truly empty: an "" cell is stored as a shared string, which some viewers show as its index.
  for (const r of rows) ws.addRow(headers.map((h) => (r[h] === null || r[h] === undefined || r[h] === "" ? null : r[h])));

  const head = ws.getRow(1);
  head.height = 75;
  head.eachCell((c) => {
    c.font = { bold: true };
    c.fill = fill(HEADER_FILL);
    c.alignment = { wrapText: true, vertical: "top" };
  });
  const detailRowByCode = new Map(rows.map((r, i) => [String(r.Code), i + 2]));
  review.eachRow((row, i) => {
    if (i === 1) return;
    const detailRow = detailRowByCode.get(String(row.getCell(1).value));
    if (detailRow) { row.getCell(2).value = { text: String(row.getCell(2).value), hyperlink: `#'Details'!A${detailRow}` }; row.getCell(2).font = { color: { argb: "FF2563EB" }, underline: true }; }
  });
  const col = (h: string) => headers.indexOf(h) + 1;
  ws.eachRow((row, i) => {
    if (i === 1) return;
    row.alignment = { wrapText: true, vertical: "top" };
    const status = String(row.getCell(col("Status")).value) as Status;
    if (STATUS_FILL[status]) row.getCell(col("Status")).fill = fill(STATUS_FILL[status]);
    row.height = 100;
    row.eachCell((c) => {
      if (c.value === "FAIL" || (c.value === "no" && String(ws.getRow(1).getCell(c.col).value).startsWith("Eligible "))) c.font = { color: { argb: "FFB91C1C" }, bold: true };
    });
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, rows.length + 1), column: headers.length } };

  const lg = wb.addWorksheet("Legend");
  lg.columns = [{ width: 26 }, { width: 100 }, { width: 14 }];
  const section = (title: string) => {
    const r = lg.addRow([title]);
    r.font = { bold: true, size: 13 };
    r.getCell(1).fill = fill(HEADER_FILL);
  };
  const line = (a: string, b: string, c = "") => {
    const r = lg.addRow(c ? [a, b, c] : [a, b]);
    r.alignment = { wrapText: true, vertical: "top" };
    r.height = Math.max(45, Math.ceil(b.length / 95) * 15 + 15);
  };
  section("How to review");
  line("1", "Start here explains the workflow. Review has the short decision queue; Details contains every product and all evidence.");
  line("2", "Read Keniya recommendation first. Historical pre-screen notes do not establish current diligence or PharmaGuide Team approval.");
  line("3", "The yellow workbook cells capture review comments. Approval is recorded only through the authenticated PharmaGuide Team review account after internal diligence is complete.");
  line("4", "Candidate rows need operator diligence before an authenticated PharmaGuide Team decision. Missing label values stay unknown.");
  lg.addRow([]);
  section("Status");
  for (const s of STATUSES) {
    const r = lg.addRow([s, STATUS_MEANING[s]]);
    r.getCell(1).fill = fill(STATUS_FILL[s]);
    r.alignment = { wrapText: true, vertical: "top" };
  }
  lg.addRow([]);
  section("Pregnancy checks (Keniya Pregnancy Standard, revised v3)");
  lg.addRow(["Check", "Meaning", "Blocks?"]).font = { bold: true };
  for (const k of PREGNANCY_CHECK_KEYS) line(k, PREGNANCY_CHECK_LABEL[k], (PREGNANCY_BLOCKING as readonly string[]).includes(k) ? "yes" : "no (info)");
  line("Pregnancy fit", "See Pregnancy: why on Details for the actual checks and eligibility result. Blank checks mean not recorded.");
  lg.addRow([]);
  section("Other columns");
  line("Eligible <box>", "The nutrition rules qualify it AND it passes the box's hard limits, the shipping policy (no liquids, max item weight), single-serve (P8 must be PASS: blank means not yet confirmed) and status (not Rejected/Retired).");
  line("Product verification", "The last steps after eligibility: approved by PharmaGuide Team with the reviewer name and date recorded (legacy workbook approvals need re-attestation), unit UPC or verified outer-pack identity on file, and the label checked with the package in hand. Shipment readiness also requires box rules, customer restrictions and packable stock.");
  line("Ladder", "Candidate → Pre-approved (internal diligence complete) → Approved (PharmaGuide Team) → Package verified → Ready to pack. Candidates can't be in a lineup; a lineup with Pre-approved or unverified picks is PROVISIONAL.");
  line("<box>: why", "If eligible: the qualifying pathway. If not: every reason, nutrition rule or hard limit (e.g. '2142 mg sodium (max 140 mg)').");
  line("Nutrition rules alone", "Whether the label numbers and roles qualify it before the hard limits and status; shown for transparency only.");
  line("Current rules", ruleSummary.length ? ruleSummary.join("\n") : "Eligibility reasons on Details reflect the rules supplied for this export. Consult current admin settings for the configured limits.");
  line("Pre-screened by/on", "Who completed the internal diligence. Not a PharmaGuide Team decision.");
  line("PharmaGuide Team decision by/on", "Who approved or rejected it clinically. Blank until the PharmaGuide Team decides.");
  line("Free-from columns", "yes = free from it; no = contains it or may contain it (cross-contact counts as 'no'); unknown = not recorded.");
  line("Nutrition source", "Where the numbers come from (USDA FoodData Central label data, manufacturer site, NIH DSLD, Open Food Facts).");
  line("Verified on (package in hand)", "Blank until someone checks the actual package; the pre-screen used published label data only.");
  line("Role columns", "Reviewer judgements used by the Heart box (yes = marked).");

  return Buffer.from(await wb.xlsx.writeBuffer());
}
