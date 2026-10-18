 
(async () => {
const { loadAdminContext } = await import("../../../src/lib/admin/summary");
const { eligibleFor } = await import("../../../src/lib/admin/rules");
const { BOX_SLUGS } = await import("../../../src/lib/admin/types");
const ctx = await loadAdminContext();
const FIXABLE = new Set(["PREGNANCY_CHECK_BLANK","SINGLE_SERVE_UNCONFIRMED","NUTRITION_MISSING","SAT_FAT_MISSING","CAFFEINE_UNKNOWN","CAFFEINE_ESTIMATE_HOLD","CLINICIAN_DECISION"]);
const out: Record<string, string[]> = { fits: [], fixable: [], none: [], rejected: [] };
const p8: string[] = [];
for (const s of ctx.catalog.snacks.filter((x) => x.status !== "Retired")) {
  const res = BOX_SLUGS.map((b) => ({ b, e: eligibleFor(b, s, ctx.rules[b], ctx.settings.policy, s.rejectReason) }));
  const fit = res.filter((r) => r.e.fits).map((r) => r.b);
  const could = res.filter((r) => !r.e.fits && (r.e.codes ?? []).every((c) => FIXABLE.has(c))).map((r) => r.b);
  const line = `${s.code} ${s.name.slice(0,45)} [${s.status}] fits:${fit.join(",")||"-"} could:${could.join(",")||"-"}`;
  if (s.status === "Rejected") out.rejected.push(`${s.code} ${s.name.slice(0,45)}: ${s.rejectReason ?? ""}`);
  else if (fit.length) out.fits.push(line); else if (could.length) out.fixable.push(line);
  else out.none.push(`${line} | ${[...new Set(res.flatMap((r) => r.e.reasons))].slice(0,3).join("; ").slice(0,160)}`);
  if (String(s.pregnancy_checks.P8 ?? "") === "") p8.push(`${s.code} ${s.name.slice(0,60)} | ${s.unit_wt_oz} oz | ${s.form}`);
}
for (const [k, v] of Object.entries(out)) console.log(`\n## ${k} (${v.length})\n` + v.join("\n"));
console.log(`\n## P8 blank (${p8.length})\n` + p8.join("\n"));
})();
