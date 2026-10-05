import type { Metadata } from "next";
import Link from "next/link";
import { Card, Empty, PageHeader, Stat, Table, fieldClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { db, must, type LotRow } from "@/lib/admin/db";
import { recallRows } from "@/lib/admin/recall";

export const metadata: Metadata = { title: "Recall / trace" };

export default async function RecallPage({ searchParams }: { searchParams: Promise<{ lot?: string; product?: string }> }) {
  const sp = await searchParams;
  const products = must(await db().from("products").select("id, code, name").order("name"), "products") as { id: string; code: string; name: string }[];
  const productId = sp.product ?? (sp.lot ? ((await db().from("purchase_lots").select("product_id").eq("id", sp.lot).maybeSingle()).data?.product_id as string | undefined) : undefined);
  const lots = productId
    ? (must(await db().from("purchase_lots").select("*").eq("product_id", productId).order("purchased_at", { ascending: false }), "lots") as LotRow[])
    : [];
  const rows = sp.lot || sp.product ? await recallRows({ lot: sp.lot, product: sp.lot ? undefined : sp.product }) : [];
  const customers = new Set(rows.map((r) => r.email ?? r.shipment)).size;
  const qs = sp.lot ? `lot=${sp.lot}` : sp.product ? `product=${sp.product}` : "";

  return (
    <>
      <PageHeader title="Recall / trace" description="Pick a product (and optionally one lot) to see every shipment and customer that received it." />
      <Card className="mb-4">
        <form className="grid gap-2 sm:grid-cols-[2fr_2fr_auto]">
          <select name="product" defaultValue={productId ?? ""} className={fieldClass} aria-label="Product">
            <option value="">Choose a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
          <select name="lot" defaultValue={sp.lot ?? ""} className={fieldClass} aria-label="Lot" disabled={!lots.length}>
            <option value="">All lots of this product</option>
            {lots.map((l) => (
              <option key={l.id} value={l.id}>
                {l.lot_code ?? "no code"} · bought {l.purchased_at} · exp {l.expires_on ?? "—"} · {l.qty} units
              </option>
            ))}
          </select>
          <Button variant="secondary">Trace</Button>
        </form>
      </Card>
      {qs && (
        <Card
          title="Shipments that received it"
          action={
            rows.length > 0 && (
              <Button asChild size="sm" variant="outline">
                <a href={`/admin/inventory/recall/export?${qs}`}>Export CSV</a>
              </Button>
            )
          }
        >
          {rows.length === 0 ? (
            <Empty>Nothing from this {sp.lot ? "lot" : "product"} has been packed.</Empty>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-3 gap-4">
                <Stat label="Shipments" value={new Set(rows.map((r) => r.shipment)).size} />
                <Stat label="Customers" value={customers} />
                <Stat label="Units" value={rows.reduce((s, r) => s + r.qty, 0)} />
              </div>
              <Table>
                <thead>
                  <tr>
                    <th>Shipment</th>
                    <th>Customer</th>
                    <th>Address</th>
                    <th>Lot</th>
                    <th className="num">Qty</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <Link className="font-mono hover:underline" href={`/admin/orders/${r.shipmentId}`}>
                          {r.shipment}
                        </Link>
                      </td>
                      <td>
                        {r.name ?? "—"}
                        <div className="text-xs text-muted-foreground">{r.email ?? ""}</div>
                      </td>
                      <td className="max-w-64 text-xs">{r.address || "—"}</td>
                      <td className="font-mono text-xs">{r.lotCode ?? r.lotId.slice(0, 8)}</td>
                      <td className="num">{r.qty}</td>
                      <td>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </Card>
      )}
    </>
  );
}
