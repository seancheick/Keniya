import { fmt$, fmtPct, type CostGroup, type LandedCost } from "@/lib/admin/costing";
import { cn } from "@/lib/utils";

const GROUPS: CostGroup[] = ["Product", "Packaging", "Shipping", "Fees", "Overhead"];

/** Itemized landed cost → contribution, like the workbook Price Calculator. */
export function CostCard({ cost, title, showTargets = true }: { cost: LandedCost; title?: string; showTargets?: boolean }) {
  const pct = cost.contributionPct;
  return (
    <div className="space-y-3">
      {title && <p className="text-sm font-semibold">{title}</p>}
      <dl className="space-y-3 text-sm">
        {GROUPS.map((g) => {
          const lines = cost.lines.filter((l) => l.group === g);
          if (!lines.length) return null;
          return (
            <div key={g}>
              <dt className="mb-1 text-xs tracking-wide text-muted-foreground uppercase">{g}</dt>
              {lines.map((l) => (
                <dd key={l.label} className="flex justify-between gap-3" title={l.note}>
                  <span className="truncate">{l.label}</span>
                  <span className="tabular-nums">{fmt$(l.cents)}</span>
                </dd>
              ))}
            </div>
          );
        })}
      </dl>
      <div className="space-y-1 border-t pt-3 text-sm">
        <div className="flex justify-between font-semibold">
          <span>Total landed cost</span>
          <span className="tabular-nums">{fmt$(cost.totalCents)}</span>
        </div>
        <div className="flex justify-between">
          <span>Selling price</span>
          <span className="tabular-nums">{fmt$(cost.priceCents)}</span>
        </div>
        <div className={cn("flex justify-between text-base font-semibold", cost.contributionCents < 0 ? "text-red-700" : "text-emerald-700")}>
          <span>Contribution</span>
          <span className="tabular-nums">
            {fmt$(cost.contributionCents)} · {fmtPct(pct)}
          </span>
        </div>
        {cost.uncosted > 0 && <p className="text-xs text-amber-700">{cost.uncosted} pick(s) have no cost yet and count as $0.</p>}
      </div>
      {showTargets && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Price needed for a target margin</summary>
          <ul className="mt-1 space-y-0.5">
            {cost.targets.map((t) => (
              <li key={t.pct} className="flex justify-between">
                <span>{Math.round(t.pct * 100)}% contribution</span>
                <span className="tabular-nums">{fmt$(t.priceCents)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
