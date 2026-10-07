import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { settings, snack } from "./__fixtures__/snacks";
import { clinicianPacketWorkbook, limitsLine, packetProductRows, type PacketInput } from "./clinical-packet";
import { DEFAULT_BOX_RULES } from "./types";

const shared = snack({ code: "P001", name: "Almonds", roles: { NS: true }, status: "Pre-approved", clinicianApprovedBy: null });
const heartOnly = snack({ code: "P002", name: "Popcorn", roles: { WG: true } });
const input: PacketInput = {
  audience: "operator",
  boxes: [
    { slug: "heart", version: 4, checks: [{ key: "x", label: "Picks without a verified package", value: "2", level: "warn", pass: false, deficit: 2 }], picks: [{ snack: shared, category: "Protein" }, { snack: heartOnly, category: "Savory" }], extras: [] },
    { slug: "blood_sugar", version: 3, checks: [], picks: [{ snack: shared, category: "Protein" }], extras: [] },
  ],
  rules: DEFAULT_BOX_RULES,
  policy: settings.policy,
  extra: () => ({ upc: "1", form: "Solid", shelfLife: null, ingredients: "ALMONDS", nutritionSource: "USDA FDC 1", verifiedAt: null, verifiedBy: null, reviewedBy: null, reviewedAt: null, prescreenedBy: "Sean", notes: "[Pre-screen x] fine." }),
};

describe("PharmaGuide Team packet", () => {
  it("does not promote historical approval notes over current diligence or box limits", () => {
    const held = { ...input, boxes: [{ ...input.boxes[0], picks: [{ snack: snack({ diligenceComplete: false, status: "Candidate" }), category: null }] }],
      extra: () => ({ ...input.extra("x")!, notes: "[Pre-screen old] Pre-approved, awaiting PharmaGuide Team" }) };
    expect(packetProductRows(held)[0]["Keniya recommendation"]).toBe("Hold — complete internal diligence");
    const fail = { ...held, boxes: [{ ...held.boxes[0], picks: [{ snack: snack({ sodium_mg: 180, diligenceComplete: true }), category: null }] }] };
    expect(packetProductRows(fail)[0]["Keniya recommendation"]).toBe("Do not approve for these boxes");
    const ready = { ...held, boxes: [{ ...held.boxes[0], picks: [{ snack: snack({ diligenceComplete: true, status: "Pre-approved", clinicalDecision: "pending", clinicianApprovedBy: null }), category: null }] }] };
    expect(packetProductRows(ready)[0]["Keniya recommendation"]).toBe("Recommend Approve — PharmaGuide Team decision required");
  });
  it("includes completed proposals in Laurie's packet and excludes failed lineups or held extras", () => {
    const ready: PacketInput = { ...input, audience: "clinician", boxes: [{ ...input.boxes[0], state: "draft", checks: [], picks: [{ snack: shared, category: "Protein" }], extras: [] }] };
    expect(packetProductRows(ready).map((r) => r.Code)).toEqual(["P001"]);
    expect(packetProductRows({ ...ready, boxes: [{ ...ready.boxes[0], checks: [{ key: "gap", label: "Missing picks", value: "1", level: "block", pass: false, deficit: 1 }] }] })).toEqual([]);
    expect(packetProductRows({ ...ready, boxes: [{ ...ready.boxes[0], extras: [snack({ diligenceComplete: false })] }] })).toEqual([]);
    expect(packetProductRows({ ...ready, boxes: [{ ...ready.boxes[0], picks: [{ snack: { ...shared, clinicalDecision: "changes_requested" }, category: "Protein" }] }] })).toEqual([]);
  });
  it("has one row per product used, with the rule and rationale for each box it serves", () => {
    const rows = packetProductRows(input);
    expect(rows.map((r) => r.Code)).toEqual(["P001", "P002"]);
    expect(rows[0]["Used in"]).toBe("Heart (Protein); Blood Sugar (Protein)");
    expect(String(rows[0]["Heart: result"])).toMatch(/^PASS via Nut \/ seed/);
    expect(String(rows[0]["Heart: rule applied"])).toContain(`sodium ≤${DEFAULT_BOX_RULES.heart.sodiumMax} mg`);
    expect(rows[0]["Blood Sugar: result"]).toMatch(/^PASS/);
    expect(rows[1]["Blood Sugar: result"]).toBeUndefined();
    expect(Object.keys(rows[0]).some((k) => /cost|vendor|price/i.test(k))).toBe(false);
  });
  it("writes Start here, Lineups and Products sheets", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await clinicianPacketWorkbook(input)) as never);
    expect(wb.worksheets.map((s) => s.name)).toEqual(["Start here", "Lineups", "Products"]);
    expect(wb.getWorksheet("Lineups")!.rowCount).toBe(3);
    expect(wb.getWorksheet("Products")!.rowCount).toBe(3);
    expect(wb.getWorksheet("Lineups")!.getRow(2).getCell(4).value).toBe("passes every box rule (2 picks)");
  });
  it("reports missing lineups, failed checks and incomplete reviews without blanket approval claims", async () => {
    const incomplete: PacketInput = { ...input, boxes: [
      { ...input.boxes[0], version: null, picks: [], checks: [] },
      { ...input.boxes[1], checks: [{ key: "missing", label: "Selections missing", value: "1", level: "block", pass: false, deficit: 1 }],
        picks: [{ snack: snack({ status: "Candidate", diligenceComplete: false, clinicalDecision: "pending", packageVerified: false }), category: null }] },
    ] };
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await clinicianPacketWorkbook(incomplete) as never);
    const intro = String(wb.getWorksheet("Start here")!.getRow(1).getCell(2).value);
    expect(intro).toContain("2 lineups missing or failing checks");
    expect(intro).toContain("1 products need internal diligence");
    expect(intro).not.toContain("diligence is complete");
    expect(wb.getWorksheet("Lineups")!.getRow(2).getCell(4).value).toBe("No active lineup to validate");
    expect(wb.getWorksheet("Lineups")!.getRow(3).getCell(3).value).toBe("FIX");
    expect(wb.getWorksheet("Lineups")!.getRow(3).getCell(4).value).toBe("FAILS box rules");
  });
  it("exports an empty packet", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await clinicianPacketWorkbook({ ...input, boxes: [] }) as never);
    expect(wb.getWorksheet("Products")!.rowCount).toBe(1);
  });
  it("keeps a review draft visibly unreleased even when its box rules pass", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await clinicianPacketWorkbook({ ...input, boxes: [{ ...input.boxes[0], state: "draft", checks: [] }] }) as never);
    expect(wb.getWorksheet("Lineups")!.getRow(2).getCell(3).value).toBe("DRAFT — operator work required");
    expect(String(wb.getWorksheet("Start here")!.getRow(1).getCell(2).value)).toContain("1 lineups missing or failing checks");
  });
  it("describes a box with no per-pack limits honestly", () => {
    expect(limitsLine({ ...DEFAULT_BOX_RULES.pregnancy_comfort, caffeineMax: null })).toMatch(/no per-pack limits/);
  });
});
