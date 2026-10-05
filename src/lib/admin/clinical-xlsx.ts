// Clinician review workbook: the rows from clinical.ts as a formatted Excel file (widths,
// wrapped text, frozen header, colored status) plus a Legend sheet explaining P1–P9 and statuses.
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
  if (header === "Product" || header === "Pre-screen finding (what to check)") return header === "Product" ? 34 : 60;
  if (header === CLINICIAN_COMMENTS || header === "Ingredients" || header === "Other notes") return 48;
  if (header === CLINICIAN_VERDICT) return 18;
  if (/: why$|Nutrition source|Allergens/.test(header)) return 34;
  if (/^P\d/.test(header)) return 14;
  if (/^(Eligible |Role: )/.test(header)) return 11;
  if (/nutrition rules alone$/.test(header)) return 13;
  if (/^(Code|Calories|Type|Form)$|\((g|mg|oz)\)/.test(header)) return 9;
  return 15;
}

const fill = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

export async function clinicalWorkbook(rows: Record<string, unknown>[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet("Review", { views: [{ state: "frozen", xSplit: 2, ySplit: 1 }] });
  const headers = Object.keys(rows[0] ?? {});
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
  const col = (h: string) => headers.indexOf(h) + 1;
  ws.eachRow((row, i) => {
    if (i === 1) return;
    row.alignment = { wrapText: true, vertical: "top" };
    const status = String(row.getCell(col("Status")).value) as Status;
    if (STATUS_FILL[status]) row.getCell(col("Status")).fill = fill(STATUS_FILL[status]);
    for (const h of [CLINICIAN_VERDICT, CLINICIAN_COMMENTS]) row.getCell(col(h)).fill = fill(INPUT_FILL);
    row.eachCell((c) => {
      if (c.value === "FAIL" || (c.value === "no" && String(ws.getRow(1).getCell(c.col).value).startsWith("Eligible "))) c.font = { color: { argb: "FFB91C1C" }, bold: true };
    });
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

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
  };
  section("How to review");
  line("1", "On the Review sheet, filter Status to Pre-approved (amber). These passed an automated pre-screen and need your confirmation.");
  line("2", "Read 'Pre-screen finding (what to check)': it says what was found, what was corrected and the source used.");
  line("3", "Fill the two yellow columns: your verdict (OK / change / reject) and any comment. Then send the file back.");
  line("4", "Candidate rows need a label check or your decision first; their finding says why.");
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
  line("Pregnancy fit", "Nutrition complete + a caffeine value present + all 10 blocking checks PASS + not Rejected. Blank means not checked yet.");
  lg.addRow([]);
  section("Other columns");
  line("Eligible <box>", "Final answer: the nutrition rules qualify it AND it passes the box's hard limits, the shipping policy (no liquids, max item weight), single-serve (P8) and status (not Rejected/Retired).");
  line("<box>: why", "If eligible: the qualifying pathway. If not: every reason, nutrition rule or hard limit (e.g. '2142 mg sodium (max 230 mg)').");
  line("Nutrition rules alone", "Whether the label numbers and roles qualify it before the hard limits and status; shown for transparency only.");
  line("Hard limits", "Carb Conscious: ≤20 g total carbs and ≤5 g added sugar per pack. Heart: ≤230 mg sodium and ≤2 g saturated fat per pack (≤4 g when the fat comes from nuts/seeds). Founder defaults 2026-10-05; clinician to confirm or change.");
  line("Pre-screened by/on", "Who ran the source and ingredient pre-screen. Not a clinical decision.");
  line("Clinician decision by/on", "Who approved or rejected it clinically. Blank until the clinician decides.");
  line("Free-from columns", "yes = free from it; no = contains it or may contain it (cross-contact counts as 'no'); unknown = not recorded.");
  line("Nutrition source", "Where the numbers come from (USDA FoodData Central label data, manufacturer site, NIH DSLD, Open Food Facts).");
  line("Verified on (package in hand)", "Blank until someone checks the actual package; the pre-screen used published label data only.");
  line("Role columns", "Reviewer judgements used by the Heart box (yes = marked).");

  return Buffer.from(await wb.xlsx.writeBuffer());
}
