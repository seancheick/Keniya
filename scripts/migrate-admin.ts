/**
 * Apply the admin migrations to the live Supabase project through the Management API
 * (works where direct Postgres connections are blocked), then verify the result.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_… pnpm db:migrate          # apply what's missing + verify
 *   SUPABASE_ACCESS_TOKEN=sbp_… pnpm db:migrate --check  # verify only
 *
 * Token: supabase.com → Account → Access Tokens. Project ref defaults to Keniya's.
 * Each migration is skipped when its objects already exist, so re-running is safe.
 */
import { existsSync, readFileSync } from "node:fs";
import { BOX_SLUGS, DEFAULT_BOX_RULES, resolveBoxRules, resolveSettings } from "../src/lib/admin/types";
import { site } from "../src/lib/site";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF ?? process.env.SUPABASE_PROJECT_ID ?? "issfvpyewzlnxxdqrzqc";
if (!token) {
  console.error("Set SUPABASE_ACCESS_TOKEN (supabase.com → Account → Access Tokens).");
  process.exit(1);
}

async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${body.slice(0, 500)}`);
  return body ? (JSON.parse(body) as T[]) : [];
}

const MIGRATIONS: { file: string; applied: string }[] = [
  { file: "supabase/migrations/0006_admin.sql", applied: "select to_regclass('public.shipments') is not null as ok" },
  {
    file: "supabase/migrations/0007_admin_storage_and_fees.sql",
    applied:
      "select exists (select 1 from information_schema.columns where table_schema='public' and table_name='preorders' and column_name='stripe_fee_cents') and exists (select 1 from storage.buckets where id='keniya-admin') as ok",
  },
  {
    file: "supabase/migrations/0008_product_preapproved.sql",
    applied: "select pg_get_constraintdef(oid) like '%Pre-approved%' as ok from pg_constraint where conname='products_status_check'",
  },
  {
    file: "supabase/migrations/0009_product_prescreen_audit.sql",
    applied: "select exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='prescreened_by') as ok",
  },
  {
    file: "supabase/migrations/0010_product_barcode_provenance.sql",
    applied: "select exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='barcode_status') as ok",
  },
  { file: "supabase/migrations/20261006025542_packing_safeguards.sql", applied: "select to_regprocedure('public.pack_shipment_checked(uuid,uuid[],jsonb,uuid,text,integer,integer,numeric,integer)') is not null as ok" },
  { file: "supabase/migrations/20261006030933_admin_function_hardening.sql", applied: "select not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('products_assign_code','purchase_lots_received','adjust_lot','pack_shipment','unpack_shipment','pack_shipment_checked','activate_box_lineup','save_box_lineup','save_package_profile','set_lot_expiry') and not coalesce(p.proconfig @> array['search_path=pg_catalog, public, pg_temp'],false)) and not coalesce(has_function_privilege('anon',to_regprocedure('public.rls_auto_enable()'),'execute'),false) as ok" },
  {
    file: "supabase/migrations/20261007000000_purchase_packs.sql",
    applied: "select to_regclass('public.purchase_packs') is not null and position('purchase_packs' in pg_get_functiondef('public.pack_shipment(uuid,text,integer,integer,numeric,integer)'::regprocedure)) > 0 as ok",
  },
  {
    file: "supabase/migrations/20261007010000_barcode_trigger_fix.sql",
    applied: "select position('normalized' in pg_get_functiondef('public.barcode_one_meaning()'::regprocedure)) > 0 as ok",
  },
  { file: "supabase/migrations/20261008010000_clinical_approval.sql", applied: "select to_regprocedure('public.set_product_review(uuid,text,text,text,text)') is not null as ok" },
  { file: "supabase/migrations/20261008020000_commerce_safeguards.sql", applied: "select to_regprocedure('public.reserve_checkout(uuid,text,integer,text,text,uuid,jsonb,integer,jsonb)') is not null as ok" },
  { file: "supabase/migrations/20261008030000_barcode_identity_transactions.sql", applied: "select to_regclass('public.barcode_identities') is not null and to_regprocedure('public.invalidate_package_check(uuid,timestamptz,jsonb,boolean,text,text)') is not null as ok" },
  { file: "supabase/migrations/20261008040000_public_abuse_controls.sql", applied: "select to_regprocedure('public.allow_public_attempt(text,integer,integer)') is not null as ok" },
  { file: "supabase/migrations/20261008050000_commerce_observation_fencing.sql", applied: "select to_regprocedure('public.bind_checkout_session(uuid,text,text)') is not null and to_regprocedure('public.begin_financial_observation(text)') is not null as ok" },
  { file: "supabase/migrations/20261008060000_payment_admission_provenance.sql", applied: "select to_regprocedure('public.preorder_admission_guard()') is not null as ok" },
];

const TABLES = [
  "vendors", "products", "product_versions", "product_photos", "vendor_prices", "purchase_lots", "stock_movements",
  "barcode_identities", "purchase_packs", "checkout_reservations", "public_attempt_windows",
  "box_rules", "box_lineups", "lineup_items", "package_profiles", "shipments", "shipment_items", "expenses", "admin_settings", "watchlist",
];

const RPCS = ['pack_shipment','unpack_shipment','adjust_lot','pack_shipment_checked','activate_box_lineup','save_box_lineup','save_package_profile','set_lot_expiry','set_product_review','product_diligence_complete','commerce_capacity','reserve_checkout','save_paid_order','save_product','verify_product_package','invalidate_package_check','allow_public_attempt','begin_financial_observation','finish_financial_observation','bind_checkout_session'];

/** Explicit setup only: missing boxes start at zero capacity, never an implicit sale default. */
async function initializeCatalog(write: boolean): Promise<boolean> {
  const rules = await sql<{ box_slug: string; rules: unknown }>("select box_slug,rules from public.box_rules");
  for (const row of rules) if ((BOX_SLUGS as readonly string[]).includes(row.box_slug)) resolveBoxRules(row.box_slug as typeof BOX_SLUGS[number], row.rules);
  const [row] = await sql<{ data: Record<string, unknown> }>("select data from public.admin_settings where id=1");
  if (!row) throw new Error("Save initial admin settings before catalog initialization");
  const prices = { ...row.data.prices as Record<string, number> };
  const runSize = { ...row.data.runSize as Record<string, number> };
  const missingRules = BOX_SLUGS.filter(slug => !rules.some(r => r.box_slug === slug));
  let changed = false;
  for (const slug of BOX_SLUGS) {
    if (prices[slug] === undefined) { prices[slug] = site.preorderPriceUSD * 100; changed = true; }
    if (runSize[slug] === undefined) { runSize[slug] = 0; changed = true; }
  }
  const data = { ...row.data, prices, runSize };
  resolveSettings(data);
  if (!changed && !missingRules.length) return true;
  if (!write) { console.log(`Catalog initialization required: ${missingRules.length} missing rule rows; missing capacities initialize to zero`); return false; }
  const literal = (value: unknown) => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
  const updates = changed ? `update public.admin_settings set data=${literal(data)},updated_at=now(),updated_by='catalog initialization' where id=1 and data=${literal(row.data)}; if not found then raise exception 'Settings changed during initialization'; end if;` : "";
  const inserts = missingRules.map(slug => `insert into public.box_rules(box_slug,rules,updated_by) values('${slug}',${literal(DEFAULT_BOX_RULES[slug])},'catalog initialization') on conflict(box_slug) do nothing;`).join("\n");
  await sql(`begin; do $catalog$ begin ${updates} ${inserts} end $catalog$; commit;`);
  console.log(`Initialized ${missingRules.length} missing box rules; missing founding capacities are zero`);
  return true;
}

async function verify() {
  const rows = await sql<{ relname: string; rls: boolean; policies: number }>(`
    select c.relname, c.relrowsecurity as rls,
      (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname)::int as policies
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname = any(array[${TABLES.map((t) => `'${t}'`).join(",")}])`);
  const missing = TABLES.filter((t) => !rows.some((r) => r.relname === t));
  const open = rows.filter((r) => !r.rls || r.policies > 0);
  const fns = await sql<{ proname: string; anon: boolean; authenticated: boolean }>(`
    select proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as authenticated
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and proname = any(array[${RPCS.map((name) => `'${name}'`).join(",")}])`);
  const bucket = await sql<{ public: boolean }>("select public from storage.buckets where id='keniya-admin'");
  console.log(`Tables: ${rows.length}/${TABLES.length}${missing.length ? ` (missing: ${missing.join(", ")})` : ""}`);
  console.log(`RLS on, no public policies: ${open.length ? `NO → ${open.map((r) => r.relname).join(", ")}` : "yes"}`);
  console.log(`RPCs: ${fns.length}/${RPCS.length}, callable by public API roles: ${fns.some((f) => f.anon || f.authenticated) ? "YES (bad)" : "no"}`);
  console.log(`Private photo bucket: ${bucket[0] ? (bucket[0].public ? "PUBLIC (bad)" : "yes") : "missing"}`);
  return !missing.length && !open.length && fns.length === RPCS.length && !fns.some((f) => f.anon || f.authenticated) && bucket[0]?.public === false;
}

async function main() {
  if (!process.argv.includes("--check")) {
    for (const m of MIGRATIONS) {
      const [{ ok }] = await sql<{ ok: boolean }>(m.applied);
      if (ok) {
        console.log(`✓ ${m.file} already applied`);
        continue;
      }
      // One request = one transaction: a failure leaves nothing half-applied.
      await sql(`begin;\n${readFileSync(m.file, "utf8")}\ncommit;`);
      console.log(`✓ applied ${m.file}`);
    }
  }
  const catalogReady = await initializeCatalog(!process.argv.includes("--check"));
  const ok = await verify() && catalogReady;
  console.log(ok ? "Database ready for the admin." : "Something is off: see above.");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
