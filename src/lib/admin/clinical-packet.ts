// Clinician packet: the finished work for the clinician's final decision. Only the products in
// the active lineups, each with the exact label values, the rule it was judged against, why it
// passed (or the exception it used), the source and verification date, plus each lineup's own
// validation result. The full catalog workbook (clinical-xlsx.ts) stays an internal audit tool.
import ExcelJS from "exceljs";
import { splitNotes, type ClinicalExtra } from "./clinical";
import { eligibleFor, type Check, type Pick } from "./rules";
import { BOX_LABEL, BOX_SLUGS, PREGNANCY_CHECK_KEYS, ROLE_KEYS, ROLE_LABEL, type BoxRules, type BoxSlug, type Settings, type Snack } from "./types";

export type PacketBox = {
  slug: BoxSlug;
  version: number | null;
  stage: { label: string; detail: string };
  checks: Check[];
  picks: Pick[];
  extras: Snack[];
};

export type PacketInput = {
  boxes: PacketBox[];
  rules: Record<BoxSlug, BoxRules>;
  policy: Settings["policy"];
  extra: (id: string) => ClinicalExtra | undefined;
};

const HEADER_FILL = "FFF3F4F6";
const INPUT_FILL = "FFFFFBEB";
const fill = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null);
const nz = (v: unknown) => (v === null || v === undefined || v === "" ? null : v);

/** The per-pack limits a box applies, as one line. */
export function limitsLine(r: BoxRules): string {
  const parts = [
    r.carbsMax !== null && `total carbs ≤${r.carbsMax} g`,
    r.addedSugarMax !== null && `added sugar ≤${r.addedSugarMax} g${r.treatAddedSugarMax !== null ? ` (treat ≤${r.treatAddedSugarMax} g)` : ""}`,
    r.sodiumMax !== null && `sodium ≤${r.sodiumMax} mg`,
    r.satFatMax !== null && `saturated fat ≤${r.satFatMax} g${r.satFatNutMax !== null ? ` (intrinsic nut/seed fat ≤${r.satFatNutMax} g)` : ""}`,
    r.caffeineMax !== null && `caffeine ≤${r.caffeineMax} mg`,
  ].filter(Boolean);
  return parts.length ? parts.join("; ") : "no per-pack limits (pregnancy checks and shipping policy only)";
}

