import type { Metadata } from "next";
import { isClinicianApproved } from "@/lib/admin/rules";
import Link from "next/link";
import { Card, Empty, PageHeader, Stat, Table, fieldClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { fmt$ } from "@/lib/admin/costing";
import { loadVendors } from "@/lib/admin/db";
import { planPurchases, type VendorPrice } from "@/lib/admin/purchasing";
import { loadAdminContext } from "@/lib/admin/summary";
import { BOX_LABEL, BOX_SLUGS, type BoxSlug } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Purchasing" };

export default async function PurchasingPage({ searchParams }: { searchParams: Promise<Partial<Record<BoxSlug, string>>> }) {
  const sp = await searchParams;
  const [ctx, vendors] = await Promise.all([loadAdminContext(), loadVendors()]);
  const vendorName = new Map(vendors.map((v) => [v.id, v.name]));
  const runSize = Object.fromEntries(
    BOX_SLUGS.map((b) => {
      const n = Number.parseInt(sp[b] ?? "", 10);
      return [b, Number.isFinite(n) && n >= 0 ? n : ctx.settings.runSize[b]];
    }),
  ) as Record<BoxSlug, number>;
  const pricesBy = new Map<string, VendorPrice[]>();
  for (const p of ctx.catalog.prices) {
    const list = pricesBy.get(p.product_id) ?? [];
    list.push({ vendorId: p.vendor_id, vendorName: vendorName.get(p.vendor_id ?? "") ?? "Unknown", unitCostCents: p.unit_cost_cents, packQty: p.pack_qty, seenAt: p.seen_at, source: p.source });
    pricesBy.set(p.product_id, list);
  }
  // Products with no price seen still get their estimate as a fallback "vendor".
  for (const p of ctx.catalog.products) {
    if (!pricesBy.has(p.id) && (p.quote_cost_cents ?? p.estimate_cost_cents) !== null)
      pricesBy.set(p.id, [{ vendorId: p.default_vendor_id, vendorName: vendorName.get(p.default_vendor_id ?? "") ?? "Estimate", unitCostCents: Number(p.quote_cost_cents ?? p.estimate_cost_cents), packQty: null, seenAt: (p.price_checked_on ?? p.updated_at).slice(0, 10), source: p.quote_cost_cents !== null ? "quote" : "estimate" }]);
  }
  const plan = planPurchases({
    lineups: Object.fromEntries(BOX_SLUGS.map((b) => [b, [...ctx.boxes[b].picks.map((p) => p.snack.id), ...ctx.boxes[b].extras.map((e) => e.id)]])),
    runSize,
    products: ctx.catalog.snacks.map((s) => ({ id: s.id, code: s.code, name: s.name, onHand: s.onHand, prices: pricesBy.get(s.id) ?? [] })),
    bufferPct: ctx.settings.purchaseBufferPct,
  });
  // Pre-purchase gate: only clinician-approved products are purchase-ready; the rest are listed
  // separately and left out of the totals (buy samples to verify the package, not inventory).
  const ready = (id: string) => {
    const s = ctx.catalog.byId.get(id);
    return Boolean(s && isClinicianApproved(s));
  };
  const toBuy = plan.rows.filter((r) => r.toBuy > 0 && ready(r.product.id));
  const notReady = plan.rows.filter((r) => r.toBuy > 0 && !ready(r.product.id));
  const spendCents = toBuy.reduce((s, r) => s + (r.estSpendCents ?? 0), 0);
  const listed = plan.rows.filter((r) => r.toBuy === 0 || ready(r.product.id));
  const byVendor = [...toBuy.reduce((m, r) => {
    if (!r.vendor) return m;
    const v = m.get(r.vendor.vendorName) ?? { vendor: r.vendor.vendorName, spendCents: 0, lines: 0 };
    v.spendCents += r.estSpendCents ?? 0;
    v.lines += 1;
    return m.set(v.vendor, v);
  }, new Map<string, { vendor: string; spendCents: number; lines: number }>()).values()].sort((a, b) => b.spendCents - a.spendCents);

  return (
    <>
      <PageHeader title="Purchasing" description="The shopping list: what the active lineups need for the next run, merged across boxes, minus packable stock (current formula, at least 90 days left). Prices here are only estimates from past sightings; the real cost is whatever you pay when you log the purchase lot." />
      <Card className="mb-4">
        <form className="flex flex-wrap items-end gap-3">
          {BOX_SLUGS.map((b) => (
            <label key={b} className="space-y-1">
              <span className="text-sm font-medium">{BOX_LABEL[b]} boxes</span>
              <input name={b} defaultValue={runSize[b]} inputMode="numeric" className={`${fieldClass} w-28`} />
            </label>
          ))}
          <Button variant="secondary">Plan run</Button>
          <span className="text-xs text-muted-foreground">+{Math.round(ctx.settings.purchaseBufferPct * 100)}% buffer (Settings)</span>
        </form>
      </Card>
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Products to buy" value={toBuy.length} />
          <Stat label="Units to buy" value={toBuy.reduce((s, r) => s + r.orderQty, 0).toLocaleString()} />
          <Stat label="Estimated spend" value={fmt$(spendCents)} />
          <Stat label="No price yet" value={toBuy.filter((r) => !r.vendor).length} tone={toBuy.some((r) => !r.vendor) ? "warn" : undefined} />
        </div>
        {byVendor.length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            By vendor: {byVendor.map((v) => `${v.vendor} ${fmt$(v.spendCents)} (${v.lines})`).join(" · ")}
          </p>
        )}
      </Card>
      {notReady.length > 0 && (
        <Card title={`Not purchase-ready (${notReady.length})`} className="mb-4">
          <p className="mb-2 text-sm text-muted-foreground">
            In an active lineup but not yet PharmaGuide Team approved. Left out of the totals above: buy up to {ctx.settings.samplePurchaseMax} sample units to check the package, not inventory.
          </p>
          <ul className="space-y-1 text-sm">
            {notReady.map((r) => (
              <li key={r.product.id}>
                <Link href={`/admin/products/${r.product.id}`} className="hover:underline">{r.product.name}</Link> · {r.orderQty} needed · {ctx.catalog.byId.get(r.product.id)?.status}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {plan.rows.length === 0 ? (
        <Empty>Activate a lineup on the Boxes tab to plan purchases.</Empty>
      ) : (
        <Card title="Buy list">
          <Table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Boxes (units per box)</th>
                <th className="num">Required</th>
                <th className="num">Buffer</th>
                <th className="num">Packable</th>
                <th className="num">Buy</th>
                <th>Cheapest recent</th>
                <th className="num">Last paid</th>
                <th className="num">Est. spend</th>
              </tr>
            </thead>
            <tbody>
              {listed.map((r) => (
                <tr key={r.product.id} className={r.toBuy === 0 ? "text-muted-foreground" : ""}>
                  <td>
                    <Link href={`/admin/products/${r.product.id}`} className="font-medium hover:underline">
                      {r.product.name}
                    </Link>
                  </td>
                  <td className="text-xs">{(Object.keys(r.perBox) as BoxSlug[]).map((b) => `${BOX_LABEL[b]} ×${runSize[b] ? Math.round((r.perBox[b] ?? 0) / runSize[b]) : 0}/box`).join(", ")}</td>
                  <td className="num">{r.required}</td>
                  <td className="num">{r.buffer}</td>
                  <td className="num">{r.onHand}</td>
                  <td className="num font-semibold">{r.orderQty || "—"}</td>
                  <td className="text-xs">
                    {r.vendor ? `${r.vendor.vendorName} · ${fmt$(r.vendor.unitCostCents)}${r.vendor.packQty && r.vendor.source !== "purchase" ? ` · case ${r.vendor.packQty}` : ""} · ${r.vendor.source}` : "—"}
                  </td>
                  <td className="num">{r.lastPaid ? fmt$(r.lastPaid.unitCostCents) : "—"}</td>
                  <td className="num">{fmt$(r.estSpendCents)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
      <Card title="Vendors" className="mt-4">
        <Table>
          <thead>
            <tr>
              <th>Vendor</th>
              <th className="num">Products priced</th>
              <th>Last seen</th>
              <th className="num">Purchases</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => {
              const prices = ctx.catalog.prices.filter((p) => p.vendor_id === v.id);
              return (
                <tr key={v.id}>
                  <td className="font-medium">{v.name}</td>
                  <td className="num">{new Set(prices.map((p) => p.product_id)).size}</td>
                  <td className="text-xs">{prices[0]?.seen_at ?? "—"}</td>
                  <td className="num">{prices.filter((p) => p.source === "purchase").length}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        <p className="mt-2 text-xs text-muted-foreground">Log a shelf price or vendor quote from any product&apos;s page (Prices seen).</p>
      </Card>
    </>
  );
}
