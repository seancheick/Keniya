"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveLineup } from "@/actions/admin/boxes";
import { CostCard } from "@/components/admin/cost-card";
import { Badge, fieldClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { fmt$, landedCost } from "@/lib/admin/costing";
import { canBuild, daysUntil, optimize } from "@/lib/admin/optimizer";
import { estimatePostage, type PostageSample } from "@/lib/admin/postage";
import { checkLineup, fitFor, isReady, packedWeightOz, shipsUnderPolicy, type Pick } from "@/lib/admin/rules";
import { BOX_LABEL, OBJECTIVES, OBJECTIVE_LABEL, type BoxRules, type BoxSlug, type Objective, type Settings, type Snack } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type Props = {
  slug: BoxSlug;
  rules: BoxRules;
  settings: Settings;
  snacks: Snack[];
  initial: { product_id: string; category: string | null }[];
  packagingOz: number;
  mailer: { id: string; name: string; cents: number } | null;
  history: PostageSample[];
};

export function BoxBuilder({ slug, rules, settings, snacks, initial, packagingOz, mailer, history }: Props) {
  const router = useRouter();
  const byId = useMemo(() => new Map(snacks.map((s) => [s.id, s])), [snacks]);
  const [picks, setPicks] = useState<Pick[]>(() =>
    initial.filter((i) => byId.has(i.product_id)).map((i) => ({ snack: byId.get(i.product_id)!, category: i.category })),
  );
  const [objective, setObjective] = useState<Objective>("balanced");
  const [source, setSource] = useState<Objective | "manual">("manual");
  const [requireStock, setRequireStock] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, startSave] = useTransition();
  const runSize = settings.runSize[slug];

  const checks = useMemo(() => checkLineup(slug, rules, picks, settings, packagingOz), [slug, rules, picks, settings, packagingOz]);
  const weight = packedWeightOz(picks, packagingOz);
  const postage = estimatePostage({ settings, slug, weightOz: weight, packageProfileId: mailer?.id, history });
  const cost = landedCost({
    slug,
    settings,
    pickCosts: picks.map((p) => p.snack.unitCostCents),
    mailer: mailer ? { name: mailer.name, cents: mailer.cents } : null,
    postageCents: postage.cents,
    postageNote: postage.note,
  });
  const build = canBuild(picks);
  const ready = picks.length > 0 && isReady(checks);
  const cats = rules.categories.map((c) => c.name);

  function runOptimizer() {
    const r = optimize({ slug, rules, settings, snacks, objective, packagingOz, runSize, requireStock });
    setPicks(r.picks);
    setSource(objective);
    if (r.picks.length < rules.total) toast.warning(`Only ${r.picks.length} eligible picks found (${r.candidates} candidates). Add stock or products.`);
    else if (r.deficit > 0) toast.warning("Best lineup found still fails a rule; see checks.");
    else toast.success(`Lineup built from ${r.candidates} eligible products`);
  }

  function replace(i: number, id: string) {
    const s = byId.get(id);
    if (!s) return;
    setPicks((ps) => ps.map((p, j) => (j === i ? { snack: s, category: p.category && s.categories.includes(p.category) ? p.category : (s.categories.find((c) => cats.includes(c)) ?? p.category) } : p)));
    setSource("manual");
  }

  function save(activate: boolean) {
    startSave(async () => {
      const res = await saveLineup({
        slug,
        objective: source,
        notes: notes || null,
        activate,
        items: picks.map((p) => ({ product_id: p.snack.id, category: p.category, is_extra: false })),
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success(activate ? "Lineup activated: new orders use it" : "Draft saved");
        router.refresh();
      }
    });
  }

  // Options for a slot: eligible first (cheapest first), then the rest greyed with a reason.
  const options = useMemo(() => {
    return [...snacks]
      .filter((s) => s.status !== "Retired")
      .map((s) => {
        const fit = fitFor(slug, s);
        const ships = shipsUnderPolicy(s, settings.policy);
        const why = !fit.fits ? fit.reasons[0] : !ships.ok ? ships.reason : s.status === "Rejected" ? "Rejected" : null;
        return { s, why };
      })
      .sort((a, b) => Number(Boolean(a.why)) - Number(Boolean(b.why)) || (a.s.unitCostCents ?? 1e9) - (b.s.unitCostCents ?? 1e9));
  }, [snacks, slug, settings.policy]);

  const failing = checks.filter((c) => !c.pass && c.level !== "info");

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-4">
          <label className="min-w-56 flex-1 space-y-1">
            <span className="text-sm font-medium">Optimize for</span>
            <select value={objective} onChange={(e) => setObjective(e.target.value as Objective)} className={fieldClass}>
              {OBJECTIVES.map((o) => (
                <option key={o} value={o}>
                  {OBJECTIVE_LABEL[o]}
                  {o === "favorites" ? " (needs ratings)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={requireStock} onChange={(e) => setRequireStock(e.target.checked)} /> Only in-stock
          </label>
          <Button onClick={runOptimizer}>Suggest lineup</Button>
        </div>

        <div className="rounded-xl border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b p-4">
            <p className="font-semibold">
              {BOX_LABEL[slug]} lineup · {picks.length}/{rules.total}
            </p>
            <Badge tone={ready ? "good" : "bad"}>{ready ? "READY" : `FIX · ${failing.filter((c) => c.level === "block").length} failing`}</Badge>
            <span className="ml-auto text-xs text-muted-foreground">{source === "manual" ? "Edited by hand" : `Suggested: ${OBJECTIVE_LABEL[source]}`}</span>
          </div>
          <ul className="divide-y">
            {picks.map((p, i) => {
              const fit = fitFor(slug, p.snack);
              const d = daysUntil(p.snack.earliestExpiry);
              return (
                <li key={`${p.snack.id}-${i}`} className="grid gap-2 p-3 sm:grid-cols-[110px_1fr_auto] sm:items-center">
                  <select
                    value={p.category ?? ""}
                    onChange={(e) => setPicks((ps) => ps.map((x, j) => (j === i ? { ...x, category: e.target.value || null } : x)))}
                    className={cn(fieldClass, "h-8 text-xs")}
                    aria-label="Category"
                  >
                    <option value="">—</option>
                    {cats.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <div className="min-w-0">
                    <select value={p.snack.id} onChange={(e) => replace(i, e.target.value)} className={cn(fieldClass, "h-8 truncate")} aria-label={`Pick ${i + 1}`}>
                      {options.map(({ s, why }) => (
                        <option key={s.id} value={s.id} disabled={Boolean(why) && s.id !== p.snack.id}>
                          {why ? "✕ " : ""}
                          {s.name} · {fmt$(s.unitCostCents)} · {s.onHand} on hand{why ? ` (${why})` : ""}
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                      <span>{p.snack.type}</span>
                      <span>· {p.snack.unit_wt_oz ?? "?"} oz</span>
                      {!fit.fits && <Badge tone="bad" title={fit.reasons.join("; ")}>doesn&apos;t fit</Badge>}
                      {p.snack.status !== "Approved" && <Badge tone="info">{p.snack.status}</Badge>}
                      {p.snack.onHand < runSize && <Badge tone={p.snack.onHand === 0 ? "bad" : "warn"}>{p.snack.onHand} on hand</Badge>}
                      {d !== null && d < settings.expiryTiersDays[2] && <Badge tone="orange">expires in {d} d</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <span className="text-sm tabular-nums">{fmt$(p.snack.unitCostCents)}</span>
                    <Button size="icon-xs" variant="ghost" aria-label="Remove" onClick={() => { setPicks((ps) => ps.filter((_, j) => j !== i)); setSource("manual"); }}>
                      ✕
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-2 border-t p-3">
            {picks.length < rules.total && options[0] && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const next = options.find(({ s, why }) => !why && !picks.some((p) => p.snack.id === s.id));
                  if (next) setPicks((ps) => [...ps, { snack: next.s, category: next.s.categories.find((c) => cats.includes(c)) ?? null }]);
                  setSource("manual");
                }}
              >
                + Add pick
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="mb-2 font-semibold">Checks</p>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {checks.map((c) => (
              <li key={c.key} className="flex items-start gap-2">
                <span className={cn("w-4 shrink-0", c.level === "info" ? "text-muted-foreground" : c.pass ? "text-emerald-700" : c.level === "warn" ? "text-amber-700" : "text-red-700")}>
                  {c.level === "info" ? "ℹ" : c.pass ? "✓" : c.level === "warn" ? "!" : "✕"}
                </span>
                <span>
                  {c.label}: <span className="text-muted-foreground">{c.value}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Can build now</p>
              <p className={cn("text-2xl font-semibold", build.n < runSize ? "text-amber-700" : "text-emerald-700")}>{build.n}</p>
              <p className="truncate text-xs text-muted-foreground" title={build.limiting?.name}>
                {build.limiting ? `Limit: ${build.limiting.name} (${build.limiting.onHand})` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Packed weight</p>
              <p className={cn("text-2xl font-semibold", weight > settings.policy.maxBoxOz && "text-red-700")}>{weight.toFixed(1)} oz</p>
              <p className="text-xs text-muted-foreground">target ≤ {settings.policy.maxBoxOz} oz</p>
            </div>
          </div>
          <CostCard cost={cost} />
          <p className="mt-2 text-xs text-muted-foreground">Postage: {postage.note}</p>
        </div>
        <div className="space-y-2 rounded-xl border bg-card p-4">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes for this version (optional)" className={cn(fieldClass, "h-auto")} />
          <Button className="w-full" disabled={saving || !picks.length} onClick={() => save(true)}>
            {saving ? "Saving…" : "Save & activate"}
          </Button>
          <Button className="w-full" variant="outline" disabled={saving || !picks.length} onClick={() => save(false)}>
            Save as draft
          </Button>
          {!ready && picks.length > 0 && <p className="text-xs text-amber-700">Not READY yet: you can still save, but fix the failing checks before packing.</p>}
        </div>
      </aside>
    </div>
  );
}
