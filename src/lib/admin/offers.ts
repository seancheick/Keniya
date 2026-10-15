import type { Settings } from "@/lib/admin/types";

type Order = { id: string; created_at: string; status: string; kind?: string; admission_verified?: boolean };

/**
 * Which orders get the founding bonus: the first `limit` admitted orders (one-time boxes and
 * each Snack Club first box, never renewals), oldest first. The same rule the site counts
 * down from, so what's promised and what's packed can't disagree.
 */
export function foundingBonusOrders(orders: Order[], bonus: Settings["offers"]["foundingBonus"]): Set<string> {
  if (!bonus.enabled || bonus.limit <= 0) return new Set();
  const eligible = orders
    .filter((o) => o.admission_verified && o.kind !== "renewal")
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  return new Set(eligible.slice(0, bonus.limit).map((o) => o.id));
}
