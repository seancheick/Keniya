// Parse keniya-box-builder (v4 or v5) into admin rows. Pure: no database. Used by import-workbook.ts.
// Reads only input cells (the workbook has no cached formula results); everything computed
// in Excel is recomputed by src/lib/admin (rules, costing).
import ExcelJS from "exceljs";
import {
  BOX_SLUGS,
  DEFAULT_BOX_RULES,
  DEFAULT_SETTINGS,
  FORMS,
  PRODUCT_TYPES,
  type BoxRules,
  type BoxSlug,
  type Settings,
} from "../src/lib/admin/types";

type Cell = ExcelJS.CellValue;

function text(v: Cell): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") {
    if ("formula" in v || "sharedFormula" in v) return null; // computed in Excel; recomputed here
    if ("richText" in v) return v.richText.map((r) => r.text).join("").trim() || null;
    if ("text" in v) return String(v.text).trim() || null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return null;
  }
  const s = String(v).trim();
  return s === "" ? null : s;
}
function num(v: Cell): number | null {
  if (typeof v === "number") return v;
  const t = text(v);
  if (t === null) return null;
  const x = Number(t.replace(/[$,\s]/g, ""));
  return Number.isFinite(x) ? x : null;
}
const yes = (v: Cell) => /^y(es)?$/i.test(text(v) ?? "");

export type WbProduct = {
  code: string;
  name: string;
  brand: string | null;
  type: (typeof PRODUCT_TYPES)[number];
  form: (typeof FORMS)[number];
  vendor: string | null;
  url: string | null;
  estimate_cost_cents: number | null;
  quote_cost_cents: number | null;
  price_checked_on: string | null;
  retail_cents: number | null;
  status: "Candidate" | "Pre-approved" | "Approved" | "Rejected" | "Retired";
  reject_reason: string | null;
  notes: string | null;
  sensory: string | null;
  categories: string[];
  version: {
    unit_wt_oz: number | null;
    calories: number | null;
    protein_g: number | null;
    fiber_g: number | null;
    carbs_g: number | null;
    added_sugar_g: number | null;
    sodium_mg: number | null;
    caffeine_mg: number | null;
    sat_fat_g: number | null;
    sugar_alcohols_g: number | null;
    allergens: string | null;
    shelf_life: string | null;
    nutrition_source: string | null;
    pregnancy_checks: Record<string, string>;
    roles: Record<string, boolean>;
    free_from: Record<string, boolean>;
  };
};

export type Workbook = {
  products: WbProduct[];
  settings: Settings;
  mailer: { cents: number; emptyOz: number };
  lineups: Record<BoxSlug, { code: string; category: string | null }[]>;
  extras: Record<BoxSlug, string[]>;
  rules: Record<BoxSlug, BoxRules>;
  watchlist: { ingredient: string; category: string | null; why: string | null; source: string | null; reviewed_on: string | null; refs: string | null }[];
};

const BOX_BY_NAME: Record<string, BoxSlug> = { Pregnancy: "pregnancy_comfort", "Carb Conscious": "blood_sugar", Heart: "heart" };
const BUILDER: Record<BoxSlug, { sheet: string; first: number }> = {
  pregnancy_comfort: { sheet: "Builder — Pregnancy", first: 21 },
  blood_sugar: { sheet: "Builder — Carb Conscious", first: 20 },
  heart: { sheet: "Builder — Heart", first: 21 },
};
// Products columns are found by their row-4 header (first line, prefix match), so inserted
// columns (v5 added the stock block after "Your quote $") don't shift what we read.
const CHECK_COLS: [string, string][] = [
  ["P1", "P1"], ["P2", "P2"], ["P3", "P3"], ["P4", "P4"], ["P5", "P5"], ["P6", "P6"],
  ["P7a", "P7a"], ["P7b", "P7b"], ["P8", "P8"], ["P9", "P9"], ["P7c", "P7c"],
];
const ROLE_COLS: [string, string][] = [["UF", "UF"], ["NS", "NS"], ["WG", "WG"], ["MF", "MF"], ["CT", "CT"], ["Whole-food fat/protein", "WHOLE_FOOD"]];
const FF_COLS: [string, string][] = [
  ["Vegan", "vegan"], ["Gluten-free", "gluten_free"], ["Dairy-free", "dairy_free"],
  ["Peanut-free", "peanut_free"], ["Tree-nut-free", "tree_nut_free"], ["Soy-free", "soy_free"],
];

const cleanVendor = (v: string | null) => v?.split("(")[0].split(" - ")[0].trim().slice(0, 120) || null;
const cents = (d: number | null) => (d === null ? null : Math.round(d * 10_000) / 100);

