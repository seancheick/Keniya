import "server-only";
import { db, allRows } from "./db";

export type RecallRow = {
  shipment: string;
  shipmentId: string;
  status: string;
  packedAt: string | null;
  shippedAt: string | null;
  name: string | null;
  email: string | null;
  address: string;
  product: string;
  lotCode: string | null;
  lotId: string;
  qty: number;
};

type Raw = {
  qty: number;
  lot_id: string;
  products: { name: string } | null;
  purchase_lots: { lot_code: string | null } | null;
  shipments: {
    id: string;
    code: string;
    status: string;
    packed_at: string | null;
    shipped_at: string | null;
    recipient_name: string | null;
    recipient_email: string | null;
    ship_to: { address?: Record<string, string | null>; name?: string } | null;
  } | null;
};

const addr = (a?: Record<string, string | null>) =>
  a ? [a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean).join(", ") : "";

/** Who received units from a lot (or any lot of a product). */
export async function recallRows(by: { lot?: string; product?: string }): Promise<RecallRow[]> {
  if (!by.lot && !by.product) return [];
  const rows = await allRows<Raw>(async (from, to) => {
    let q = db().from("shipment_items")
      .select("qty, lot_id, products(name), purchase_lots(lot_code), shipments(id, code, status, packed_at, shipped_at, recipient_name, recipient_email, ship_to)");
    q = by.lot ? q.eq("lot_id", by.lot) : q.eq("product_id", by.product!);
    const res = await q.order("id").range(from, to);
    return { ...res, data: res.data as unknown as Raw[] | null };
  }, "recall");
  return rows
    .filter((r) => r.shipments)
    .map((r) => ({
      shipment: r.shipments!.code,
      shipmentId: r.shipments!.id,
      status: r.shipments!.status,
      packedAt: r.shipments!.packed_at,
      shippedAt: r.shipments!.shipped_at,
      name: r.shipments!.recipient_name ?? r.shipments!.ship_to?.name ?? null,
      email: r.shipments!.recipient_email,
      address: addr(r.shipments!.ship_to?.address),
      product: r.products?.name ?? "",
      lotCode: r.purchase_lots?.lot_code ?? null,
      lotId: r.lot_id,
      qty: r.qty,
    }))
    .sort((a, b) => (a.packedAt ?? "").localeCompare(b.packedAt ?? ""));
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Quote, and neutralize spreadsheet formula injection.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) || safe !== s ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}
