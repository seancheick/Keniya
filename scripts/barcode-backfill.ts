/**
 * Barcode identity backfill: find the GTIN/UPC for catalog products that have none, from
 * independent sources, and record the provenance. Identity only; the label is verified
 * separately (Verify screen, package in hand).
 *
 *   pnpm barcode:backfill              # dry run: prints what each product would get
 *   pnpm barcode:backfill --apply      # writes upc (provisional/high only) + provenance
 *   pnpm barcode:backfill P044 --apply # one product
 *
 * Sources, in order: USDA FoodData Central (label records with gtinUpc), Open Food Facts
 * (search-a-licious), UPCitemdb (trial API, 100 requests/day, used only when the first two
 * don't already agree). A match must satisfy brand + name words + individual pack size; a
 * fuzzy name hit alone is never enough. Rules in src/lib/admin/barcode.ts: one source =
 * candidate (not written to `upc`), two agreeing or USDA exact variant = provisional, three
 * = high, disagreement = conflict (left for GS1 / manufacturer / the package).
 */
import { expireInvalidCheckoutSessions } from "../src/lib/commerce-reconcile";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { barcodeVerdict, cleanBarcode, gtin14, printedForm, validCheckDigit, type BarcodeSource } from "../src/lib/admin/barcode";
import { db } from "../src/lib/admin/db";
import { BOX_SLUGS } from "../src/lib/admin/types";
import type { FdcFood } from "../src/lib/admin/fdc";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

process.env.NEXT_PUBLIC_SUPABASE_URL ??= process.env.SUPABASE_URL;

const UA = "KeniyaAdmin/1.0 (keniyahealth.com)";
const KEY = process.env.USDA_API_KEY ?? "DEMO_KEY";
const STOP = new Set(["the", "and", "of", "with", "oz", "pack", "packs", "packet", "packets", "single", "serve", "single-serve", "bag", "bags", "snack", "snacks", "original", "organic", "mini", "minis", "count", "ct"]);
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9.+& ]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w) && !/^\d+(\.\d+)?$/.test(w));
/** "1.2 oz/35 g", "7.5 ONZ", "1 bar (52g)" → ounces; null when no size is stated. */
const sizeOf = (s: string) => {
  const oz = s.match(/([\d.]+)\s*(?:fl\s*)?(?:oz|onz|oza|ounce)/i);
  if (oz) return Number(oz[1]);
  const g = s.match(/([\d.]+)\s*(?:g|grm|gram)\b/i);
  return g ? Number(g[1]) / 28.3495 : null;
};
const closeOz = (a: number | null, b: number | null) => a !== null && b !== null && Math.abs(a - b) <= Math.max(0.12, 0.15 * a);

type Product = { id: string; code: string; name: string; brand: string | null; upc: string | null; status: string; barcode_status: string; unit_wt_oz: number | null };

async function json<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, headers: { "User-Agent": UA, Accept: "application/json", ...(init?.headers ?? {}) }, signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Exact variant = brand matches, the name words overlap both ways (so "Garlic Herb" can't
 * stand in for "Cheddar"), and the individual pack size is known and agrees. Anything less
 * is a name-only hit: recorded, never trusted on its own.
 */
function match(p: Product, recordBrand: string, recordName: string, recordOz: number | null): { ok: boolean; exact: boolean; why: string } {
  const brand = (p.brand ?? "").toLowerCase().replace(/\(.*?\)/g, "").trim();
  const brandWords = words(brand);
  const brandHit = !brand || recordBrand.toLowerCase().includes(brand.split(" ")[0]) || recordName.toLowerCase().includes(brand.split(" ")[0]);
  const want = new Set(words(p.name).filter((w) => !brandWords.includes(w)));
  const have = new Set(words(recordName).filter((w) => !brandWords.includes(w)));
  const inter = [...want].filter((w) => have.has(w)).length;
  const union = new Set([...want, ...have]).size;
  const nameHit = union === 0 || inter / union >= 0.6;
  const sizeKnown = p.unit_wt_oz !== null && recordOz !== null;
  const sizeHit = sizeKnown && closeOz(p.unit_wt_oz, recordOz);
  const ok = brandHit && nameHit;
  return { ok, exact: ok && sizeHit, why: `${brandHit ? "brand✓" : "brand✗"} words ${inter}/${union} ${sizeKnown ? (sizeHit ? "size✓" : `size✗ (${recordOz?.toFixed(2)} vs ${p.unit_wt_oz})`) : "size?"}` };
}

