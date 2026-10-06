import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliveryForm, LabelForm, PackButtons, ShipmentPackageForm } from "@/components/admin/order-forms";
import { PlannedItems } from "@/components/admin/planned-items";
import { PrintButton } from "@/components/admin/print-button";
import { Badge, Card, PageHeader, Table, type Tone } from "@/components/admin/ui";
import { fmt$, fmtPct, shipmentProfit } from "@/lib/admin/costing";
import { db, loadBoxRules, loadCatalog, loadSettings, loadPackageProfiles, must } from "@/lib/admin/db";
import { avoidConflict } from "@/lib/admin/avoid";
import { packingProblems } from "@/lib/admin/packing";
import { stockPickList, stockSnapshot, type LotPull } from "@/lib/admin/stock";
import { eligibleFor, packBlockers } from "@/lib/admin/rules";
import { BOX_LABEL, isBoxSlug, type BoxSlug } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Shipment" };

const TONE: Record<string, Tone> = { planned: "info", packed: "warn", shipped: "good", delivered: "muted", issue: "bad" };

type Item = { id: string; qty: number; unit_cost_cents: number; lot_id: string; product_id: string; purchase_lots: { lot_code: string | null; expires_on: string | null } | null };

export default async function ShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await db().from("shipments").select("*").eq("id", id).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  if (!res.data) notFound();
  const s = res.data;
  const [catalog, itemsRes, preRes, settings, rules, packages, extrasRes] = await Promise.all([
    loadCatalog(),
    db().from("shipment_items").select("id, qty, unit_cost_cents, lot_id, product_id, purchase_lots(lot_code, expires_on)").eq("shipment_id", id),
    s.preorder_id ? db().from("preorders").select("avoid, craving, created_at, email, status").eq("id", s.preorder_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    loadSettings(),
    loadBoxRules(),
    loadPackageProfiles(),
    s.lineup_id ? db().from("lineup_items").select("id").eq("lineup_id", s.lineup_id).eq("is_extra", true) : Promise.resolve({ data: [], error: null }),
  ]);
  const items = must(itemsRes, "items") as unknown as Item[];
  const pre = must(preRes, "preorder") as { avoid: string | null; craving: string | null; created_at: string; email: string; status: string } | null;
  const slug: BoxSlug | null = isBoxSlug(s.box_slug) ? s.box_slug : null;
  const p = shipmentProfit({ ...s, snack_cost_cents: s.snack_cost_cents === null ? null : Number(s.snack_cost_cents) });
  const name = (pid: string) => catalog.byId.get(pid)?.name ?? "?";
  const addr = s.ship_to?.address as Record<string, string | null> | undefined;
  const packingProducts = new Map(catalog.snacks.map((snack) => [snack.id, { snack, upc: catalog.products.find((p) => p.id === snack.id)?.upc ?? null, verifiedAt: catalog.versions.get(snack.id)?.verified_at ?? null, ingredients: catalog.versions.get(snack.id)?.ingredients }]));
  const pkg = packages.find((p) => p.id === s.package_profile_id && p.active);
  const packagingOz = (pkg?.empty_weight_oz ?? 0) + settings.packaging.reduce((n, x) => n + x.weightOz, 0);
  const stock = stockPickList(s.planned_items, catalog.lots, catalog.versions);
  const unitPulls = new Map(stock.map((p) => [p.productId, p.pulls.flatMap((pull) => Array.from({ length: pull.qty }, () => ({ ...pull, qty: 1 }))) ]));
  const slotPulls: LotPull[][] = (s.planned_items as string[]).map((pid) => { const unit = unitPulls.get(pid)?.shift(); return unit ? [unit] : []; });
  const blockers = slug ? packingProblems({ slug, ids: s.planned_items, products: packingProducts, rules: rules[slug], settings, packagingOz, extraCount: must(extrasRes, "extras").length, avoid: pre?.avoid ?? s.avoid ?? null }) : ["Unknown box"];
  if (pre && pre.status !== "paid") blockers.push("Order is no longer paid — check its payment before packing");
  if (!pkg) blockers.push("No active package profile selected. Configure a default package in Settings.");
  for (const row of stock) if (row.short) blockers.push(`${name(row.productId)}: short ${row.short} packable unit(s)`);
  const options = catalog.snacks.map((x) => {
    const item = packingProducts.get(x.id)!;
    const fit = slug ? eligibleFor(slug, x, rules[slug], settings.policy, x.rejectReason) : null;
    const conflict = avoidConflict({ ...x, ingredients: item.ingredients }, pre?.avoid ?? s.avoid);
    const why = [conflict, ...(slug ? packBlockers(slug, [item], rules[slug], settings.policy) : [])].filter(Boolean).join("; ");
    const pull = stockPickList([x.id], catalog.lots, catalog.versions)[0];
    return { id: x.id, label: `${x.code} ${x.name}${x.brand ? ` · ${x.brand}` : ""} · ${x.onHand} packable`, ok: Boolean(fit?.fits && !why), reason: why || null, pulls: pull.pulls, short: pull.short };
  }).sort((a, b) => Number(b.ok && b.short === 0) - Number(a.ok && a.short === 0) || a.label.localeCompare(b.label));

  return (
    <>
      <PageHeader
        title={s.code}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {slug ? BOX_LABEL[slug] : s.box_slug} box · {s.kind}
            <Badge tone={TONE[s.status]}>{s.status}</Badge>
            {s.issue && <Badge tone="bad">{s.issue}</Badge>}
          </span>
        }
        actions={
          <>
            <PrintButton />
            {s.status !== "planned" && <PackButtons id={id} status={s.status} />}
          </>
        }
      />
      {s.notes && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{s.notes}</p>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={s.status === "planned" ? `Planned items (${s.planned_items.length})` : "Pick list: what was packed"}>
            {s.status === "planned" ? (
              <PlannedItems key={`${s.planned_items.join(",")}:${JSON.stringify(stockSnapshot(stock))}:${s.package_profile_id}`} shipmentId={id} items={s.planned_items} options={options} blockers={blockers} expectedLots={JSON.stringify(stockSnapshot(stock))} expectedPackage={s.package_profile_id} slotPulls={slotPulls} />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Lot</th>
                    <th>Expires</th>
                    <th className="num">Qty</th>
                    <th className="num">Unit cost</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td>
                        <Link href={`/admin/products/${it.product_id}`} className="hover:underline">
                          {name(it.product_id)}
                        </Link>
                      </td>
                      <td className="font-mono text-xs">{it.purchase_lots?.lot_code ?? it.lot_id.slice(0, 8)}</td>
                      <td className="text-xs">{it.purchase_lots?.expires_on ?? "—"}</td>
                      <td className="num">{it.qty}</td>
                      <td className="num">{fmt$(Number(it.unit_cost_cents))}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          {(s.status === "packed" || s.status === "shipped" || s.status === "delivered" || s.status === "issue") && (
            <Card title="Label (from Pirate Ship)">
              <LabelForm id={id} status={s.status} initial={{ carrier: s.carrier, service: s.service, zone: s.zone, label_cost_cents: s.label_cost_cents, tracking: s.tracking }} />
              {(s.status === "shipped" || s.status === "delivered" || s.status === "issue") && (
                <div className="mt-4 border-t pt-4">
                  <DeliveryForm id={id} />
                </div>
              )}
            </Card>
          )}
        </div>
        <div className="space-y-4">
          {s.status === "planned" && <Card title="Package"><ShipmentPackageForm key={s.package_profile_id} id={id} initialId={s.package_profile_id} packages={packages.filter((p) => p.active)} /><Link className="mt-2 inline-block text-xs underline" href="/admin/settings">Manage package sizes</Link></Card>}
          <Card title="Ship to">
            <p className="font-medium">{s.recipient_name ?? "—"}</p>
            {addr && (
              <p className="text-sm text-muted-foreground">
                {addr.line1}
                {addr.line2 ? `, ${addr.line2}` : ""}
                <br />
                {addr.city}, {addr.state} {addr.postal_code}
              </p>
            )}
            <p className="text-sm text-muted-foreground">{s.recipient_email}</p>
            {!pre && s.avoid && <Badge tone="warn">Avoid: {s.avoid}</Badge>}
            {pre && (
              <div className="mt-2 space-y-1 text-sm">
                {pre.avoid && <Badge tone="warn">Avoid: {pre.avoid}</Badge>}
                {pre.craving && <p>Craving: {pre.craving}</p>}
                <p className="text-xs text-muted-foreground">Ordered {new Date(pre.created_at).toLocaleDateString()}</p>
              </div>
            )}
            {s.tracking && <p className="mt-2 font-mono text-xs">Tracking {s.tracking}</p>}
          </Card>
          <Card title="Order P&L">
            <dl className="space-y-1 text-sm">
              {[
                ["Revenue", s.revenue_cents],
                ["Stripe fee", s.stripe_fee_cents === null ? null : -s.stripe_fee_cents],
                ["Snacks actually packed", s.snack_cost_cents === null ? null : -Number(s.snack_cost_cents)],
                ["Packaging", s.packaging_cost_cents === null ? null : -s.packaging_cost_cents],
                [p.postageIsEstimate ? "Postage (estimate)" : "Shipping label", -p.postage],
                ["Allocated overhead", s.overhead_cents === null ? null : -s.overhead_cents],
              ].map(([label, v]) => (
                <div key={label as string} className="flex justify-between">
                  <dt>{label}</dt>
                  <dd className="tabular-nums">{fmt$(v as number | null)}</dd>
                </div>
              ))}
              <div className={`flex justify-between border-t pt-2 text-base font-semibold ${p.profit < 0 ? "text-red-700" : "text-emerald-700"}`}>
                <dt>Profit</dt>
                <dd className="tabular-nums">
                  {s.snack_cost_cents === null ? "after packing" : `${fmt$(p.profit)} · ${fmtPct(p.margin)}`}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              Packed {s.packed_at ? new Date(s.packed_at).toLocaleString() : "—"} {s.packed_by ? `by ${s.packed_by}` : ""} · weight {s.packed_weight_oz ?? "—"} oz
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
