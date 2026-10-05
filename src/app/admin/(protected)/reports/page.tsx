import type { Metadata } from "next";
import { ExpenseForm } from "@/components/admin/settings-form";
import { Card, PageHeader, Stat, Table } from "@/components/admin/ui";
import { fmt$, fmtPct } from "@/lib/admin/costing";
import { db, loadCatalog, loadVendors, must } from "@/lib/admin/db";
import { pnl, shippingStats, type PnlRow, type ReportShipment } from "@/lib/admin/reports";
import { BOX_LABEL, isBoxSlug } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Reports" };

function PnlTable({ rows, label }: { rows: PnlRow[]; label: string }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">No packed boxes yet.</p>;
  const total = rows.reduce(
    (t, r) => ({ ...t, boxes: t.boxes + r.boxes, revenue: t.revenue + r.revenue, fees: t.fees + r.fees, snacks: t.snacks + r.snacks, packaging: t.packaging + r.packaging, postage: t.postage + r.postage, overhead: t.overhead + r.overhead, profit: t.profit + r.profit }),
    { key: "Total", boxes: 0, revenue: 0, fees: 0, snacks: 0, packaging: 0, postage: 0, overhead: 0, profit: 0 },
  );
  return (
    <Table>
      <thead>
        <tr>
          <th>{label}</th>
          <th className="num">Boxes</th>
          <th className="num">Revenue</th>
          <th className="num">Stripe</th>
          <th className="num">Snacks</th>
          <th className="num">Packaging</th>
          <th className="num">Postage</th>
          <th className="num">Overhead</th>
          <th className="num">Profit</th>
          <th className="num">Margin</th>
        </tr>
      </thead>
      <tbody>
        {[...rows, total].map((r) => (
          <tr key={r.key} className={r.key === "Total" ? "font-semibold" : ""}>
            <td>{isBoxSlug(r.key) ? BOX_LABEL[r.key] : r.key}</td>
            <td className="num">{r.boxes}</td>
            <td className="num">{fmt$(r.revenue, 0)}</td>
            <td className="num">{fmt$(r.fees, 0)}</td>
            <td className="num">{fmt$(r.snacks, 0)}</td>
            <td className="num">{fmt$(r.packaging, 0)}</td>
            <td className="num">{fmt$(r.postage, 0)}</td>
            <td className="num">{fmt$(r.overhead, 0)}</td>
            <td className={`num ${r.profit < 0 ? "text-red-700" : ""}`}>{fmt$(r.profit, 0)}</td>
            <td className="num">{fmtPct(r.revenue ? r.profit / r.revenue : null)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export default async function ReportsPage() {
  const [shipsRes, expRes, catalog, vendors, lotsRes] = await Promise.all([
    db().from("shipments").select("box_slug, kind, status, packed_at, shipped_at, delivered_at, carrier, service, zone, issue, revenue_cents, stripe_fee_cents, snack_cost_cents, packaging_cost_cents, overhead_cents, label_cost_cents, est_postage_cents"),
    db().from("expenses").select("spent_on, category, amount_cents"),
    loadCatalog(),
    loadVendors(),
    db().from("purchase_lots").select("vendor_id, total_paid_cents, purchased_at"),
  ]);
  const ships = must(shipsRes, "shipments") as ReportShipment[];
  const expenses = must(expRes, "expenses") as { spent_on: string; category: string; amount_cents: number }[];
  const allLots = must(lotsRes, "lots") as { vendor_id: string | null; total_paid_cents: number; purchased_at: string }[];
  const byMonth = pnl(ships, (s) => s.packed_at!.slice(0, 7));
  const byBox = pnl(ships, (s) => s.box_slug);
  const st = shippingStats(ships);
  const vendorName = new Map(vendors.map((v) => [v.id, v.name]));
  const spend = new Map<string, number>();
  for (const l of allLots) spend.set(vendorName.get(l.vendor_id ?? "") ?? "Unknown", (spend.get(vendorName.get(l.vendor_id ?? "") ?? "Unknown") ?? 0) + l.total_paid_cents);
  const invValue = catalog.lots.reduce((s, l) => s + l.qty_remaining * l.unit_cost_cents, 0);
  const expTotal = expenses.reduce((s, e) => s + e.amount_cents, 0);
  const contribution = byMonth.reduce((s, r) => s + r.profit, 0);

  return (
    <>
      <PageHeader title="Reports" description="Actual results from packed boxes: what each customer received, at what it cost, with the real label price." />
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Contribution (all time)" value={fmt$(contribution, 0)} tone={contribution < 0 ? "bad" : "good"} />
          <Stat label="Other expenses" value={fmt$(expTotal, 0)} />
          <Stat label="Net" value={fmt$(contribution - expTotal, 0)} tone={contribution - expTotal < 0 ? "bad" : "good"} />
          <Stat label="Inventory on hand" value={fmt$(invValue, 0)} />
        </div>
      </Card>
      <Card title="Other expenses (not per box)" className="mb-4">
        <ExpenseForm />
      </Card>
      <Card title="P&L by month (pack date)" className="mb-4">
        <PnlTable rows={byMonth} label="Month" />
      </Card>
      <Card title="P&L by box" className="mb-4">
        <PnlTable rows={byBox} label="Box" />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Shipping">
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Average label" value={fmt$(st.avgCents)} hint={`${st.labels} labels`} />
            <Stat label="Avg delivery" value={st.avgDeliveryDays === null ? "—" : `${st.avgDeliveryDays.toFixed(1)} d`} />
            <Stat label="Actual − estimate" value={fmt$(st.estVsActualCents)} hint="per label" />
            <Stat label="Damaged" value={fmtPct(st.damagedRate)} />
            <Stat label="Lost" value={fmtPct(st.lostRate)} />
          </div>
          {st.byZone.length > 0 && (
            <Table className="mb-3">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th className="num">Labels</th>
                  <th className="num">Average</th>
                </tr>
              </thead>
              <tbody>
                {st.byZone.map((z) => (
                  <tr key={z.key}>
                    <td>{z.key}</td>
                    <td className="num">{z.n}</td>
                    <td className="num">{fmt$(z.avgCents)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {st.byCarrier.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <th>Carrier · service</th>
                  <th className="num">Share</th>
                  <th className="num">Average</th>
                </tr>
              </thead>
              <tbody>
                {st.byCarrier.map((z) => (
                  <tr key={z.key}>
                    <td>{z.key}</td>
                    <td className="num">{fmtPct(z.share)}</td>
                    <td className="num">{fmt$(z.avgCents)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card title="Spend by vendor (all purchases)">
          <Table>
            <tbody>
              {[...spend.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([v, c]) => (
                  <tr key={v}>
                    <td>{v}</td>
                    <td className="num">{fmt$(c)}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
          <p className="mt-4 mb-2 text-sm font-medium">Export CSV</p>
          <div className="flex flex-wrap gap-2 text-sm">
            {["shipments", "shipment_items", "preorders", "products", "product_versions", "lots", "movements", "prices", "vendors", "expenses"].map((t) => (
              <a key={t} href={`/admin/reports/export?table=${t}`} className="rounded-md border px-2 py-1 hover:bg-muted">
                {t}
              </a>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