async function fromUsda(p: Product, at: string): Promise<BarcodeSource | null> {
  const q = `${p.brand ?? ""} ${p.name}`.replace(/\(.*?\)/g, "").trim();
  const r = await json<{ foods?: FdcFood[] }>(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(KEY)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q, dataType: ["Branded"], pageSize: 25 }) });
  const hits = (r?.foods ?? []).filter((f) => f.gtinUpc && validCheckDigit(f.gtinUpc));
  const scored = hits
    .map((f) => ({ f, m: match(p, `${f.brandOwner ?? ""} ${f.brandName ?? ""}`, f.description ?? "", f.packageWeight ? sizeOf(f.packageWeight) : null) }))
    .filter((x) => x.m.ok)
    // Exact first, then the newest label record (USDA keeps older versions under other ids).
    .sort((a, b) => Number(b.m.exact) - Number(a.m.exact) || String((b.f as { publishedDate?: string }).publishedDate ?? "").localeCompare(String((a.f as { publishedDate?: string }).publishedDate ?? "")));
  const best = scored[0];
  if (!best) return null;
  return { source: "USDA", gtin: cleanBarcode(best.f.gtinUpc)!, exact_variant: best.m.exact, checked_at: at, note: `FDC ${best.f.fdcId} ${best.f.description} (${best.f.packageWeight ?? "no pkg weight"}); ${best.m.why}` };
}

