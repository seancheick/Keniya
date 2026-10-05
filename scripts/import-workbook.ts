/**
 * One-time (re-runnable) import of keniya-box-builder v4 into the admin database.
 *
 *   pnpm import:workbook ./ops/keniya-box-builder_v4.xlsx --dry-run   # parse + report only
 *   pnpm import:workbook ./ops/keniya-box-builder_v4.xlsx             # write
 *   pnpm import:workbook ./ops/keniya-box-builder_v4.xlsx --force     # also overwrite settings,
 *                                                                     #   box rules and lineups
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * Products upsert on code (P001…): nutrition/checks update the current formula version in
 * place. Settings, rules and lineups are only written when empty unless --force.
 * Business data never enters git: the workbook stays in /ops (gitignored).
 */
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { landedCost } from "../src/lib/admin/costing";
import { checkLineup, fitsBoxes, isReady, nutritionComplete, packedWeightOz } from "../src/lib/admin/rules";
import { BOX_LABEL, BOX_SLUGS, type Snack } from "../src/lib/admin/types";
import { readWorkbook, type WbProduct } from "./workbook";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const args = process.argv.slice(2);
const path = args.find((a) => !a.startsWith("--"));
const dry = args.includes("--dry-run");
const force = args.includes("--force");
if (!path) {
  console.error("Usage: pnpm import:workbook <path-to-xlsx> [--dry-run] [--force]");
  process.exit(1);
}

const toSnack = (p: WbProduct): Snack => ({
  id: p.code,
  code: p.code,
  name: p.name,
  brand: p.brand,
  type: p.type,
  form: p.form,
  status: p.status,
  rejectReason: p.reject_reason,
  categories: p.categories,
  ...p.version,
  allergens: p.version.allergens,
  freeFrom: p.version.free_from,
  unitCostCents: p.quote_cost_cents ?? p.estimate_cost_cents,
  retailCents: p.retail_cents,
  onHand: 0,
  earliestExpiry: null,
  loveRate: null,
});

