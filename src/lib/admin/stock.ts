import { minExpiryDate } from "./verify";

export type StockLot = {
  id: string; product_id: string; product_version_id: string; qty_remaining: number;
  expires_on: string | null; purchased_at: string; created_at: string; lot_code: string | null;
};

/** A checked current formula and 90 days left are required for every physical lot. */
export function lotHold(lot: Pick<StockLot, "expires_on" | "product_version_id">, currentVersionId: string | undefined, now = new Date()): string | null {
  if (!currentVersionId || lot.product_version_id !== currentVersionId) return "Older formula — review separately";
  if (!lot.expires_on) return "Expiry missing — record the date on the lot";
  if (lot.expires_on < now.toISOString().slice(0, 10)) return "Expired — do not pack";
  if (lot.expires_on < minExpiryDate(now)) return "Less than 90 days left — do not pack";
  return null;
}

export type LotPull = { lotId: string; label: string; expiresOn: string; qty: number };
export type StockPick = { productId: string; needed: number; available: number; short: number; pulls: LotPull[] };

/** Preview the same FEFO order as the database. Stock is not reserved until packing. */
export function stockPickList(ids: string[], lots: StockLot[], versions: Map<string, { id: string }>, now = new Date()): StockPick[] {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].map(([productId, needed]) => {
    const eligible = lots.filter((l) => l.product_id === productId && l.qty_remaining > 0 && !lotHold(l, versions.get(productId)?.id, now))
      .sort((a, b) => a.expires_on!.localeCompare(b.expires_on!) || a.purchased_at.localeCompare(b.purchased_at) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    const available = eligible.reduce((s, l) => s + l.qty_remaining, 0);
    let remaining = needed;
    const pulls: LotPull[] = [];
    for (const l of eligible) {
      if (!remaining) break;
      const qty = Math.min(remaining, l.qty_remaining);
      pulls.push({ lotId: l.id, label: l.lot_code || l.id.slice(0, 8), expiresOn: l.expires_on!, qty });
      remaining -= qty;
    }
    return { productId, needed, available, short: remaining, pulls };
  });
}

/** Stable snapshot of the physical lots checked at the packing table. */
export function stockSnapshot(picks: StockPick[]) {
  return picks.flatMap((p) => p.pulls.map((l) => ({ product_id: p.productId, lot_id: l.lotId, qty: l.qty })))
    .sort((a, b) => a.lot_id.localeCompare(b.lot_id));
}