async function fromOff(p: Product, at: string): Promise<BarcodeSource | null> {
  const q = `${p.brand ?? ""} ${p.name}`.replace(/\(.*?\)/g, "").trim();
  const r = await json<{ hits?: { code?: string; product_name?: string; brands?: string[]; quantity?: string }[] }>(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=10&fields=code,product_name,brands,quantity`);
  for (const h of r?.hits ?? []) {
    if (!h.code || !validCheckDigit(h.code)) continue;
    const m = match(p, (h.brands ?? []).join(" "), h.product_name ?? "", h.quantity ? sizeOf(h.quantity) : null);
    if (m.ok) return { source: "Open Food Facts", gtin: cleanBarcode(h.code)!, exact_variant: m.exact, checked_at: at, note: `${h.product_name} ${h.quantity ?? ""}; ${m.why} (community data)` };
  }
  return null;
}

let upcitemdbCalls = 0;
const CACHE = "ops/upcitemdb-cache.json";
const cache: Record<string, unknown> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
async function fromUpcitemdb(p: Product, at: string): Promise<BarcodeSource | null> {
  const q = `${p.brand ?? ""} ${p.name}`.replace(/\(.*?\)/g, "").trim();
  type R = { items?: { ean?: string; upc?: string; title?: string; brand?: string; size?: string }[] };
  let r = cache[q] as R | undefined;
  if (!r) {
    if (upcitemdbCalls >= Number(process.env.UPCITEMDB_BUDGET ?? 20)) return null; // trial tier: 100/day in total
    upcitemdbCalls++;
    r = (await json<R>(`https://api.upcitemdb.com/prod/trial/search?s=${encodeURIComponent(q)}&match_mode=0&type=product`)) ?? undefined;
    if (r) {
      cache[q] = r;
      writeFileSync(CACHE, JSON.stringify(cache, null, 1));
    }
  }
  for (const it of r?.items ?? []) {
    const code = it.upc || it.ean;
    if (!code || !validCheckDigit(code)) continue;
    const m = match(p, it.brand ?? "", it.title ?? "", it.size ? sizeOf(it.size) : null);
    if (m.ok) return { source: "UPCitemdb", gtin: cleanBarcode(code)!, exact_variant: m.exact, checked_at: at, note: `${it.title}; ${m.why}` };
  }
  return null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const only = process.argv.find((a) => /^P\d{3}$/.test(a));
  const { data, error } = await db().from("products").select("id, code, name, brand, upc, status, barcode_status, product_versions!inner(unit_wt_oz, is_current)").eq("product_versions.is_current", true).order("code");
  if (error) throw new Error(error.message);
  const products: Product[] = (data as unknown as (Product & { product_versions: { unit_wt_oz: number | null }[] })[]).map((p) => ({ ...p, unit_wt_oz: p.product_versions[0]?.unit_wt_oz ?? null }));
  const todo = products.filter((p) => !["Rejected", "Retired"].includes(p.status) && (!only || p.code === only) && (only || (!p.upc && p.barcode_status !== "conflict")));
  console.log(`${todo.length} products to look up${apply ? " (applying)" : " (dry run)"}`);
  if (apply) writeFileSync(`ops/barcode-backfill-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(todo, null, 1));
  const tally: Record<string, number> = {};
  let mutationsStarted = false;
  let mutationFailure: unknown;
  try {
    for (const p of todo) {
      const at = new Date().toISOString();
      const sources: BarcodeSource[] = [];
      const usda = await fromUsda(p, at);
      if (usda) sources.push(usda);
      const off = await fromOff(p, at);
      if (off) sources.push(off);
      // Third source only when the first two haven't already settled it.
      if (barcodeVerdict(sources).status !== "high" && (sources.length < 2 || barcodeVerdict(sources).status === "conflict")) {
        const u = await fromUpcitemdb(p, at);
        if (u) sources.push(u);
      }
      const v = barcodeVerdict(sources);
      tally[v.status] = (tally[v.status] ?? 0) + 1;
      console.log(`${p.code} ${v.status.padEnd(11)} ${v.gtin ?? "-"}  ${p.name}${v.note ? `  [${v.note}]` : ""}`);
      for (const s of sources) console.log(`      ${s.source}: ${s.gtin} ${s.exact_variant ? "[exact]" : ""} ${s.note ?? ""}`);
      if (!apply) continue;
      const write: Record<string, unknown> = { barcode_status: v.status, barcode_sources: sources, barcode_checked_at: at };
      if ((v.status === "provisional" || v.status === "high") && !p.upc) {
        // Store the code as printed (from the agreeing source), never a zero-stripped form; and
        // never a code already registered as an outer purchase pack.
        const printed = printedForm(sources.find((s) => gtin14(s.gtin) === v.gtin)!.gtin);
        const isPack = (await db().from("purchase_packs").select("id").eq("gtin14", v.gtin!).maybeSingle()).data;
        if (printed && validCheckDigit(printed) && !isPack) write.upc = printed;
        else console.log(`      not written: ${isPack ? "that code is an outer purchase pack" : "no valid printed form"}`);
      }
      mutationsStarted = true;
      const r = await db().from("products").update(write).eq("id", p.id);
      if (r.error) console.log(`      ERROR ${r.error.message}`);
    }
    console.log("summary:", JSON.stringify(tally), `| UPCitemdb calls ${upcitemdbCalls}`);
  } catch (error) {
    mutationFailure = error;
    throw error;
  } finally {
    if (mutationsStarted) {
      try {
        await expireInvalidCheckoutSessions(BOX_SLUGS);
      } catch (expiryError) {
        if (mutationFailure) throw new AggregateError([mutationFailure, expiryError], "Mutation failed and invalid Stripe checkout sessions still need expiry");
        throw expiryError;
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
