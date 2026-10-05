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
];

const TABLES = [
  "vendors", "products", "product_versions", "product_photos", "vendor_prices", "purchase_lots", "stock_movements",
  "box_rules", "box_lineups", "lineup_items", "package_profiles", "shipments", "shipment_items", "expenses", "admin_settings", "watchlist",
];

async function verify() {
  const rows = await sql<{ relname: string; rls: boolean; policies: number }>(`
    select c.relname, c.relrowsecurity as rls,
      (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname)::int as policies
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname = any(array[${TABLES.map((t) => `'${t}'`).join(",")}])`);
  const missing = TABLES.filter((t) => !rows.some((r) => r.relname === t));
  const open = rows.filter((r) => !r.rls || r.policies > 0);
  const fns = await sql<{ proname: string; anon: boolean }>(`
    select proname, has_function_privilege('anon', p.oid, 'execute') as anon
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and proname in ('pack_shipment','unpack_shipment','adjust_lot')`);
  const bucket = await sql<{ public: boolean }>("select public from storage.buckets where id='keniya-admin'");
  console.log(`Tables: ${rows.length}/${TABLES.length}${missing.length ? ` (missing: ${missing.join(", ")})` : ""}`);
  console.log(`RLS on, no public policies: ${open.length ? `NO → ${open.map((r) => r.relname).join(", ")}` : "yes"}`);
  console.log(`RPCs: ${fns.length}/3, callable by anon: ${fns.some((f) => f.anon) ? "YES (bad)" : "no"}`);
  console.log(`Private photo bucket: ${bucket[0] ? (bucket[0].public ? "PUBLIC (bad)" : "yes") : "missing"}`);
  return !missing.length && !open.length && fns.length === 3 && !fns.some((f) => f.anon) && bucket[0]?.public === false;
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
  const ok = await verify();
  console.log(ok ? "Database ready for the admin." : "Something is off: see above.");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
