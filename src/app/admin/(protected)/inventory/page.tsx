import type { Metadata } from "next";
import Link from "next/link";
import { AdjustLot, LotExpiryForm } from "@/components/admin/adjust-lot";
import { Badge, Card, Empty, PageHeader, Stat, Table, TextLink, expiryTone, fieldClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { fmt$ } from "@/lib/admin/costing";
import { db, loadCatalog, loadSettings, loadVendors, must } from "@/lib/admin/db";
import { lotHold } from "@/lib/admin/stock";
import { daysUntil } from "@/lib/admin/optimizer";

export const metadata: Metadata = { title: "Inventory" };

type Movement = { id: number; created_at: string; lot_id: string; product_id: string; kind: string; qty: number; unit_cost_cents: number; reason: string | null; created_by: string | null };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; show?: string }> }) {
  const sp = await searchParams;
  const [{ lots, products, versions, snacks }, settings, vendors, movesRes] = await Promise.all([
    loadCatalog(),
    loadSettings(),
    loadVendors(),
    db().from("stock_movements").select("*").order("created_at", { ascending: false }).limit(40),
  ]);
  const moves = must(movesRes, "movements") as Movement[];
  const productBy = new Map(products.map((p) => [p.id, p]));
  const vendorBy = new Map(vendors.map((v) => [v.id, v.name]));
  const tiers = settings.expiryTiersDays;

  const rows = lots
    .map((l) => ({ l, p: productBy.get(l.product_id)!, days: daysUntil(l.expires_on), hold: lotHold(l, versions.get(l.product_id)?.id) }))
    .filter(({ p, days, hold }) => {
      if (sp.q && !`${p.code} ${p.name} ${p.brand ?? ""}`.toLowerCase().includes(sp.q.toLowerCase())) return false;
      if (sp.show === "expiring" && (days === null || days >= tiers[2])) return false;
      if (sp.show === "held" && !hold) return false;
      if (sp.show === "packable" && hold) return false;
      return true;
    })
    .sort((a, b) => (a.l.expires_on ?? "9999").localeCompare(b.l.expires_on ?? "9999") || a.p.code.localeCompare(b.p.code));

  const units = lots.reduce((s, l) => s + l.qty_remaining, 0);
  const value = lots.reduce((s, l) => s + l.qty_remaining * l.unit_cost_cents, 0);
  const atRisk = (max: number) =>
    lots.filter((l) => {
      const d = daysUntil(l.expires_on);
      return d !== null && d < max;
    }).reduce((s, l) => s + l.qty_remaining * l.unit_cost_cents, 0);

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Packing uses current-formula lots with at least 90 days left, earliest expiry first. Held lots stay visible until you review or dispose of them."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/inventory/recall">Recall / trace</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/inventory/log">Log purchase</Link>
            </Button>
          </>
        }
      />
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat label="Units on hand" value={units.toLocaleString()} hint={`${snacks.reduce((s, p) => s + p.onHand, 0)} packable · ${units - snacks.reduce((s, p) => s + p.onHand, 0)} held`} />
          <Stat label="Inventory value" value={fmt$(value)} />
          <div className="col-span-2 grid grid-cols-3 gap-3 sm:contents">
            <Stat label={`Expiring < ${tiers[0]} d`} value={fmt$(atRisk(tiers[0]))} tone={atRisk(tiers[0]) ? "bad" : undefined} />
            <Stat label={`Expiring < ${tiers[1]} d`} value={fmt$(atRisk(tiers[1]))} tone={atRisk(tiers[1]) ? "orange" : undefined} />
            <Stat label={`Expiring < ${tiers[2]} d`} value={fmt$(atRisk(tiers[2]))} tone={atRisk(tiers[2]) ? "warn" : undefined} />
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <form className="flex flex-wrap gap-2">
          <input name="q" defaultValue={sp.q} placeholder="Search product" className={`${fieldClass} max-w-xs max-sm:max-w-none`} aria-label="Search" type="search" />
          <select name="show" defaultValue={sp.show ?? ""} className={`${fieldClass} w-auto max-sm:w-full`} aria-label="Show">
            <option value="">All lots with stock</option>
            <option value="packable">Packable lots</option>
            <option value="held">Held — needs attention</option>
            <option value="expiring">Expiring within {tiers[2]} days</option>
          </select>
          <Button variant="secondary">Filter</Button>
        </form>
      </Card>

      {rows.length === 0 ? (
        <Empty action={<Button asChild><Link href="/admin/inventory/log">Log your first purchase</Link></Button>}>{lots.length ? "No lots match these filters. Clear the filters to see all stock." : "No stock yet."}</Empty>
      ) : (
        <>
        <div className="sm:hidden">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Lots with stock (earliest expiry first)</h2>
          <ul className="space-y-2">
            {rows.map(({ l, p, days, hold }) => {
              const tone = expiryTone(days, tiers);
              return (
                <li key={l.id} className="rounded-xl border bg-card p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/products/${p.id}`} className="font-medium">
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{p.code}</span> · {vendorBy.get(l.vendor_id ?? "") ?? "—"} · bought {l.purchased_at}
                      </p>
                    </div>
                    <p className="text-right text-sm tabular-nums">
                      <b>{l.qty_remaining}</b>
                      <span className="text-muted-foreground">/{l.qty}</span>
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span>Expires {l.expires_on ?? "—"}</span>
                    {tone && <Badge tone={tone}>{days! < 0 ? "expired" : `${days} d`}</Badge>}
                    <span className="ml-auto text-muted-foreground tabular-nums">
                      {fmt$(l.unit_cost_cents)} each · {fmt$(l.qty_remaining * l.unit_cost_cents)}
                    </span>
                  </div>
                  {hold && <p className="mt-1 text-xs text-amber-900">Held: {hold}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 border-t pt-1">
                    <AdjustLot lotId={l.id} remaining={l.qty_remaining} />
                    <TextLink href={`/admin/inventory/recall?lot=${l.id}`}>{l.lot_code ? `Trace ${l.lot_code}` : "Trace"}</TextLink>
                  </div>
                  <LotExpiryForm key={l.expires_on} lotId={l.id} expiresOn={l.expires_on} />
                </li>
              );
            })}
          </ul>
        </div>
        <Card title="Lots with stock (FEFO order)" className="max-sm:hidden">
          <Table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Expires</th>
                <th className="num">Left</th>
                <th className="num">Unit</th>
                <th className="num">Value</th>
                <th>Bought</th>
                <th>Lot</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ l, p, days, hold }) => {
                const tone = expiryTone(days, tiers);
                return (
                  <tr key={l.id}>
                    <td>
                      <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{p.code}</div>
                      {hold && <span className="block text-xs text-amber-900">Held: {hold}</span>}
                    </td>
                    <td>
                      {l.expires_on ?? "—"} {tone && <Badge tone={tone}>{days! < 0 ? "expired" : `${days} d`}</Badge>}
                    </td>
                    <td className="num">
                      {l.qty_remaining}/{l.qty}
                    </td>
                    <td className="num">{fmt$(l.unit_cost_cents)}</td>
                    <td className="num">{fmt$(l.qty_remaining * l.unit_cost_cents)}</td>
                    <td className="text-xs">
                      {l.purchased_at}
                      <div className="text-muted-foreground">{vendorBy.get(l.vendor_id ?? "") ?? "—"}</div>
                    </td>
                    <td className="font-mono text-xs">
                      <TextLink href={`/admin/inventory/recall?lot=${l.id}`}>{l.lot_code ?? "trace"}</TextLink>
                    </td>
                    <td>
                      <AdjustLot lotId={l.id} remaining={l.qty_remaining} />
                      <LotExpiryForm key={l.expires_on} lotId={l.id} expiresOn={l.expires_on} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
        </>
      )}

      <Card title="Recent stock movements" className="mt-4">
        {moves.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <>
          <ul className="divide-y sm:hidden">
            {moves.map((m) => (
              <li key={m.id} className="flex items-start gap-2 py-2.5 text-sm">
                <Badge tone={m.qty > 0 ? "good" : m.kind === "waste" ? "bad" : "muted"}>{m.kind}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{productBy.get(m.product_id)?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })} · {m.created_by ?? "—"}
                    {m.reason ? ` · ${m.reason}` : ""}
                  </p>
                </div>
                <span className="tabular-nums">{m.qty > 0 ? `+${m.qty}` : m.qty}</span>
              </li>
            ))}
          </ul>
          <Table className="max-sm:hidden">
            <thead>
              <tr>
                <th>When</th>
                <th>Product</th>
                <th>Kind</th>
                <th className="num">Qty</th>
                <th>Reason</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id}>
                  <td className="text-xs">{new Date(m.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td>{productBy.get(m.product_id)?.name ?? "—"}</td>
                  <td>
                    <Badge tone={m.qty > 0 ? "good" : m.kind === "waste" ? "bad" : "muted"}>{m.kind}</Badge>
                  </td>
                  <td className="num">{m.qty > 0 ? `+${m.qty}` : m.qty}</td>
                  <td className="text-xs">{m.reason ?? "—"}</td>
                  <td className="text-xs">{m.created_by ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          </>
        )}
      </Card>
    </>
  );
}