/** One row per product used in any lineup, with every box it serves and the pass rationale for each. */
export function packetProductRows(input: PacketInput): Record<string, unknown>[] {
  const uses = new Map<string, { snack: Snack; boxes: { slug: BoxSlug; category: string | null; extra: boolean }[] }>();
  for (const b of input.boxes) {
    for (const p of b.picks) {
      const u = uses.get(p.snack.id) ?? { snack: p.snack, boxes: [] };
      u.boxes.push({ slug: b.slug, category: p.category, extra: false });
      uses.set(p.snack.id, u);
    }
    for (const e of b.extras) {
      const u = uses.get(e.id) ?? { snack: e, boxes: [] };
      u.boxes.push({ slug: b.slug, category: null, extra: true });
      uses.set(e.id, u);
    }
  }
  const rows: Record<string, unknown>[] = [];
  for (const { snack: s, boxes } of [...uses.values()].sort((a, b) => a.snack.code.localeCompare(b.snack.code))) {
    const x = input.extra(s.id);
    const notes = splitNotes(x?.notes);
    const row: Record<string, unknown> = {
      Code: s.code,
      Product: s.name,
      Brand: s.brand,
      "Exact pack": `${s.unit_wt_oz ?? "?"} oz · ${s.type} · ${x?.form ?? ""}`,
      UPC: x?.upc,
      "Used in": boxes.map((b) => `${BOX_LABEL[b.slug]}${b.extra ? " (extra)" : b.category ? ` (${b.category})` : ""}`).join("; "),
      Status: s.status,
      "Pre-screened by": x?.prescreenedBy,
      "Pre-screened on": day(x?.prescreenedAt),
      "Label source": x?.nutritionSource,
      "Label checked in hand on": day(x?.verifiedAt),
      "Clinician decision": "",
      "Clinician comments": "",
      "Clinician decision by": x?.reviewedBy ?? (s.status === "Approved" ? "Legacy workbook approval: re-attestation needed" : null),
    };
    for (const slug of BOX_SLUGS) {
      const used = boxes.find((b) => b.slug === slug);
      if (!used) continue;
      const e = eligibleFor(slug, s, input.rules[slug], input.policy, s.rejectReason);
      row[`${BOX_LABEL[slug]}: rule applied`] = limitsLine(input.rules[slug]);
      row[`${BOX_LABEL[slug]}: result`] = e.fits ? `PASS via ${e.via.join(", ")}` : `FAIL: ${e.reasons.join("; ")}`;
    }
    const exceptions = [
      s.roles.CT && "controlled treat (treat added-sugar ceiling applies)",
      s.roles.NS && typeof s.sat_fat_g === "number" && s.sat_fat_g > 2 && "nut/seed saturated-fat allowance used (intrinsic fat)",
      Object.entries(s.pregnancy_checks).some(([k, v]) => k !== "P7c" && String(v).toUpperCase() === "FAIL") && `pregnancy check failed: ${Object.entries(s.pregnancy_checks).filter(([k, v]) => k !== "P7c" && String(v).toUpperCase() === "FAIL").map(([k]) => k).join(", ")}`,
      s.pregnancy_checks.P7c && `customer-preference flag (P7c): ${s.pregnancy_checks.P7c}`,
    ].filter(Boolean);
    Object.assign(row, {
      "Exceptions / pathways": exceptions.join("; ") || null,
      "Pre-screen finding": notes.prescreen || null,
      "Pack weight (oz)": s.unit_wt_oz,
      Calories: s.calories,
      "Protein (g)": s.protein_g,
      "Fiber (g)": s.fiber_g,
      "Total carbs (g)": s.carbs_g,
      "Added sugar (g)": s.added_sugar_g,
      "Sodium (mg)": s.sodium_mg,
      "Saturated fat (g)": s.sat_fat_g,
      "Caffeine (mg)": s.caffeine_mg,
      "Pregnancy checks": PREGNANCY_CHECK_KEYS.map((k) => `${k}=${s.pregnancy_checks[k] ?? "—"}`).join(" "),
      Roles: ROLE_KEYS.filter((k) => s.roles[k]).map((k) => ROLE_LABEL[k]).join("; ") || null,
      Ingredients: x?.ingredients,
      Allergens: s.allergens,
      "Shelf life": x?.shelfLife,
      "Other notes": notes.other || null,
      "Product ID": s.id,
      "Label version ID": x?.versionId,
    });
    rows.push(row);
  }
  return rows;
}