async function main() {
  const wb = await readWorkbook(path!);
  const snacks = new Map(wb.products.map((p) => [p.code, toSnack(p)]));

  // ---- Report (mirrors the workbook Dashboard)
  const all = [...snacks.values()];
  console.log(`Products: ${all.length}`);
  console.log(`  missing nutrition: ${all.filter((s) => !nutritionComplete(s)).length}`);
  console.log(`  no cost: ${all.filter((s) => s.unitCostCents === null).length}`);
  console.log(`  status: ${["Approved", "Candidate", "Rejected"].map((st) => `${st} ${all.filter((s) => s.status === st).length}`).join(", ")}`);
  for (const b of BOX_SLUGS) console.log(`  fit ${BOX_LABEL[b]}: ${all.filter((s) => fitsBoxes(s)[b].fits).length}`);
  console.log(`  fit all three: ${all.filter((s) => BOX_SLUGS.every((b) => fitsBoxes(s)[b].fits)).length}`);
  for (const b of BOX_SLUGS) {
    const picks = wb.lineups[b].map((l) => ({ snack: snacks.get(l.code)!, category: l.category }));
    const extras = wb.extras[b].map((c) => snacks.get(c)!.unitCostCents);
    const checks = checkLineup(b, wb.rules[b], picks, wb.settings, wb.mailer.emptyOz);
    const weight = packedWeightOz(picks, wb.mailer.emptyOz);
    const table = [...wb.settings.shipping.table].sort((x, y) => x.fromOz - y.fromOz);
    const postage =
      wb.settings.shipping.method === "flat"
        ? wb.settings.shipping.flatCents
        : (wb.settings.shipping.customCents[b] ?? table.filter((t) => weight >= t.fromOz).at(-1)?.cents ?? 0);
    const lc = landedCost({ slug: b, settings: wb.settings, pickCosts: picks.map((p) => p.snack.unitCostCents), extraCosts: extras, mailer: { name: "Mailer", cents: wb.mailer.cents }, postageCents: postage });
    console.log(
      `${BOX_LABEL[b]}: ${picks.length} picks, ${isReady(checks) ? "READY" : `FIX (${checks.filter((c) => c.level === "block" && !c.pass).map((c) => c.label).join("; ")})`}, ` +
        `${weight.toFixed(1)} oz, snacks $${(lc.snackCents / 100).toFixed(2)}, landed $${(lc.totalCents / 100).toFixed(2)}, contribution ${((lc.contributionPct ?? 0) * 100).toFixed(1)}%`,
    );
  }
  if (dry) return console.log("\n--dry-run: nothing written.");

  // ---- Write
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const by = "workbook import";
  const ok = <T,>(r: { data: T; error: { message: string } | null }, what: string) => {
    if (r.error) throw new Error(`${what}: ${r.error.message}`);
    return r.data;
  };

  const ids = new Map<string, string>();
  for (const p of wb.products) {
    // The workbook's "Vendor" column is sourcing research ("Brand wholesale / UNFI"), not a
    // store you bought from: keep it as a note; real vendors come from purchases and quotes.
    const { version, vendor, ...prod } = p;
    const notes = [prod.notes, vendor ? `Sourcing (workbook): ${vendor}` : null].filter(Boolean).join("\n") || null;
    const row = ok(
      await db
        .from("products")
        .upsert({ ...prod, notes, created_by: by, updated_at: new Date().toISOString() }, { onConflict: "code" })
        .select("id")
        .single(),
      `product ${p.code}`,
    ) as { id: string };
    ids.set(p.code, row.id);
    const cur = (await db.from("product_versions").select("id").eq("product_id", row.id).eq("is_current", true).maybeSingle()).data as { id: string } | null;
    if (cur) ok(await db.from("product_versions").update(version).eq("id", cur.id), `version ${p.code}`);
    else ok(await db.from("product_versions").insert({ ...version, product_id: row.id, version: 1, created_by: by }), `version ${p.code}`);
    if (p.estimate_cost_cents !== null) {
      const has = (await db.from("vendor_prices").select("id").eq("product_id", row.id).eq("source", "estimate").limit(1)).data;
      if (!has?.length)
        ok(
          await db.from("vendor_prices").insert({ product_id: row.id, vendor_id: null, unit_cost_cents: p.estimate_cost_cents, source: "estimate", note: vendor ? `Workbook estimate (${vendor})` : "Workbook estimate", created_by: by }),
          `price ${p.code}`,
        );
    }
  }
  console.log(`Upserted ${ids.size} products.`);

  const settingsRow = (await db.from("admin_settings").select("data").eq("id", 1).maybeSingle()).data as { data: object } | null;
  if (force || !settingsRow || Object.keys(settingsRow.data ?? {}).length === 0) {
    ok(await db.from("admin_settings").upsert({ id: 1, data: wb.settings, updated_by: by }), "settings");
    ok(await db.from("package_profiles").update({ cost_cents: wb.mailer.cents, empty_weight_oz: wb.mailer.emptyOz }).eq("is_default", true), "package");
    console.log("Settings written (mailer cost + packaging weight on the default 12×9×4 package).");
  } else console.log("Settings already set: skipped (use --force to overwrite).");

  for (const b of BOX_SLUGS) {
    const hasRules = (await db.from("box_rules").select("box_slug").eq("box_slug", b).maybeSingle()).data;
    if (force || !hasRules) ok(await db.from("box_rules").upsert({ box_slug: b, rules: wb.rules[b], updated_by: by }), `rules ${b}`);
    const active = (await db.from("box_lineups").select("id").eq("box_slug", b).eq("status", "active").maybeSingle()).data;
    if (active && !force) {
      console.log(`${BOX_LABEL[b]}: active lineup exists, skipped.`);
      continue;
    }
    if (active) ok(await db.from("box_lineups").update({ status: "archived" }).eq("id", (active as { id: string }).id), "archive");
    const latest = (await db.from("box_lineups").select("version").eq("box_slug", b).order("version", { ascending: false }).limit(1).maybeSingle()).data as { version: number } | null;
    const lu = ok(
      await db
        .from("box_lineups")
        .insert({ box_slug: b, version: (latest?.version ?? 0) + 1, status: "active", objective: "manual", notes: "Imported from the Box Builder workbook", created_by: by, activated_at: new Date().toISOString() })
        .select("id")
        .single(),
      `lineup ${b}`,
    ) as { id: string };
    const items = [
      ...wb.lineups[b].map((l, i) => ({ lineup_id: lu.id, position: i + 1, product_id: ids.get(l.code)!, category: l.category, is_extra: false })),
      ...wb.extras[b].map((c, i) => ({ lineup_id: lu.id, position: 100 + i, product_id: ids.get(c)!, category: null, is_extra: true })),
    ];
    ok(await db.from("lineup_items").insert(items), `lineup items ${b}`);
    console.log(`${BOX_LABEL[b]}: lineup v${(latest?.version ?? 0) + 1} active (${items.length} items).`);
  }

  if (wb.watchlist.length) ok(await db.from("watchlist").upsert(wb.watchlist, { onConflict: "ingredient" }), "watchlist");
  console.log(`Watchlist: ${wb.watchlist.length} ingredients. Done.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
