/* eslint-disable @typescript-eslint/no-explicit-any -- one-off ops scripts kept for the record */
import { writeFileSync } from "node:fs";
(async () => {
const { db } = await import("../../../src/lib/admin/db");
const { loadAdminContext } = await import("../../../src/lib/admin/summary");
const { giTolerabilityFlags } = await import("../../../src/lib/admin/rules");
const { BOX_SLUGS, BOX_LABEL } = await import("../../../src/lib/admin/types");
const ctx = await loadAdminContext();
const byId = new Map(ctx.catalog.snacks.map((s) => [s.id, s]));
const out: any = { boxes: {}, products: {} };
for (const slug of BOX_SLUGS) {
  const l = await db().from("box_lineups").select("id,version,status,lineup_items(position,product_id,category)").eq("box_slug", slug).eq("status", "draft").order("version", { ascending: false }).limit(1).single();
  const items = (l.data as any).lineup_items.sort((a: any, b: any) => a.position - b.position);
  out.boxes[slug] = { label: BOX_LABEL[slug], items: items.map((i: any) => ({ code: byId.get(i.product_id)!.code, category: i.category })) };
  for (const i of items) {
    const s: any = byId.get(i.product_id)!;
    out.products[s.code] ??= { code: s.code, name: s.name, oz: s.unit_wt_oz, status: s.status, cal: s.calories, protein: s.protein_g, fiber: s.fiber_g, carbs: s.carbs_g, addedSugar: s.added_sugar_g, sodium: s.sodium_mg, satFat: s.sat_fat_g, caffeine: s.caffeine_mg, sugarAlc: s.sugar_alcohols_g, ingredients: s.ingredients, allergens: s.allergens, checks: s.pregnancy_checks, findings: (s.findings ?? []).map((f: any) => `${f.severity} ${f.check} ${f.code}: ${f.evidence}`), gi: giTolerabilityFlags(s), boxes: [] };
    out.products[s.code].boxes.push(slug);
  }
}
writeFileSync("packet.json", JSON.stringify(out, null, 1));
console.log(Object.keys(out.products).length, "products");
})();