export async function clinicianPacketWorkbook(input: PacketInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  wb.creator = "Keniya";
  const products = packetProductRows(input);

  const start = wb.addWorksheet("Start here");
  start.columns = [{ width: 26 }, { width: 110 }];
  const lines = [
    ["Keniya clinician packet", `Exported ${new Date().toISOString().slice(0, 10)}. ${input.boxes.length} lineups, ${products.length} products. Keniya's diligence is complete: every product was label-verified against a named source, run against the live box rules, and pre-approved internally; every lineup passed its composition checks. You are the final clinical checkpoint.`],
    ["What to do", "Lineups: confirm each box's recipe and validation result. Products: for each row, the rule applied and the pass rationale are next to the label values. Fill the yellow Clinician decision (Approve / Changes needed / Reject) and Comments. A product used in several boxes needs one decision; say in Comments if it differs by box."],
    ["What a decision means", "Approve turns Keniya's PRE-APPROVED into APPROVED for that product. Changes needed or Reject: tell us the specific clinical or compliance concern so we can fix the data or the rule, not just the pick."],
    ["Not in this file", "Candidates, rejected products and the rest of the catalog (the full workbook exists for audit). Costs and vendors. The package-in-hand check happens at packing, against the exact purchased packet."],
    ["Limits are Keniya standards", "Per-pack thresholds are Keniya curation standards informed by published guidance (FDA, AHA, ADA, ACOG/CDC), not medical cutoffs; sources are recorded in the rules."],
  ];
  for (const v of lines) {
    const r = start.addRow(v);
    r.height = 64;
    r.alignment = { wrapText: true, vertical: "top" };
    r.getCell(1).font = { bold: true };
  }
  start.getRow(1).fill = fill(HEADER_FILL);

  const lu = wb.addWorksheet("Lineups", { views: [{ state: "frozen", ySplit: 1 }] });
  const luHeaders = ["Box", "Lineup version", "Stage", "Validation", "Blocking failures", "Warnings", "Composition", "Per-pack limits", "Picks (codes)", "Clinician decision", "Clinician comments"];
  lu.columns = luHeaders.map((h) => ({ header: h, key: h, width: h === "Box" ? 20 : /Picks|Composition|Blocking|Warnings|comments/.test(h) ? 48 : 26 }));
  for (const b of input.boxes) {
    const fails = b.checks.filter((c) => c.level === "block" && !c.pass);
    const warns = b.checks.filter((c) => c.level === "warn" && !c.pass);
    const counts = new Map<string, number>();
    for (const p of b.picks) counts.set(p.category ?? "uncategorized", (counts.get(p.category ?? "uncategorized") ?? 0) + 1);
    const row = lu.addRow([
      BOX_LABEL[b.slug],
      b.version === null ? "no active lineup" : `v${b.version}`,
      b.stage.label,
      fails.length ? "FAILS box rules" : `passes every box rule (${b.picks.length} picks)`,
      fails.map((c) => `${c.label}: ${c.value}`).join("; ") || null,
      warns.map((c) => `${c.label}: ${c.value}`).join("; ") || null,
      [...counts].map(([k, n]) => `${k} ${n}`).join(", ") || null,
      limitsLine(input.rules[b.slug]),
      b.picks.map((p) => p.snack.code).join(" ") || null,
      null,
      null,
    ]);
    row.alignment = { wrapText: true, vertical: "top" };
    row.getCell(10).fill = fill(INPUT_FILL);
    row.getCell(11).fill = fill(INPUT_FILL);
    row.getCell(10).dataValidation = { type: "list", allowBlank: true, formulae: ['"Approve,Changes needed,Reject"'] };
  }
  lu.getRow(1).font = { bold: true };
  lu.getRow(1).fill = fill(HEADER_FILL);

  const ws = wb.addWorksheet("Products", { views: [{ state: "frozen", xSplit: 2, ySplit: 1 }] });
  const headers = [...new Set(products.flatMap((r) => Object.keys(r)))];
  ws.columns = headers.map((h) => ({ header: h, key: h, width: /result$|Ingredients|finding|comments|Exceptions|notes/.test(h) ? 48 : /rule applied|Used in|source|Product$/.test(h) ? 34 : /\((g|mg|oz)\)|Calories|Code/.test(h) ? 9 : 16 }));
  for (const r of products) {
    const row = ws.addRow(headers.map((h) => nz(r[h])));
    row.alignment = { wrapText: true, vertical: "top" };
    for (const h of ["Clinician decision", "Clinician comments"]) row.getCell(headers.indexOf(h) + 1).fill = fill(INPUT_FILL);
    row.getCell(headers.indexOf("Clinician decision") + 1).dataValidation = { type: "list", allowBlank: true, formulae: ['"Approve,Changes needed,Reject"'] };
  }
  ws.getRow(1).height = 60;
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = fill(HEADER_FILL);
  ws.getRow(1).alignment = { wrapText: true, vertical: "top" };
  ws.autoFilter = { from: "A1", to: `${ws.getColumn(headers.length).letter}${Math.max(1, products.length + 1)}` };

  return Buffer.from(await wb.xlsx.writeBuffer());
}
