import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { settings, snack } from "./__fixtures__/snacks";
import { clinicianPacketWorkbook, limitsLine, packetProductRows, type PacketInput } from "./clinical-packet";
import { DEFAULT_BOX_RULES } from "./types";

const shared = snack({ code: "P001", name: "Almonds", roles: { NS: true }, status: "Pre-approved", clinicianApprovedBy: null });
const heartOnly = snack({ code: "P002", name: "Popcorn", roles: { WG: true } });
const input: PacketInput = {
  boxes: [
    { slug: "heart", version: 4, stage: { label: "READY · PROVISIONAL", detail: "" }, checks: [{ key: "x", label: "Picks without a verified package", value: "2", level: "warn", pass: false, deficit: 2 }], picks: [{ snack: shared, category: "Protein" }, { snack: heartOnly, category: "Savory" }], extras: [] },
    { slug: "blood_sugar", version: 3, stage: { label: "READY · PROVISIONAL", detail: "" }, checks: [], picks: [{ snack: shared, category: "Protein" }], extras: [] },
  ],
  rules: DEFAULT_BOX_RULES,
  policy: settings.policy,
  extra: () => ({ upc: "1", form: "Solid", shelfLife: null, ingredients: "ALMONDS", nutritionSource: "USDA FDC 1", verifiedAt: null, verifiedBy: null, reviewedBy: null, reviewedAt: null, prescreenedBy: "Sean", notes: "[Pre-screen x] fine." }),
};

describe("clinician packet", () => {
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
  it("describes a box with no per-pack limits honestly", () => {
    expect(limitsLine({ ...DEFAULT_BOX_RULES.pregnancy_comfort, caffeineMax: null })).toMatch(/no per-pack limits/);
  });
});
