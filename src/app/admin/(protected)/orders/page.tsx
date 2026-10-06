import type { Metadata } from "next";
import Link from "next/link";
import { ManualShipmentForm, PirateShipImport, PlanAllButton } from "@/components/admin/order-forms";
import { Badge, Card, Disclosure, Empty, PageHeader, PillTabs, Table, type Tone } from "@/components/admin/ui";
import { createShipmentForPreorder } from "@/actions/admin/orders";
import { Button } from "@/components/ui/button";
import { fmt$, shipmentProfit } from "@/lib/admin/costing";
import { db, allRows } from "@/lib/admin/db";
import { BOX_LABEL, isBoxSlug } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Orders" };

type Pre = { id: string; created_at: string; email: string; customer_name: string | null; amount_total: number; box_slug: string | null; avoid: string | null; craving: string | null; status: string; shipping: { name?: string } | null };
type Ship = {
  id: string;
  code: string;
  created_at: string;
  kind: string;
  status: string;
  box_slug: string;
  preorder_id: string | null;
  recipient_name: string | null;
  revenue_cents: number | null;
  stripe_fee_cents: number | null;
  snack_cost_cents: number | null;
  packaging_cost_cents: number | null;
  overhead_cents: number | null;
  label_cost_cents: number | null;
  est_postage_cents: number | null;
  tracking: string | null;
  notes: string | null;
};

const STATUS_TONE: Record<string, Tone> = { planned: "info", packed: "warn", shipped: "good", delivered: "muted", issue: "bad" };
const TABS = [
  ["todo", "To plan"],
  ["planned", "To pack"],
  ["packed", "To ship"],
  ["shipped", "Shipped"],
  ["done", "Delivered / issues"],
] as const;

