 
(async () => {
const APPLY = process.argv.includes("--apply");
const { db } = await import("../../../src/lib/admin/db");
const { loadAdminContext } = await import("../../../src/lib/admin/summary");
const { optimize } = await import("../../../src/lib/admin/optimizer");
const { eligibleFor, blockingFailures } = await import("../../../src/lib/admin/rules");
const { BOX_SLUGS, BOX_LABEL } = await import("../../../src/lib/admin/types");
const ctx = await loadAdminContext();
for (const slug of BOX_SLUGS) {
  const r = ctx.rules[slug];
  const elig = ctx.catalog.snacks.filter((s) => s.status !== "Retired" && s.status !== "Rejected" && eligibleFor(slug, s, r, ctx.settings.policy, s.rejectReason).fits);
  const byCat = r.categories.map((c) => `${c.name} ${elig.filter((s) => s.categories.includes(c.name)).length}/${c.min}`).join(", ");
  const res = optimize({ slug, rules: r, settings: ctx.settings, snacks: ctx.catalog.snacks, objective: "balanced", packagingOz: ctx.packOz, requireStock: false });
  const fails = blockingFailures(res.checks);
  console.log(`\n${BOX_LABEL[slug]}: ${elig.length} eligible (${byCat}) → ${res.picks.length}/${r.total} picks, ${fails.length ? "FIX: " + fails.map((c) => `${c.label} ${c.value}`).join("; ") : "COMPLETE"}`);
  console.log("   " + res.picks.map((p) => `${p.snack.code} ${p.snack.name.slice(0, 28)} [${p.category}]`).join("\n   "));
  if (APPLY && res.picks.length) {
    const items = res.picks.map((p) => ({ product_id: p.snack.id, category: p.category, is_extra: false }));
    const ins = await db().rpc("save_box_lineup", { p_slug: slug, p_objective: "balanced", p_notes: `Draft built from the eligible catalog on 2026-10-18 (Claude, owner request). ${fails.length ? "Incomplete: " + fails.map((c) => c.label).join("; ") : "Passes every box rule."} Needs PharmaGuide Team approval before activation.`, p_activate: false, p_actor: "Claude (owner request 2026-10-18)", p_items: items });
    console.log(ins.error ? `   ERROR ${ins.error.message}` : `   saved draft ${ins.data}`);
  }
}
})();
