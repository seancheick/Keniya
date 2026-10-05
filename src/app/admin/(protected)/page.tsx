import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, PageHeader, Stat, TextLink, expiryTone } from "@/components/admin/ui";
import { fmt$, fmtPct, shipmentProfit } from "@/lib/admin/costing";
import { db, must } from "@/lib/admin/db";
import { daysUntil } from "@/lib/admin/optimizer";
import { blockingFailures, fitFor, nutritionComplete, shipsUnderPolicy } from "@/lib/admin/rules";
import { loadAdminContext } from "@/lib/admin/summary";
import { BOX_LABEL, BOX_SLUGS } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Dashboard" };

type Ship = {
  status: string;
  preorder_id: string | null;
  packed_at: string | null;
  revenue_cents: number | null;
  stripe_fee_cents: number | null;
  snack_cost_cents: number | null;
  packaging_cost_cents: number | null;
  overhead_cents: number | null;
  label_cost_cents: number | null;
  est_postage_cents: number | null;
};

export default async function Dashboard() {
  const [ctx, shipsRes, presRes] = await Promise.all([
    loadAdminContext(),
    db().from("shipments").select("status, preorder_id, packed_at, revenue_cents, stripe_fee_cents, snack_cost_cents, packaging_cost_cents, overhead_cents, label_cost_cents, est_postage_cents"),
    db().from("preorders").select("id").eq("status", "paid"),
  ]);
  const ships = must(shipsRes, "shipments") as Ship[];
  const paid = must(presRes, "preorders") as { id: string }[];
  const { catalog, settings, boxes } = ctx;
  const tiers = settings.expiryTiersDays;

  const withShipment = new Set(ships.map((s) => s.preorder_id));
  const toPlan = paid.filter((p) => !withShipment.has(p.id)).length;
  const toPack = ships.filter((s) => s.status === "planned").length;
  const toShip = ships.filter((s) => s.status === "packed").length;

  // Inventory
  const lots = catalog.lots;
  const units = lots.reduce((s, l) => s + l.qty_remaining, 0);
  const value = lots.reduce((s, l) => s + l.qty_remaining * l.unit_cost_cents, 0);
  const expiring = lots
    .map((l) => ({ l, d: daysUntil(l.expires_on), s: catalog.byId.get(l.product_id)! }))
    .filter((x) => x.d !== null && x.d < tiers[2])
    .sort((a, b) => a.d! - b.d!);
  const atRisk = (max: number) => expiring.filter((x) => x.d! < max).reduce((t, x) => t + x.l.qty_remaining * x.l.unit_cost_cents, 0);
  const lowStock = BOX_SLUGS.flatMap((b) => boxes[b].picks.filter((p) => p.snack.onHand < settings.runSize[b]).map((p) => p.snack.id));
  const warnings = new Set(lowStock).size + expiring.filter((x) => x.d! < tiers[0]).length;

  // This month (by pack date: that's when cost is known)
  const month = new Date().toISOString().slice(0, 7);
  const mine = ships.filter((s) => s.packed_at?.startsWith(month));
  const m = mine.reduce(
    (t, s) => {
      const p = shipmentProfit({ ...s, snack_cost_cents: s.snack_cost_cents === null ? null : Number(s.snack_cost_cents) });
      return {
        revenue: t.revenue + p.revenue,
        cogs: t.cogs + Number(s.snack_cost_cents ?? 0) + (s.packaging_cost_cents ?? 0),
        shipping: t.shipping + p.postage,
        profit: t.profit + p.profit,
      };
    },
    { revenue: 0, cogs: 0, shipping: 0, profit: 0 },
  );

  // Library health (workbook Dashboard)
  const health = [
    ["Products", catalog.snacks.length, "/admin/products"],
    ["Missing nutrition", catalog.snacks.filter((s) => !nutritionComplete(s)).length, "/admin/products?issue=nutrition"],
    ["No cost yet", catalog.snacks.filter((s) => s.unitCostCents === null).length, "/admin/products?issue=cost"],
    ["Don't ship (policy)", catalog.snacks.filter((s) => !shipsUnderPolicy(s, settings.policy).ok).length, "/admin/products?issue=ships"],
    ["Approved", catalog.snacks.filter((s) => s.status === "Approved").length, "/admin/products?status=Approved"],
    ["Pre-approved (awaiting clinician)", catalog.snacks.filter((s) => s.status === "Pre-approved").length, "/admin/products?status=Pre-approved"],
    ["Candidates", catalog.snacks.filter((s) => s.status === "Candidate").length, "/admin/products?status=Candidate"],
    ["Fit all three boxes", catalog.snacks.filter((s) => BOX_SLUGS.every((b) => fitFor(b, s).fits)).length, "/admin/products"],
  ] as const;

  return (
    <>
      <PageHeader title="Dashboard" description={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} />

      <Card title="Today" className="mb-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Link href="/admin/orders?tab=todo"><Stat label="Paid orders to plan" value={toPlan} tone={toPlan ? "info" : undefined} /></Link>
          <Link href="/admin/orders?tab=planned"><Stat label="To pack" value={toPack} tone={toPack ? "warn" : undefined} /></Link>
          <Link href="/admin/orders?tab=packed"><Stat label="Ready to ship" value={toShip} tone={toShip ? "good" : undefined} /></Link>
          <Link href="/admin/inventory?show=expiring"><Stat label="Inventory warnings" value={warnings} tone={warnings ? "bad" : undefined} hint="low stock for a run, or expiring soon" /></Link>
        </div>
      </Card>

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        {BOX_SLUGS.map((slug) => {
          const b = boxes[slug];
          const fails = blockingFailures(b.checks);
          return (
            <Link key={slug} href={`/admin/boxes/${slug}`}>
              <Card className="h-full hover:border-primary">
                <div className="mb-3 flex items-center gap-2">
                  <p className="font-display text-lg">{BOX_LABEL[slug]}</p>
                  <Badge tone={b.ready ? "good" : "bad"} className="ml-auto">
                    {!b.lineup ? "No lineup" : b.ready ? "READY ✓" : "FIX ⚠"}
                  </Badge>
                </div>
                {b.cost ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Can build" value={b.canBuild.n} tone={b.canBuild.n < settings.runSize[slug] ? "warn" : "good"} hint={b.canBuild.limiting ? `Limit: ${b.canBuild.limiting.name} (${b.canBuild.limiting.onHand})` : undefined} />
                    <Stat label="Snacks" value={fmt$(b.cost.snackCents)} />
                    <Stat label="Landed" value={fmt$(b.cost.totalCents)} />
                    <Stat label="Margin" value={fmtPct(b.cost.contributionPct)} tone={b.cost.contributionCents < 0 ? "bad" : "good"} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Build and activate a lineup.</p>
                )}
                {fails.length > 0 && <p className="mt-2 text-xs text-red-700">{fails.map((f) => f.label).slice(0, 2).join(" · ")}{fails.length > 2 ? ` +${fails.length - 2}` : ""}</p>}
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Inventory">
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Units" value={units.toLocaleString()} />
            <Stat label="Value" value={fmt$(value)} />
            <Stat label={`Expiring < ${tiers[1]} d`} value={fmt$(atRisk(tiers[1]))} tone={atRisk(tiers[1]) ? "orange" : undefined} />
          </div>
          {expiring.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm">
              {expiring.slice(0, 6).map(({ l, d, s }) => {
                const tone = expiryTone(d, tiers);
                const usedBy = BOX_SLUGS.filter((b) => boxes[b].picks.some((p) => p.snack.id === s.id));
                const fits = BOX_SLUGS.filter((b) => fitFor(b, s).fits);
                const target = usedBy[0] ?? fits[0];
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-2">
                    {tone && <Badge tone={tone}>{d! < 0 ? "expired" : `${d} d`}</Badge>}
                    <TextLink href={`/admin/products/${s.id}`}>{s.name}</TextLink>
                    <span className="text-muted-foreground">
                      {l.qty_remaining} left · {fmt$(l.qty_remaining * l.unit_cost_cents)}
                      {target ? ` → prioritize in the next ${l.qty_remaining} ${BOX_LABEL[target]} boxes` : " → fits no box: use as a gift extra"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {lowStock.length > 0 && (
            <p className="mt-3 text-xs text-amber-700">
              {new Set(lowStock).size} lineup item(s) have less stock than the planned run. <TextLink href="/admin/purchasing">See the buy list</TextLink>
            </p>
          )}
        </Card>

        <Card title="This month (packed)">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Revenue" value={fmt$(m.revenue, 0)} />
            <Stat label="COGS" value={fmt$(m.cogs, 0)} hint="snacks + packaging" />
            <Stat label="Shipping" value={fmt$(m.shipping, 0)} />
            <Stat label="Contribution" value={fmt$(m.profit, 0)} tone={m.profit < 0 ? "bad" : "good"} hint={`${mine.length} boxes`} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            <TextLink href="/admin/reports">Full P&amp;L and shipping analytics</TextLink>
          </p>
        </Card>

        <Card title="Library health" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {health.map(([label, n, href]) => (
              <Link key={label} href={href}>
                <Stat label={label} value={n} tone={(label === "Missing nutrition" || label === "No cost yet") && n > 0 ? "warn" : undefined} />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
