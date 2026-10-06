import type { Metadata } from "next";
import { LogPurchase, type PurchaseProduct } from "@/components/admin/log-purchase";
import { PageHeader } from "@/components/admin/ui";
import { loadActiveLineups, loadBoxRules, loadCatalog, loadSettings, loadVendors } from "@/lib/admin/db";
import { eligibleBoxes } from "@/lib/admin/rules";
import { BOX_LABEL, BOX_SLUGS } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Log purchase" };

export default async function LogPurchasePage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const [{ snacks, products, lots }, vendors, lineups, settings, rules] = await Promise.all([loadCatalog(), loadVendors(), loadActiveLineups(), loadSettings(), loadBoxRules()]);
  const upc = new Map(products.map((p) => [p.id, p.upc]));
  const usedIn = (id: string) => BOX_SLUGS.filter((b) => lineups[b]?.items.some((i) => i.product_id === id)).map((b) => BOX_LABEL[b]);
  const items: PurchaseProduct[] = snacks
    .filter((s) => s.status !== "Retired")
    .map((s) => {
      const mine = lots.filter((l) => l.product_id === s.id);
      const units = mine.reduce((t, l) => t + l.qty_remaining, 0);
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        brand: s.brand,
        upc: upc.get(s.id) ?? null,
        status: s.status,
        onHand: units,
        lotAvgCents: units ? mine.reduce((t, l) => t + l.qty_remaining * l.unit_cost_cents, 0) / units : null,
        unitCostCents: s.unitCostCents,
        fits: eligibleBoxes(s, rules, settings.policy, s.rejectReason),
        usedIn: usedIn(s.id),
      };
    });
  return (
    <>
      <PageHeader title="Log a purchase" description="Scan or search, enter what you paid. Unit cost, average cost and stock update instantly." />
      <LogPurchase products={items} vendors={vendors.map((v) => v.name)} initialId={product} rules={rules} policy={settings.policy} />
    </>
  );
}
