"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/admin/db";
import { mapFdcFood, sameUpc, type FdcFood } from "@/lib/admin/fdc";
import { mergeDrafts, type LookupDraft } from "@/lib/admin/lookup";
import { mapOffProduct, OFF_FIELDS, type OffDraft, type OffProduct } from "@/lib/admin/openfoodfacts";

export type LookupResult =
  | { kind: "existing"; id: string; name: string }
  | { kind: "pack"; id: string; name: string; gtin: string; units: number; description: string | null }
  | { kind: "draft"; draft: LookupDraft }
  | { kind: "none"; upc: string; note?: string };

const UA = "KeniyaAdmin/1.0 (keniyahealth.com)";

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(7000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fromUsda(upc: string): Promise<OffDraft | null> {
  const key = process.env.USDA_API_KEY || process.env.USDA_FDC_API_KEY || "DEMO_KEY";
  const base = "https://api.nal.usda.gov/fdc/v1";
  const search = await getJson<{ foods?: FdcFood[] }>(
    `${base}/foods/search?api_key=${encodeURIComponent(key)}&dataType=Branded&pageSize=10&query=${encodeURIComponent(upc.replace(/^0+/, ""))}`,
  );
  const hit = search?.foods?.find((f) => sameUpc(f.gtinUpc, upc));
  if (!hit) return null;
  // The detail record carries labelNutrients (per serving, as printed).
  const detail = await getJson<FdcFood>(`${base}/food/${hit.fdcId}?api_key=${encodeURIComponent(key)}`);
  return mapFdcFood(upc, { ...hit, ...(detail ?? {}) });
}

async function fromOff(upc: string): Promise<OffDraft | null> {
  const res = await getJson<{ status?: number; product?: OffProduct }>(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(upc)}.json?fields=${OFF_FIELDS}`,
  );
  return res?.status === 1 && res.product ? mapOffProduct(upc, res.product) : null;
}

/** Barcode → existing product, or a draft from USDA / Open Food Facts to review. */
export async function lookupBarcode(raw: string): Promise<LookupResult> {
  await requireAdmin();
  const upc = raw.replace(/\D/g, "");
  if (upc.length < 6 || upc.length > 14) return { kind: "none", upc, note: "Not a valid barcode" };

  const local = await db().from("products").select("id, name").eq("gtin14", upc.padStart(14, "0")).limit(1).maybeSingle();
  if (local.data) return { kind: "existing", id: local.data.id, name: local.data.name };
  // An outer box/multipack we've registered: the product inside, and how many single packs.
  const pack = await db().from("purchase_packs").select("product_id, gtin, units_per_pack, description, products(name)").eq("gtin14", upc.padStart(14, "0")).maybeSingle();
  if (pack.data) {
    const d = pack.data as unknown as { product_id: string; gtin: string; units_per_pack: number; description: string | null; products: { name: string } | null };
    return { kind: "pack", id: d.product_id, name: d.products?.name ?? "", gtin: d.gtin, units: d.units_per_pack, description: d.description };
  }

  const [usda, off] = await Promise.all([fromUsda(upc), fromOff(upc)]);
  const draft = mergeDrafts(usda, off);
  return draft ? { kind: "draft", draft } : { kind: "none", upc };
}
