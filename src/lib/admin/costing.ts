// Landed cost per box: a port of the workbook Price Calculator (rows 7–27), itemized so the
// Boxes tab can show every line. All amounts are cents (fractional allowed until display).
import type { BoxSlug, Settings } from "./types";

export type LotCost = { qty_remaining: number; unit_cost_cents: number };

/**
 * What one unit costs right now: weighted average of the stock on hand, else your quote,
 * else the latest price seen, else the estimate. null when nothing is known.
 */
export function effectiveUnitCost(opts: {
  lots?: LotCost[];
  quoteCents?: number | null;
  latestSeenCents?: number | null;
  estimateCents?: number | null;
}): number | null {
  const lots = (opts.lots ?? []).filter((l) => l.qty_remaining > 0);
  const units = lots.reduce((s, l) => s + l.qty_remaining, 0);
  if (units > 0) return lots.reduce((s, l) => s + l.qty_remaining * Number(l.unit_cost_cents), 0) / units;
  for (const v of [opts.quoteCents, opts.latestSeenCents, opts.estimateCents]) {
    if (typeof v === "number" && Number.isFinite(v)) return Number(v);
  }
  return null;
}

/** Postage estimate from Settings (weight table, flat rate, or custom per box). */
export function settingsPostage(settings: Settings, slug: BoxSlug, weightOz: number): number {
  const sh = settings.shipping;
  if (sh.method === "flat") return sh.flatCents;
  if (sh.method === "custom" && sh.customCents[slug] !== null) return sh.customCents[slug]!;
  const table = [...sh.table].sort((a, b) => a.fromOz - b.fromOz);
  let rate = table[0]?.cents ?? 0;
  for (const row of table) if (weightOz >= row.fromOz) rate = row.cents;
  return rate;
}

export type CostGroup = "Product" | "Packaging" | "Shipping" | "Fees" | "Overhead";
export type CostLine = { label: string; cents: number; group: CostGroup; note?: string };

export type LandedCost = {
  lines: CostLine[];
  totalCents: number;
  priceCents: number;
  contributionCents: number;
  /** 0–1; null when the price is 0. */
  contributionPct: number | null;
  snackCents: number;
  postageCents: number;
  /** Picks with no known cost (counted as $0 above). */
  uncosted: number;
  /** Price needed for 25/30/35/40% contribution at this cost. */
  targets: { pct: number; priceCents: number }[];
};

export function landedCost(input: {
  slug: BoxSlug;
  settings: Settings;
  /** Unit cost of each pick (null = unknown). */
  pickCosts: (number | null)[];
  /** Complimentary extras not counted in the box total. */
  extraCosts?: (number | null)[];
  mailer?: { name: string; cents: number } | null;
  postageCents: number;
  postageNote?: string;
  priceCents?: number;
}): LandedCost {
  const { settings: st } = input;
  const price = input.priceCents ?? st.prices[input.slug];
  const snack = input.pickCosts.reduce<number>((s, c) => s + (c ?? 0), 0);
  const extras = (input.extraCosts ?? []).reduce<number>((s, c) => s + (c ?? 0), 0);
  const fees = price * st.fees.pct + st.fees.fixedCents;

  const lines: CostLine[] = [
    { label: `Snacks (${input.pickCosts.length})`, cents: snack, group: "Product" },
  ];
  if (st.wastePct > 0)
    lines.push({ label: "Spoilage / waste", cents: snack * st.wastePct, group: "Product", note: `${(st.wastePct * 100).toFixed(1)}% of snacks` });
  if (extras > 0) lines.push({ label: "Complimentary extras", cents: extras, group: "Product" });
  if (input.mailer) lines.push({ label: input.mailer.name, cents: input.mailer.cents, group: "Packaging" });
  for (const p of st.packaging) lines.push({ label: p.name, cents: p.cents, group: "Packaging" });
  lines.push({ label: "Postage", cents: input.postageCents, group: "Shipping", note: input.postageNote });
  if (st.shipping.varianceCents > 0)
    lines.push({ label: "Shipping variance buffer", cents: st.shipping.varianceCents, group: "Shipping" });
  lines.push({
    label: "Payment processing",
    cents: fees,
    group: "Fees",
    note: `${(st.fees.pct * 100).toFixed(1)}% + ${(st.fees.fixedCents / 100).toFixed(2)}`,
  });
  for (const o of st.overheads) lines.push({ label: o.name, cents: o.cents, group: "Overhead" });

  const visible = lines.filter((l) => l.cents !== 0 || l.group === "Product" || l.label === "Postage");
  const total = visible.reduce((s, l) => s + l.cents, 0);
  const contribution = price - total;
  // Same algebra as the workbook: fees scale with price, so solve for it.
  const targets = [0.25, 0.3, 0.35, 0.4].map((pct) => ({
    pct,
    priceCents: (total - fees + st.fees.fixedCents) / (1 - pct - st.fees.pct),
  }));
  return {
    lines: visible,
    totalCents: total,
    priceCents: price,
    contributionCents: contribution,
    contributionPct: price > 0 ? contribution / price : null,
    snackCents: snack,
    postageCents: input.postageCents,
    uncosted: input.pickCosts.filter((c) => c === null).length,
    targets,
  };
}

/** Per-order profit from what actually happened (snapshots on the shipment). */
export function shipmentProfit(s: {
  revenue_cents: number | null;
  stripe_fee_cents: number | null;
  snack_cost_cents: number | null;
  packaging_cost_cents: number | null;
  overhead_cents: number | null;
  label_cost_cents: number | null;
  est_postage_cents: number | null;
}) {
  const revenue = s.revenue_cents ?? 0;
  const postage = s.label_cost_cents ?? s.est_postage_cents ?? 0;
  const costs =
    (s.stripe_fee_cents ?? 0) +
    Number(s.snack_cost_cents ?? 0) +
    (s.packaging_cost_cents ?? 0) +
    (s.overhead_cents ?? 0) +
    postage;
  return {
    revenue,
    postage,
    postageIsEstimate: s.label_cost_cents === null,
    costs,
    profit: revenue - costs,
    margin: revenue > 0 ? (revenue - costs) / revenue : null,
  };
}

export const fmt$ = (cents: number | null | undefined, digits = 2) =>
  cents === null || cents === undefined || !Number.isFinite(cents)
    ? "—"
    : `${cents < 0 ? "−" : ""}$${(Math.abs(cents) / 100).toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })}`;

export const fmtPct = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v) ? "—" : `${(v * 100).toFixed(1)}%`;
