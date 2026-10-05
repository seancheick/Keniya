// Box lineup optimizer. Builds a lineup that passes every blocking check for the box, scored
// by an objective (margin, expiring stock, overstock, customer favorites, or balanced).
//
// Method (deterministic, ~100 products → milliseconds):
//   1. candidates = qualifies for the box, ships, not rejected/retired, in a box category
//   2. greedy: fill each category's minimum with its best-scoring candidates
//   3. greedy: fill up to the total within category maximums
//   4. repair: single swaps that most reduce the total check deficit
//   5. improve: single swaps that raise the score without breaking anything
import { checkLineup, fitFor, shipsUnderPolicy, type Check, type Pick } from "./rules";
import type { BoxRules, BoxSlug, Objective, Settings, Snack } from "./types";

export type OptimizeInput = {
  slug: BoxSlug;
  rules: BoxRules;
  settings: Settings;
  snacks: Snack[];
  objective: Objective;
  packagingOz: number;
  /** Boxes planned (for overstock scoring and can-build). */
  runSize?: number;
  /** Products this order/customer must not get (avoid list, never-send). */
  excludeIds?: string[];
  /** Only use products with stock on hand (default true). */
  requireStock?: boolean;
  /** Fixed "today" for expiry math (tests). */
  today?: Date;
};

export type OptimizeResult = {
  picks: Pick[];
  checks: Check[];
  score: number;
  /** Candidates considered, for the UI. */
  candidates: number;
  /** Total deficit left (0 = every blocking check passes). */
  deficit: number;
};

const DAY = 86_400_000;

export function daysUntil(iso: string | null, today = new Date()) {
  if (!iso) return null;
  return Math.round((new Date(`${iso}T00:00:00Z`).getTime() - Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) / DAY);
}

export function scorer(objective: Objective, pool: Snack[], runSize: number, today: Date) {
  const costs = pool.map((s) => s.unitCostCents ?? Infinity).filter(Number.isFinite);
  const maxCost = Math.max(1, ...costs);
  const need = Math.max(1, runSize);
  const parts = (s: Snack) => {
    const margin = s.unitCostCents === null ? 0 : 1 - s.unitCostCents / maxCost;
    const d = daysUntil(s.earliestExpiry, today);
    const expiring = d === null ? 0 : 1 / (1 + Math.max(0, d) / 30);
    const overstock = Math.min(1, s.onHand / (need * 2));
    const favorite = s.loveRate ?? 0.5;
    const approved = s.status === "Approved" ? 1 : 0;
    return { margin, expiring, overstock, favorite, approved };
  };
  return (s: Snack) => {
    const p = parts(s);
    const main =
      objective === "margin"
        ? p.margin
        : objective === "expiring"
          ? p.expiring
          : objective === "overstock"
            ? p.overstock
            : objective === "favorites"
              ? p.favorite
              : 0.35 * p.margin + 0.2 * p.favorite + 0.2 * p.expiring + 0.15 * p.overstock + 0.1 * p.approved;
    // Approved products and stock win ties; tiny margin term keeps cheap-first as last resort.
    return main + 0.05 * p.approved + 0.01 * p.margin + (s.onHand > 0 ? 0.01 : 0);
  };
}

const deficitOf = (checks: Check[]) =>
  checks.filter((c) => c.level === "block").reduce((t, c) => t + c.deficit, 0);

