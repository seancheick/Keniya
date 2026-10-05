import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, Empty, PageHeader, Stat, Table, fieldClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { fmt$ } from "@/lib/admin/costing";
import { db, must } from "@/lib/admin/db";
import { BOX_LABEL, isBoxSlug } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Customers" };

type Pre = { id: string; created_at: string; email: string; customer_name: string | null; amount_total: number; box_slug: string | null; avoid: string | null; craving: string | null; status: string };
type Ship = { id: string; code: string; preorder_id: string | null; status: string };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [preRes, shipRes] = await Promise.all([
    db().from("preorders").select("id, created_at, email, customer_name, amount_total, box_slug, avoid, craving, status").order("created_at", { ascending: false }),
    db().from("shipments").select("id, code, preorder_id, status").not("preorder_id", "is", null),
  ]);
  const pres = must(preRes, "preorders") as Pre[];
  const ships = must(shipRes, "shipments") as Ship[];
  const shipBy = new Map(ships.map((s) => [s.preorder_id, s]));
  const customers = new Map<string, { email: string; name: string | null; orders: Pre[] }>();
  for (const p of pres) {
    const k = p.email.toLowerCase();
    const c = customers.get(k) ?? { email: p.email, name: p.customer_name, orders: [] };
    c.orders.push(p);
    c.name ??= p.customer_name;
    customers.set(k, c);
  }
  const list = [...customers.values()].filter((c) => !q || `${c.email} ${c.name ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const repeat = [...customers.values()].filter((c) => c.orders.length > 1).length;

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone who ordered, with what they asked us to avoid. Ratings and “never send again” arrive with the post-delivery feedback page (phase 6)."
      />
      <Card className="mb-4">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Customers" value={customers.size} />
          <Stat label="Repeat customers" value={repeat} hint={customers.size ? `${Math.round((repeat / customers.size) * 100)}% (subscribe at ≥30%)` : undefined} />
          <Stat label="Lifetime revenue" value={fmt$(pres.reduce((s, p) => s + p.amount_total, 0), 0)} />
        </div>
      </Card>
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search email or name" className={`${fieldClass} max-w-xs`} aria-label="Search" />
        <Button variant="secondary">Search</Button>
      </form>
      {list.length === 0 ? (
        <Empty>No customers yet.</Empty>
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <th>Customer</th>
                <th className="num">Orders</th>
                <th className="num">Spent</th>
                <th>Boxes</th>
                <th>Avoid</th>
                <th>Shipments</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.email}>
                  <td>
                    {c.name ?? "—"}
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </td>
                  <td className="num">{c.orders.length}</td>
                  <td className="num">{fmt$(c.orders.reduce((s, o) => s + o.amount_total, 0))}</td>
                  <td className="text-xs">{[...new Set(c.orders.map((o) => (o.box_slug && isBoxSlug(o.box_slug) ? BOX_LABEL[o.box_slug] : "?")))].join(", ")}</td>
                  <td className="max-w-48 text-xs">{[...new Set(c.orders.map((o) => o.avoid).filter(Boolean))].join("; ") || "—"}</td>
                  <td className="space-x-1">
                    {c.orders.map((o) => {
                      const s = shipBy.get(o.id);
                      return s ? (
                        <Link key={o.id} href={`/admin/orders/${s.id}`}>
                          <Badge>{s.code} · {s.status}</Badge>
                        </Link>
                      ) : (
                        <Badge key={o.id} tone="info">
                          not planned
                        </Badge>
                      );
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
