 
// Pre-fill blank P1/P2/P7a/P7b/P8 from label data. Dry run unless --apply; backup to prescreen-backup.json.
import { writeFileSync } from "node:fs";
(async () => {
const APPLY = process.argv.includes("--apply");
const { db, loadCatalog } = await import("../../../src/lib/admin/db");
const cat = await loadCatalog();
const backup: unknown[] = []; let changed = 0;
const MULTI = /\b\d+\s*[- ]?(count|ct|pk)\b|family size|share size|multipack|\bjar\b|\bcanister\b/i;
const SINGLE = /single[- ]?serve|\bpouch\b|\bpacket\b|\bbar\b|100[- ]?cal|\bmini|\bbag\b|\bstick|\bpack\b|\d+(\.\d+)?\s*oz\b|\d+\s*g\b/i;
for (const s of cat.snacks.filter((x) => x.status !== "Retired" && x.status !== "Rejected")) {
  const v = cat.versions.get(s.id)!; const ing = (v.ingredients ?? "").trim();
  const pc: Record<string, string> = { ...(v.pregnancy_checks ?? {}) };
  const blank = (k: string) => !(pc[k] ?? "").trim();
  const f = s.findings ?? [];
  const set: Record<string, string> = {}; const why: string[] = [];
  if (ing) {
    if (blank("P1")) { if (/\braw\b|sprouted/i.test(`${s.name} ${ing}`) || f.some((x) => x.code === "raw_or_unpasteurized" || x.code === "sprouts")) why.push("P1 left for review (raw/sprouted)"); else set.P1 = "PASS"; }
    if (blank("P2")) { const p2 = f.filter((x) => x.check === "P2"); if (/jerky|meat stick|beef stick|salami|pepperoni|biltong/i.test(s.name) && !p2.length) p2.push({ code: "cured_meat", severity: "review", check: "P2", label: "", evidence: "cured meat (name)", kind: "safety", key: "" }); if (p2.some((x) => x.severity === "pregnancy_fail")) set.P2 = "FAIL"; else if (p2.length) why.push(`P2 left for review (${p2.map((x) => x.evidence).join(", ")})`); else set.P2 = "PASS"; }
    if (blank("P7a")) set.P7a = f.some((x) => x.check === "P7a" && x.severity === "pregnancy_fail") ? "FAIL" : "PASS";
    if (blank("P7b")) set.P7b = f.some((x) => x.code === "sugar_alcohol") || (v.sugar_alcohols_g ?? 0) > 0 ? "FAIL" : "PASS";
  } else if (["P1","P2","P7a","P7b"].some(blank)) why.push("no ingredients: P1/P2/P7a/P7b left blank");
  if (blank("P8")) { if (!MULTI.test(s.name) && SINGLE.test(s.name) && (s.unit_wt_oz ?? 99) <= (/pouch/i.test(s.name) ? 4.5 : 3)) set.P8 = "PASS"; else why.push(`P8 left (listing doesn't show one sealed serving: ${s.unit_wt_oz} oz)`); }
  if (!Object.keys(set).length && !why.length) continue;
  console.log(`${s.code} ${s.name.slice(0,44)} :: ${Object.entries(set).map(([k, x]) => `${k}=${x}`).join(" ")}${why.length ? ` | ${why.join("; ")}` : ""}`);
  if (APPLY && Object.keys(set).length) {
    backup.push({ code: s.code, version_id: v.id, before: v.pregnancy_checks });
    const r = await db().from("product_versions").update({ pregnancy_checks: { ...pc, ...set } }).eq("id", v.id);
    if (r.error) console.log(`  ERROR ${r.error.message}`); else changed++;
  }
}
if (APPLY) writeFileSync(process.argv[1].replace(/prescreen\.mts$/, "prescreen-backup.json"), JSON.stringify(backup, null, 2));
console.log(APPLY ? `APPLIED to ${changed} products` : "DRY RUN");
})();