const box = (s: string | null) => (s && isBoxSlug(s) ? BOX_LABEL[s] : (s ?? "—"));

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "planned";
  const [pres, ships] = await Promise.all([
    allRows<Pre>((from, to) => db().from("preorders").select("id, created_at, email, customer_name, amount_total, box_slug, avoid, craving, status, shipping").order("created_at").order("id").range(from, to), "preorders"),
    allRows<Ship>((from, to) => db().from("shipments").select("*").order("created_at", { ascending: false }).order("id").range(from, to), "shipments"),
  ]);
  const planned = new Set(ships.map((s) => s.preorder_id).filter(Boolean));
  const todo = pres.filter((p) => p.status === "paid" && !planned.has(p.id));
  const count = (k: string) =>
    k === "todo" ? todo.length : k === "done" ? ships.filter((s) => s.status === "delivered" || s.status === "issue").length : ships.filter((s) => s.status === k).length;
  const list = ships.filter((s) => (tab === "done" ? s.status === "delivered" || s.status === "issue" : s.status === tab));

  return (
    <>
      <PageHeader
        title="Orders"
        description="Paid Stripe preorders → planned shipment → packed (stock deducted, earliest expiry first) → label from Pirate Ship → shipped."
        actions={<PlanAllButton />}
      />
      <PillTabs
        label="Order status"
        tabs={TABS.map(([k, label]) => ({ key: k, label, href: `/admin/orders?tab=${k}`, count: count(k), active: tab === k }))}
      />

      {tab === "todo" ? (
        todo.length === 0 ? (
          <Empty>Every paid order has a shipment.</Empty>
        ) : (
          <>
          <ul className="space-y-2 sm:hidden">
            {todo.map((p) => (
              <li key={p.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.shipping?.name ?? p.customer_name ?? "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                  </div>
                  <span className="text-sm tabular-nums">{fmt$(p.amount_total)}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <Badge tone="info">{box(p.box_slug)}</Badge>
                  {p.avoid ? <Badge tone="warn">avoid: {p.avoid}</Badge> : null}
                  <span className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
                {p.craving && <p className="mt-1 text-xs text-muted-foreground">Craving: {p.craving}</p>}
                <form action={createShipmentForPreorder} className="mt-2">
                  <input type="hidden" name="preorder_id" value={p.id} />
                  <Button className="h-11 w-full" variant="outline">
                    Plan this order
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <Card className="hidden sm:block">
            <Table>
              <thead>
                <tr>
                  <th>Ordered</th>
                  <th>Customer</th>
                  <th>Box</th>
                  <th>Avoid / craving</th>
                  <th className="num">Paid</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {todo.map((p) => (
                  <tr key={p.id}>
                    <td className="text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td>
                      {p.shipping?.name ?? p.customer_name ?? "—"}
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </td>
                    <td>{box(p.box_slug)}</td>
                    <td className="max-w-56 text-xs">
                      {p.avoid ? <Badge tone="warn">avoid: {p.avoid}</Badge> : null} {p.craving ?? ""}
                    </td>
                    <td className="num">{fmt$(p.amount_total)}</td>
                    <td>
                      <form action={createShipmentForPreorder}>
                        <input type="hidden" name="preorder_id" value={p.id} />
                        <Button size="xs" variant="outline">
                          Plan
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
          </>
        )
      ) : list.length === 0 ? (
        <Empty>Nothing here.</Empty>
      ) : (
        <>
        <ul className="space-y-2 sm:hidden">
          {tab === "packed" && (
            <li>
              <Button asChild variant="outline" className="h-11 w-full">
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- CSV download, not a page */}
                <a href="/admin/orders/pirateship">Export for Pirate Ship</a>
              </Button>
            </li>
          )}
          {list.map((s) => {
            const pr = shipmentProfit({ ...s, snack_cost_cents: s.snack_cost_cents === null ? null : Number(s.snack_cost_cents) });
            return (
              <li key={s.id}>
                <Link href={`/admin/orders/${s.id}`} className="block rounded-xl border bg-card p-3 active:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{s.code}</span>
                    {s.kind !== "order" && <Badge>{s.kind}</Badge>}
                    <Badge tone={STATUS_TONE[s.status]} className="ml-auto">
                      {s.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm">
                    {s.recipient_name ?? "—"} <span className="text-muted-foreground">· {box(s.box_slug)}</span>
                  </p>
                  {s.notes && <p className="mt-1 line-clamp-2 text-xs text-amber-700">{s.notes}</p>}
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    Revenue {fmt$(s.revenue_cents)} · Profit {s.snack_cost_cents === null ? "after packing" : `${fmt$(pr.profit)}${pr.postageIsEstimate ? "*" : ""}`}
                  </p>
                </Link>
              </li>
            );
          })}
          <li className="text-xs text-muted-foreground">* postage estimated until the real label cost is entered.</li>
        </ul>
        <Card
          className="hidden sm:block"
          action={
            tab === "packed" && (
              <Button asChild size="sm" variant="outline">
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- CSV download, not a page */}
                <a href="/admin/orders/pirateship">Export for Pirate Ship</a>
              </Button>
            )
          }
        >
          <Table>
            <thead>
              <tr>
                <th>Shipment</th>
                <th>Recipient</th>
                <th>Box</th>
                <th>Status</th>
                <th className="num">Revenue</th>
                <th className="num">Profit</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const pr = shipmentProfit({ ...s, snack_cost_cents: s.snack_cost_cents === null ? null : Number(s.snack_cost_cents) });
                return (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/admin/orders/${s.id}`} className="font-mono hover:underline">
                        {s.code}
                      </Link>
                      {s.kind !== "order" && <Badge className="ml-1">{s.kind}</Badge>}
                    </td>
                    <td>
                      {s.recipient_name ?? "—"}
                      {s.notes && <div className="max-w-64 truncate text-xs text-amber-700" title={s.notes}>{s.notes}</div>}
                    </td>
                    <td>{box(s.box_slug)}</td>
                    <td>
                      <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
                    </td>
                    <td className="num">{fmt$(s.revenue_cents)}</td>
                    <td className="num">{s.snack_cost_cents === null ? "—" : `${fmt$(pr.profit)}${pr.postageIsEstimate ? "*" : ""}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <p className="mt-2 text-xs text-muted-foreground">* postage estimated until the real label cost is entered.</p>
        </Card>
        </>
      )}

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
        <Disclosure title="Pirate Ship" summary="export packed boxes, import labels">
          <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              Pack boxes here, then{" "}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- CSV download, not a page */}
              <a className="text-primary underline" href="/admin/orders/pirateship">export the packed list</a> and use Pirate Ship&apos;s &ldquo;Import spreadsheet&rdquo; (Order ID = our KEN- code).</li>
            <li>Buy the labels in Pirate Ship (Ground Advantage, Cubic when cheaper, or UPS Ground Saver).</li>
            <li>Export Pirate Ship&apos;s shipment history CSV and import it here: actual cost and tracking fill in and boxes move to Shipped.</li>
          </ol>
          <PirateShipImport />
        </Disclosure>
        <Disclosure title="Gift, sample or replacement" summary="a $0 shipment packed like an order">
          <ManualShipmentForm />
        </Disclosure>
      </div>
    </>
  );
}
