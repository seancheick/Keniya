import type { Metadata } from "next";
import { setPromoActive } from "@/actions/admin/promos";
import { PromoForm } from "@/components/admin/promo-form";
import { Badge, Card, Empty, PageHeader, Table } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { fmt$ } from "@/lib/admin/costing";
import { allRows, db } from "@/lib/admin/db";
import { listPromoCodes } from "@/lib/promo-codes";
import { getStripe } from "@/lib/stripe";

export const metadata: Metadata = { title: "Promo codes" };

type Order = { promo_code?: string | null; amount_total: number; status: string };

export default async function PromosPage() {
  const stripe = getStripe();
  const [codes, orders] = await Promise.all([
    stripe ? listPromoCodes(stripe) : Promise.resolve([]),
    // "*" so the page works on either side of the migration that adds promo_code.
    allRows<Order>((from, to) => db().from("preorders").select("*").range(from, to), "preorders"),
  ]);
  const byCode = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    if (!o.promo_code || o.status === "refunded") continue;
    const k = o.promo_code.toUpperCase();
    const v = byCode.get(k) ?? { orders: 0, revenue: 0 };
    byCode.set(k, { orders: v.orders + 1, revenue: v.revenue + o.amount_total });
  }

  return (
    <>
      <PageHeader
        title="Promo codes"
        description="Codes for vendors, partners and creators. Customers type them at checkout for a percent off one one-time box (gifts included). They don't apply to the Snack Club, and only one code works per order."
      />
      <Card title="New code" className="mb-4">
        <PromoForm />
      </Card>
      {!stripe ? (
        <Empty>Stripe isn&rsquo;t configured on this environment.</Empty>
      ) : codes.length === 0 ? (
        <Empty>No promo codes yet.</Empty>
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Vendor</th>
                <th className="num">Off</th>
                <th className="num">Used</th>
                <th className="num">Orders · revenue</th>
                <th>Expires</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const sales = byCode.get(c.code.toUpperCase());
                return (
                  <tr key={c.id}>
                    <td className="font-mono font-medium">
                      {c.code} {!c.active && <Badge tone="muted">off</Badge>}
                    </td>
                    <td>{c.vendor || "—"}</td>
                    <td className="num">{c.percentOff !== null ? `${c.percentOff}%` : "—"}</td>
                    <td className="num">{c.timesRedeemed}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}</td>
                    <td className="num">{sales ? `${sales.orders} · ${fmt$(sales.revenue)}` : "—"}</td>
                    <td className="text-xs">{c.expiresAt ? new Date(c.expiresAt * 1000).toLocaleDateString() : "—"}</td>
                    <td>
                      <form action={setPromoActive}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="active" value={String(!c.active)} />
                        <Button size="xs" variant="outline">{c.active ? "Turn off" : "Turn on"}</Button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