export function optimize(input: OptimizeInput): OptimizeResult {
  const { slug, rules, settings, packagingOz } = input;
  const today = input.today ?? new Date();
  const exclude = new Set(input.excludeIds ?? []);
  const catNames = rules.categories.map((c) => c.name);
  const pool = input.snacks.filter(
    (s) =>
      !exclude.has(s.id) &&
      s.status !== "Rejected" &&
      s.status !== "Retired" &&
      (input.requireStock === false || s.onHand > 0) &&
      fitFor(slug, s).fits &&
      shipsUnderPolicy(s, settings.policy).ok &&
      (catNames.length === 0 || s.categories.some((c) => catNames.includes(c))),
  );
  const score = scorer(input.objective, pool, input.runSize ?? 1, today);
  const sc = new Map(pool.map((s) => [s.id, score(s)]));
  const ranked = [...pool].sort((a, b) => sc.get(b.id)! - sc.get(a.id)! || a.code.localeCompare(b.code));

  const picks: Pick[] = [];
  const used = new Set<string>();
  const inCat = (c: string) => picks.filter((p) => p.category === c).length;
  const typeCount = (t: Snack["type"]) => picks.filter((p) => p.snack.type === t).length;
  const typeOk = (s: Snack) =>
    !(s.type === "Mini" && rules.miniMax !== null && typeCount("Mini") >= rules.miniMax) &&
    !(s.type === "Beverage" && rules.beverageMax !== null && typeCount("Beverage") >= rules.beverageMax);
  const catsOf = (s: Snack) => (catNames.length ? s.categories.filter((c) => catNames.includes(c)) : [null]);

  // 2. category minimums, scarcest category first
  const byScarcity = [...rules.categories].sort(
    (a, b) => pool.filter((s) => s.categories.includes(a.name)).length - pool.filter((s) => s.categories.includes(b.name)).length,
  );
  for (const c of byScarcity) {
    for (const s of ranked) {
      if (inCat(c.name) >= c.min || picks.length >= rules.total) break;
      if (used.has(s.id) || !s.categories.includes(c.name) || !typeOk(s)) continue;
      picks.push({ snack: s, category: c.name });
      used.add(s.id);
    }
  }
  // 3. fill to total within maximums
  for (const s of ranked) {
    if (picks.length >= rules.total) break;
    if (used.has(s.id) || !typeOk(s)) continue;
    const cat = catsOf(s).find((c) => c === null || inCat(c) < (rules.categories.find((r) => r.name === c)?.max ?? Infinity));
    if (cat === undefined) continue;
    picks.push({ snack: s, category: cat });
    used.add(s.id);
  }

  // 4 + 5. local search over single swaps
  const evaluate = (ps: Pick[]) => {
    const checks = checkLineup(slug, rules, ps, settings, packagingOz);
    return { checks, deficit: deficitOf(checks), score: ps.reduce((t, p) => t + (sc.get(p.snack.id) ?? 0), 0) };
  };
  let cur = evaluate(picks);
  for (let iter = 0; iter < 200; iter++) {
    let best: { picks: Pick[]; deficit: number; score: number; checks: Check[] } | null = null;
    for (let i = 0; i < picks.length; i++) {
      for (const s of pool) {
        if (used.has(s.id)) continue;
        for (const cat of catsOf(s)) {
          const next = picks.slice();
          next[i] = { snack: s, category: cat };
          const e = evaluate(next);
          const better = best ? e.deficit < best.deficit || (e.deficit === best.deficit && e.score > best.score + 1e-9) : true;
          const improves = e.deficit < cur.deficit || (e.deficit === cur.deficit && e.score > cur.score + 1e-9);
          if (improves && better) best = { picks: next, ...e };
        }
      }
    }
    if (!best) break;
    used.clear();
    picks.splice(0, picks.length, ...best.picks);
    for (const p of picks) used.add(p.snack.id);
    cur = { checks: best.checks, deficit: best.deficit, score: best.score };
  }

  return { picks, checks: cur.checks, score: cur.score, candidates: pool.length, deficit: cur.deficit };
}

/** How many complete boxes current stock allows, and which item runs out first. */
export function canBuild(picks: Pick[]): { n: number; limiting: Snack | null } {
  if (!picks.length) return { n: 0, limiting: null };
  const per = new Map<string, { snack: Snack; perBox: number }>();
  for (const p of picks) {
    const e = per.get(p.snack.id);
    per.set(p.snack.id, { snack: p.snack, perBox: (e?.perBox ?? 0) + 1 });
  }
  let n = Infinity;
  let limiting: Snack | null = null;
  for (const { snack, perBox } of per.values()) {
    const k = Math.floor(Math.max(0, snack.onHand) / perBox);
    if (k < n || (k === n && limiting && snack.onHand < limiting.onHand)) {
      n = k;
      limiting = snack;
    }
  }
  return { n: Number.isFinite(n) ? n : 0, limiting };
}