export async function readWorkbook(path: string): Promise<Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const sheet = (name: string) => {
    const s = wb.getWorksheet(name);
    if (!s) throw new Error(`Sheet "${name}" not found: is this keniya-box-builder v4 or v5?`);
    return s;
  };

  // ---- Products
  const P = sheet("Products");
  const headers = new Map<string, number>();
  P.getRow(4).eachCell((cell, i) => {
    const h = text(cell.value)?.split("\n")[0].trim();
    if (h && !headers.has(h)) headers.set(h, i);
  });
  // Exact header first, else the one header that starts with the key ("P7c" → "P7c (info only)").
  const colOf = (key: string) => {
    const exact = headers.get(key);
    if (exact) return exact;
    const hits = [...headers.keys()].filter((h) => h.startsWith(key));
    if (hits.length !== 1) throw new Error(`Products: ${hits.length ? "ambiguous" : "no"} column for "${key}" (${hits.join(", ")})`);
    return headers.get(hits[0])!;
  };
  const COL = Object.fromEntries(
    [
      "ID", "Product", "Brand", "Type", "Form", "Vendor", "URL", "Estimated unit cost $", "Your quote $",
      "Price checked on", "Typical retail $", "Unit wt oz", "Calories", "Protein g", "Fiber g", "Carbs g",
      "Added sugar g", "Sodium mg", "Caffeine mg", "Sat fat g", "Sugar alcohols g", "Allergens", "Shelf life",
      "Nutrition source", "Status", "Notes", "Sensory profile",
      ...[...CHECK_COLS, ...ROLE_COLS, ...FF_COLS].map(([h]) => h),
    ].map((h) => [h, colOf(h)]),
  );
  const products: WbProduct[] = [];
  for (let r = 5; r <= P.rowCount; r++) {
    const row = P.getRow(r);
    const c = (header: string) => row.getCell(COL[header]).value;
    const code = text(c("ID"));
    const name = text(c("Product"));
    if (!code || !name) continue;
    const type = text(c("Type"));
    const form = text(c("Form"));
    const status = (text(c("Status")) ?? "Candidate") as WbProduct["status"];
    const notes = text(c("Notes"));
    products.push({
      code,
      name,
      brand: text(c("Brand")),
      type: (PRODUCT_TYPES as readonly string[]).includes(type ?? "") ? (type as WbProduct["type"]) : "Substantial",
      form: (FORMS as readonly string[]).includes(form ?? "") ? (form as WbProduct["form"]) : "Solid",
      vendor: cleanVendor(text(c("Vendor"))),
      url: text(c("URL"))?.replace(/\)$/, "") ?? null,
      estimate_cost_cents: cents(num(c("Estimated unit cost $"))),
      quote_cost_cents: cents(num(c("Your quote $"))),
      price_checked_on: text(c("Price checked on")),
      retail_cents: num(c("Typical retail $")) === null ? null : Math.round(num(c("Typical retail $"))! * 100),
      status: ["Candidate", "Pre-approved", "Approved", "Rejected", "Retired"].includes(status) ? status : "Candidate",
      reject_reason: status === "Rejected" ? (notes?.slice(0, 300) ?? "Rejected in the workbook") : null,
      notes,
      sensory: text(c("Sensory profile")),
      categories: [],
      version: {
        unit_wt_oz: num(c("Unit wt oz")),
        calories: num(c("Calories")),
        protein_g: num(c("Protein g")),
        fiber_g: num(c("Fiber g")),
        carbs_g: num(c("Carbs g")),
        added_sugar_g: num(c("Added sugar g")),
        sodium_mg: num(c("Sodium mg")),
        caffeine_mg: num(c("Caffeine mg")),
        sat_fat_g: num(c("Sat fat g")),
        sugar_alcohols_g: num(c("Sugar alcohols g")),
        allergens: text(c("Allergens")),
        shelf_life: text(c("Shelf life")),
        nutrition_source: text(c("Nutrition source"))?.slice(0, 60) ?? null,
        pregnancy_checks: Object.fromEntries(CHECK_COLS.flatMap(([col, k]) => (text(c(col)) ? [[k, text(c(col))!.slice(0, 120)]] : []))),
        roles: Object.fromEntries(ROLE_COLS.flatMap(([col, k]) => (yes(c(col)) ? [[k, true]] : []))),
        free_from: Object.fromEntries(
          FF_COLS.flatMap(([col, k]): [string, boolean][] => {
            const v = text(c(col));
            return v === "Compatible" ? [[k, true]] : v === "No" ? [[k, false]] : [];
          }),
        ),
      },
    });
  }
  const byName = new Map(products.map((p) => [p.name, p]));
  const byCode = new Map(products.map((p) => [p.code, p]));

  // ---- Slots → categories per product, category counts per box
  const S = sheet("Slots");
  const slotCats: Record<BoxSlug, (string | null)[]> = { pregnancy_comfort: [], blood_sugar: [], heart: [] };
  for (let r = 5; r <= S.rowCount; r++) {
    const row = S.getRow(r);
    const box = BOX_BY_NAME[text(row.getCell("A").value) ?? ""];
    const slot = num(row.getCell("B").value);
    if (!box || !slot) continue;
    const cat = text(row.getCell("D").value);
    slotCats[box][slot - 1] = cat;
    for (const col of ["E", "F", "G"]) {
      const p = byCode.get(text(row.getCell(col).value) ?? "");
      if (p && cat && !p.categories.includes(cat)) p.categories.push(cat);
    }
  }

  // ---- Builders → current lineup (+ extras)
  const lineups = { pregnancy_comfort: [], blood_sugar: [], heart: [] } as Workbook["lineups"];
  const extras = { pregnancy_comfort: [], blood_sugar: [], heart: [] } as Workbook["extras"];
  const rules = {} as Workbook["rules"];
  for (const box of BOX_SLUGS) {
    const B = sheet(BUILDER[box].sheet);
    for (let i = 0; i < 14; i++) {
      const name = text(B.getRow(BUILDER[box].first + i).getCell("B").value);
      const p = name ? byName.get(name) : undefined;
      if (p) lineups[box].push({ code: p.code, category: slotCats[box][i] ?? p.categories[0] ?? null });
    }
    // Extras sit after the selections table ("Extra 1 (product name)").
    for (let r = BUILDER[box].first + 15; r <= B.rowCount; r++) {
      const label = text(B.getRow(r).getCell("A").value) ?? "";
      const name = text(B.getRow(r).getCell("B").value);
      if (/^Extra \d/.test(label) && name && byName.get(name)) extras[box].push(byName.get(name)!.code);
    }
    // Category ranges: the workbook's slot counts ±1.
    const counts = new Map<string, number>();
    for (const c of slotCats[box]) if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    rules[box] = {
      ...DEFAULT_BOX_RULES[box],
      categories: [...counts.entries()].map(([name, n]) => ({ name, min: Math.max(0, n - 1), max: n + 1 })),
    };
  }

  // ---- Settings
  const T = sheet("Settings");
  const v = (addr: string) => num(T.getCell(addr).value);
  const $ = (addr: string) => Math.round((v(addr) ?? 0) * 100);
  const method = text(T.getCell("B10").value) ?? "Weight table";
  const allowed = [35, 36, 37, 38, 39, 40]
    .filter((r) => /^y/i.test(text(T.getCell(`B${r}`).value) ?? ""))
    .map((r) => text(T.getCell(`A${r}`).value))
    .filter((f): f is (typeof FORMS)[number] => (FORMS as readonly string[]).includes(f ?? ""));
  const flatRateBox = /flat-rate box/i.test(text(T.getCell("B26").value) ?? "");
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    prices: { pregnancy_comfort: $("B5"), blood_sugar: $("B6"), heart: $("B7") },
    runSize: { pregnancy_comfort: v("C5") ?? 50, blood_sugar: v("C6") ?? 50, heart: v("C7") ?? 50 },
    shipping: {
      ...DEFAULT_SETTINGS.shipping,
      method: /flat/i.test(method) ? "flat" : /custom/i.test(method) ? "custom" : "table",
      flatCents: $("B11"),
      customCents: {
        pregnancy_comfort: v("B12") === null ? null : $("B12"),
        blood_sugar: v("B13") === null ? null : $("B13"),
        heart: v("B14") === null ? null : $("B14"),
      },
      varianceCents: $("B15"),
      table: [18, 19, 20, 21, 22, 23].filter((r) => v(`A${r}`) !== null).map((r) => ({ fromOz: v(`A${r}`)!, cents: $(`B${r}`) })),
    },
    packaging: [
      { name: "Packed for You card", cents: $("B28"), weightOz: 0 },
      { name: "Gift note (blended)", cents: $("B29"), weightOz: 0 },
      { name: "Filler / tissue", cents: $("B30"), weightOz: 0 },
    ],
    overheads: [
      { name: "Pick / pack labor", cents: $("B45") },
      { name: "Receiving labor", cents: $("B46") },
      { name: "Inbound freight", cents: $("B47") },
      { name: "Storage", cents: $("B48") },
      { name: "Refund reserve", cents: $("B52") },
      { name: "Marketing / CAC", cents: $("B53") },
      { name: "Discount / promo", cents: $("B54") },
    ],
    fees: { pct: v("B49") ?? 0.029, fixedCents: $("B50") },
    wastePct: v("B51") ?? 0,
    purchaseBufferPct: v("B55") ?? 0.05,
    policy: { allowedForms: allowed.length ? allowed : DEFAULT_SETTINGS.policy.allowedForms, maxItemOz: v("B41") ?? 3.5, maxBoxOz: v("B42") ?? 32 },
  };

  // ---- Watchlist
  const W = sheet("Ingredient Watchlist");
  const watchlist: Workbook["watchlist"] = [];
  for (let r = 5; r <= W.rowCount; r++) {
    const row = W.getRow(r);
    const ingredient = text(row.getCell("A").value)?.toLowerCase();
    if (!ingredient || watchlist.some((w) => w.ingredient === ingredient)) continue;
    watchlist.push({
      ingredient,
      category: text(row.getCell("B").value),
      why: text(row.getCell("C").value),
      source: text(row.getCell("D").value),
      reviewed_on: text(row.getCell("E").value),
      refs: text(row.getCell("F").value),
    });
  }

  return {
    products,
    settings,
    // The workbook's "Packaging + filler weight" rides on the mailer (one number in v4).
    mailer: { cents: flatRateBox ? 0 : $("B27"), emptyOz: v("B31") ?? 0 },
    lineups,
    extras,
    rules,
    watchlist,
  };
}
