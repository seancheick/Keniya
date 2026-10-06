/**
 * Proves each box can be built from the live catalog under the live rules, not just that
 * enough products are eligible: runs Build box for every box, then keeps rebuilding with the
 * previous picks excluded to show how many alternate READY lineups exist (inventory resilience).
 *
 *   pnpm box:feasibility            # all boxes, up to 3 alternates each
 *   pnpm box:feasibility heart 5    # one box, up to 5 alternates
 *
 * Needs Node 22+, the Supabase service key in .env.local, and the react-server condition
 * (set by the pnpm script) so `server-only` imports load outside Next. Cost never gates a lineup: the
 * lineup is the shopping list, and cost comes from the purchase lot when you buy.
 */
import { existsSync, readFileSync } from "node:fs";
import { optimize } from "../src/lib/admin/optimizer";
import { blockingFailures } from "../src/lib/admin/rules";
import { loadAdminContext } from "../src/lib/admin/summary";
import { BOX_SLUGS, isBoxSlug } from "../src/lib/admin/types";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
const only = process.argv[2];
const alternates = Number(process.argv[3] ?? 3);
const slugs = only ? (isBoxSlug(only) ? [only] : []) : [...BOX_SLUGS];
if (!slugs.length) {
  console.error(`Unknown box "${only}". Boxes: ${BOX_SLUGS.join(", ")}`);
  process.exit(1);
}

const ctx = await loadAdminContext();
const uncosted: string[] = [];
let failed = false;
for (const slug of slugs) {
  const exclude = new Set(uncosted);
  const found: string[][] = [];
  for (let i = 0; i <= alternates; i++) {
    const r = optimize({ slug, rules: ctx.rules[slug], settings: ctx.settings, snacks: ctx.catalog.snacks, objective: "balanced", packagingOz: ctx.packOz, runSize: ctx.settings.runSize[slug], requireStock: false, excludeIds: [...exclude] });
    const fails = blockingFailures(r.checks);
    if (fails.length) {
      if (i === 0) {
        failed = true;
        console.log(`✕ ${slug}: cannot build a READY lineup — ${fails.map((c) => `${c.label} ${c.value}`).join("; ")}`);
      }
      break;
    }
    found.push(r.picks.map((p) => p.snack.code));
    for (const p of r.picks) exclude.add(p.snack.id);
  }
  if (found.length) {
    console.log(`✓ ${slug}: ${found.length} disjoint READY lineup${found.length === 1 ? "" : "s"} (${ctx.catalog.snacks.length} products in the pool)`);
    found.forEach((codes, i) => console.log(`    ${i === 0 ? "lineup " : "alt " + i + " "}: ${codes.join(" ")}`));
    // Resilience: which single product, if out of stock, leaves the box unbuildable?
    const primary = found[0];
    const fragile: string[] = [];
    for (const code of primary) {
      const id = ctx.catalog.snacks.find((s) => s.code === code)!.id;
      const r = optimize({ slug, rules: ctx.rules[slug], settings: ctx.settings, snacks: ctx.catalog.snacks, objective: "balanced", packagingOz: ctx.packOz, runSize: ctx.settings.runSize[slug], requireStock: false, excludeIds: [...uncosted, id] });
      if (blockingFailures(r.checks).length) fragile.push(code);
    }
    console.log(fragile.length ? `    single points of failure: ${fragile.join(" ")} (the box can't be built without them)` : "    no single product is a point of failure");
  }
}
process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
