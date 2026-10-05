// Run planner: what to buy for a production run, merged across boxes, with the cheapest
// recent vendor per product. Port of the workbook Purchase Plan, minus what's on hand.
import type { BoxSlug } from "./types";

export type VendorPrice = {
  vendorId: string | null;
  vendorName: string;
  unitCostCents: number;
  packQty: number | null;
  seenAt: string;
  source: "purchase" | "sighting" | "quote" | "estimate";
};

export type PlanProduct = { id: string; code: string; name: string; onHand: number; prices: VendorPrice[] };

export type PlanRow = {
  product: PlanProduct;
  perBox: Partial<Record<BoxSlug, number>>;
  required: number;
  buffer: number;
  onHand: number;
  toBuy: number;
  /** Rounded up to the vendor's pack size. */
  orderQty: number;
  vendor: VendorPrice | null;
  lastPaid: VendorPrice | null;
  estSpendCents: number | null;
};

/** Latest price per vendor, then the cheapest of those (ignoring prices older than maxAgeDays). */
export function cheapestVendor(prices: VendorPrice[], today = new Date(), maxAgeDays = 365): VendorPrice | null {
  const cutoff = today.getTime() - maxAgeDays * 86_400_000;
  const latest = new Map<string, VendorPrice>();
  for (const p of prices) {
    if (new Date(p.seenAt).getTime() < cutoff) continue;
    const key = p.vendorId ?? p.vendorName;
    const prev = latest.get(key);
    if (!prev || p.seenAt > prev.seenAt) latest.set(key, p);
  }
  let best: VendorPrice | null = null;
  for (const p of latest.values()) if (!best || p.unitCostCents < best.unitCostCents) best = p;
  return best;
}

export function planPurchases(input: {
  /** Product ids in each box's lineup (one entry per unit per box). */
  lineups: Partial<Record<BoxSlug, string[]>>;
  runSize: Partial<Record<BoxSlug, number>>;
  products: PlanProduct[];
  bufferPct: number;
  today?: Date;
}): { rows: PlanRow[]; byVendor: { vendor: string; lines: number; spendCents: number }[]; totalCents: number } {
  const byId = new Map(input.products.map((p) => [p.id, p]));
  const need = new Map<string, Partial<Record<BoxSlug, number>>>();
  for (const [slug, ids] of Object.entries(input.lineups) as [BoxSlug, string[]][]) {
    const run = input.runSize[slug] ?? 0;
    if (!run) continue;
    for (const id of ids) {
      const per = need.get(id) ?? {};
      per[slug] = (per[slug] ?? 0) + run;
      need.set(id, per);
    }
  }

  const rows: PlanRow[] = [];
  for (const [id, perBox] of need) {
    const product = byId.get(id);
    if (!product) continue;
    const required = Object.values(perBox).reduce((s, n) => s + (n ?? 0), 0);
    const buffer = Math.ceil(required * input.bufferPct);
    const toBuy = Math.max(0, required + buffer - product.onHand);
    const vendor = cheapestVendor(product.prices, input.today);
    const pack = vendor?.packQty && vendor.source !== "purchase" ? vendor.packQty : 1;
    const orderQty = toBuy === 0 ? 0 : Math.ceil(toBuy / pack) * pack;
    const lastPaid =
      product.prices.filter((p) => p.source === "purchase").sort((a, b) => b.seenAt.localeCompare(a.seenAt))[0] ?? null;
    rows.push({
      product,
      perBox,
      required,
      buffer,
      onHand: product.onHand,
      toBuy,
      orderQty,
      vendor,
      lastPaid,
      estSpendCents: vendor ? orderQty * vendor.unitCostCents : null,
    });
  }
  rows.sort((a, b) => b.toBuy - a.toBuy || a.product.code.localeCompare(b.product.code));

  const vendors = new Map<string, { vendor: string; lines: number; spendCents: number }>();
  for (const r of rows) {
    if (!r.toBuy) continue;
    const name = r.vendor?.vendorName ?? "No price yet";
    const v = vendors.get(name) ?? { vendor: name, lines: 0, spendCents: 0 };
    v.lines += 1;
    v.spendCents += r.estSpendCents ?? 0;
    vendors.set(name, v);
  }
  const byVendor = [...vendors.values()].sort((a, b) => b.spendCents - a.spendCents);
  return { rows, byVendor, totalCents: byVendor.reduce((s, v) => s + v.spendCents, 0) };
}
