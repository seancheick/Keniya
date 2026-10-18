 
// Fill missing label fields (nulls only) for live candidates from USDA FDC, then Open Food Facts.
// Dry run by default; --apply writes. Backup of every changed row goes to fill-backup.json.
import { writeFileSync } from "node:fs";
(async () => {
const APPLY = process.argv.includes("--apply");
const { db, loadCatalog } = await import("../../../src/lib/admin/db");
const { mapFdcFood, sameUpc } = await import("../../../src/lib/admin/fdc");
const { mapOffProduct, OFF_FIELDS } = await import("../../../src/lib/admin/openfoodfacts");
const get = async (u: string) => { try { const r = await fetch(u, { headers: { "User-Agent": "KeniyaAdmin/1.0 (keniyahealth.com)" }, signal: AbortSignal.timeout(10000) }); return r.ok ? await r.json() : null; } catch { return null; } };
const key = process.env.USDA_API_KEY || "DEMO_KEY";
const cat = await loadCatalog();
const NUM = ["calories","protein_g","fiber_g","carbs_g","added_sugar_g","sodium_mg","sat_fat_g"] as const;
const backup: unknown[] = [];
for (const p of cat.products.filter((x) => x.status !== "Retired" && x.status !== "Rejected")) {
  const v = cat.versions.get(p.id); if (!v) continue;
  const missing = [...NUM.filter((k) => v[k] === null || v[k] === undefined), ...(!v.ingredients?.trim() ? ["ingredients"] : []), ...(!v.allergens?.trim() ? ["allergens"] : [])];
  if (!missing.length) continue;
  const upc = (p.upc ?? "").replace(/\D/g, "");
  if (!upc) { console.log(`${p.code} ${p.name.slice(0,40)}: missing ${missing.join(",")} — no UPC on file`); continue; }
  const s = await get(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}&dataType=Branded&pageSize=10&query=${upc.replace(/^0+/, "")}`);
  const hit = s?.foods?.find((f: { gtinUpc?: string }) => sameUpc(f.gtinUpc, upc));
  const det = hit ? await get(`https://api.nal.usda.gov/fdc/v1/food/${hit.fdcId}?api_key=${key}`) : null;
  const usda = hit ? mapFdcFood(upc, { ...hit, ...(det ?? {}) }) : null;
  const offR = await get(`https://world.openfoodfacts.org/api/v2/product/${upc}.json?fields=${OFF_FIELDS}`);
  const off = offR?.status === 1 && offR.product ? mapOffProduct(upc, offR.product) : null;
  const packG = typeof v.unit_wt_oz === "number" ? v.unit_wt_oz * 28.3495 : null;
  const servG = (src: { serving?: string | null } | null) => { const m = src?.serving?.match(/([\d.]+)\s*g\b/i); return m ? Number(m[1]) : null; };
  const patch: Record<string, unknown> = {}; const notes: string[] = [];
  for (const k of NUM) {
    if (v[k] !== null && v[k] !== undefined) continue;
    for (const [name, src] of [["USDA", usda], ["OFF", off]] as const) {
      const val = src?.nutrition?.[k];
      if (typeof val !== "number") continue;
      const sg = servG(src); const f = packG && sg ? packG / sg : 1;
      const out = Math.abs(f - 1) <= 0.15 ? val : Math.round(val * f * 10) / 10;
      patch[k] = k === "calories" || k === "sodium_mg" ? Math.round(out) : out;
      notes.push(`${k}=${patch[k]} (${name}${Math.abs(f - 1) > 0.15 ? ` ×${f.toFixed(2)} to pack` : ""})`);
      break;
    }
  }
  if (!v.ingredients?.trim()) { const ing = usda?.ingredients || off?.ingredients; if (ing) { patch.ingredients = ing; notes.push(`ingredients (${usda?.ingredients ? "USDA" : "OFF"})`); } }
  if (!v.allergens?.trim() && off?.allergens) { patch.allergens = off.allergens; notes.push("allergens (OFF)"); }
  const still = missing.filter((m) => !(m in patch));
  console.log(`${p.code} ${p.name.slice(0,40)}: ${notes.join("; ") || "nothing found"}${still.length ? ` | still missing: ${still.join(",")}` : ""}`);
  if (APPLY && Object.keys(patch).length) {
    backup.push({ version_id: v.id, code: p.code, before: Object.fromEntries(Object.keys(patch).map((k) => [k, (v as Record<string, unknown>)[k]])) });
    const r = await db().from("product_versions").update(patch).eq("id", v.id);
    if (r.error) console.log(`  ERROR ${r.error.message}`);
  }
}
if (APPLY) writeFileSync(process.argv[1].replace(/fill\.mts$/, "fill-backup.json"), JSON.stringify(backup, null, 2));
console.log(APPLY ? "APPLIED" : "DRY RUN (use --apply)");
})();
