// Aggregations for the Reports tab. Pure: takes shipment rows, returns tables.
import { shipmentProfit } from "./costing";

export type ReportShipment = {
  box_slug: string;
  kind: string;
  status: string;
  packed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  carrier: string | null;
  service: string | null;
  zone: number | null;
  issue: string | null;
  revenue_cents: number | null;
  stripe_fee_cents: number | null;
  snack_cost_cents: number | null;
  packaging_cost_cents: number | null;
  overhead_cents: number | null;
  label_cost_cents: number | null;
  est_postage_cents: number | null;
};

export type PnlRow = {
  key: string;
  boxes: number;
  revenue: number;
  fees: number;
  snacks: number;
  packaging: number;
  postage: number;
  overhead: number;
  profit: number;
};

const empty = (key: string): PnlRow => ({ key, boxes: 0, revenue: 0, fees: 0, snacks: 0, packaging: 0, postage: 0, overhead: 0, profit: 0 });

/** P&L grouped by a key (month, box…) over packed-or-later shipments. */
export function pnl(ships: ReportShipment[], keyOf: (s: ReportShipment) => string): PnlRow[] {
  const out = new Map<string, PnlRow>();
  for (const s of ships) {
    if (!s.packed_at) continue;
    const k = keyOf(s);
    const r = out.get(k) ?? empty(k);
    const p = shipmentProfit({ ...s, snack_cost_cents: s.snack_cost_cents === null ? null : Number(s.snack_cost_cents) });
    r.boxes += 1;
    r.revenue += p.revenue;
    r.fees += s.stripe_fee_cents ?? 0;
    r.snacks += Number(s.snack_cost_cents ?? 0);
    r.packaging += s.packaging_cost_cents ?? 0;
    r.postage += p.postage;
    r.overhead += s.overhead_cents ?? 0;
    r.profit += p.profit;
    out.set(k, r);
  }
  return [...out.values()].sort((a, b) => b.key.localeCompare(a.key));
}

export function shippingStats(ships: ReportShipment[]) {
  const labeled = ships.filter((s) => s.label_cost_cents !== null);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const group = (f: (s: ReportShipment) => string) => {
    const m = new Map<string, number[]>();
    for (const s of labeled) m.set(f(s), [...(m.get(f(s)) ?? []), s.label_cost_cents!]);
    return [...m.entries()].map(([k, v]) => ({ key: k, n: v.length, avgCents: avg(v)!, share: v.length / labeled.length })).sort((a, b) => a.key.localeCompare(b.key));
  };
  const shipped = ships.filter((s) => s.shipped_at);
  const days = ships
    .filter((s) => s.shipped_at && s.delivered_at)
    .map((s) => (new Date(s.delivered_at!).getTime() - new Date(s.shipped_at!).getTime()) / 86_400_000);
  const withEst = labeled.filter((s) => s.est_postage_cents !== null);
  return {
    labels: labeled.length,
    avgCents: avg(labeled.map((s) => s.label_cost_cents!)),
    byZone: group((s) => (s.zone ? `Zone ${s.zone}` : "Zone ?")),
    byCarrier: group((s) => [s.carrier, s.service].filter(Boolean).join(" · ") || "Unknown"),
    avgDeliveryDays: avg(days),
    damagedRate: shipped.length ? shipped.filter((s) => s.issue === "damaged").length / shipped.length : null,
    lostRate: shipped.length ? shipped.filter((s) => s.issue === "lost").length / shipped.length : null,
    estVsActualCents: avg(withEst.map((s) => s.label_cost_cents! - s.est_postage_cents!)),
  };
}
