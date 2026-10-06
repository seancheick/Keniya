import type { Metadata } from "next";
import Link from "next/link";
import { ManualShipmentForm, PirateShipImport, PlanAllButton } from "@/components/admin/order-forms";
import { Badge, Card, Empty, PageHeader, Table, type Tone } from "@/components/admin/ui";
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
      <div className="mb-4 flex gap-1 overflow-x-auto">
        {TABS.map(([k, label]) => (
          <Button key={k} asChild size="sm" variant={tab === k ? "default" : "outline"}>
            <Link href={`/admin/orders?tab=${k}`}>
              {label} <span className="opacity-70">{count(k)}</span>
            </Link>
          </Button>
        ))}
      </div>

      {tab === "todo" ? (
        todo.length === 0 ? (
          <Empty>Every paid order has a shipment.</Empty>
        ) : (
          <Card>
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
        )
      ) : list.length === 0 ? (
        <Empty>Nothing here.</Empty>
      ) : (
        <Card
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
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Pirate Ship">
          <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              Pack boxes here, then{" "}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- CSV download, not a page */}
              <a className="text-primary underline" href="/admin/orders/pirateship">export the packed list</a> and use Pirate Ship&apos;s &ldquo;Import spreadsheet&rdquo; (Order ID = our KEN- code).</li>
            <li>Buy the labels in Pirate Ship (Ground Advantage, Cubic when cheaper, or UPS Ground Saver).</li>
            <li>Export Pirate Ship&apos;s shipment history CSV and import it here: actual cost and tracking fill in and boxes move to Shipped.</li>
          </ol>
          <PirateShipImport />
        </Card>
        <Card title="Gift, sample or replacement">
          <ManualShipmentForm />
        </Card>
      </div>
    </>
  );
}
