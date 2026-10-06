"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveLineup } from "@/actions/admin/boxes";
import { BoxProductTable } from "@/components/admin/box-product-table";
import { CostCard } from "@/components/admin/cost-card";
import { Badge, fieldClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { fmt$, landedCost } from "@/lib/admin/costing";
import { canBuild, daysUntil, optimize } from "@/lib/admin/optimizer";
import { estimatePostage, type PostageSample } from "@/lib/admin/postage";
import { checkLineup, eligibleFor, isReady, isReadyToPack, lineupStage, packedWeightOz, type Pick } from "@/lib/admin/rules";
import { BOX_LABEL, OBJECTIVES, OBJECTIVE_LABEL, type BoxRules, type BoxSlug, type Objective, type Settings, type Snack } from "@/lib/admin/types";
import { avoidConflict } from "@/lib/admin/avoid";
import { cn } from "@/lib/utils";

// Same words the order avoid-matcher understands (src/lib/admin/avoid.ts).
const ALLERGENS = ["Peanuts", "Tree nuts", "Dairy", "Gluten", "Soy"];

type Props = {
  slug: BoxSlug;
  rules: BoxRules;
  settings: Settings;
  snacks: Snack[];
  extras: Snack[];
  initial: { product_id: string; category: string | null }[];
  packagingOz: number;
  mailer: { id: string; name: string; cents: number } | null;
  history: PostageSample[];
  allRules: Record<BoxSlug, BoxRules>;
  /** Signed front-photo URLs by product id. */
  photos: Record<string, string>;
  /** Pre-screen finding by product id. */
  findings: Record<string, string>;
};

export function BoxBuilder({ slug, rules, settings, snacks, extras, initial, packagingOz, mailer, history, allRules, photos, findings }: Props) {
  const router = useRouter();
  const byId = useMemo(() => new Map(snacks.map((s) => [s.id, s])), [snacks]);
  const [picks, setPicks] = useState<Pick[]>(() =>
    initial.filter((i) => byId.has(i.product_id)).map((i) => ({ snack: byId.get(i.product_id)!, category: i.category })),
  );
  const [objective, setObjective] = useState<Objective>("balanced");
  const [source, setSource] = useState<Objective | "manual">("manual");
  // Nothing logged yet → building from stock would return an empty box, so start unticked.
  const [requireStock, setRequireStock] = useState(() => snacks.some((s) => s.onHand > 0));
  const [requireReady, setRequireReady] = useState(false);
  // Snack mix for this build only (the saved recipe is the "Box recipe" form below).
  // null = let Build box choose within the recipe's ranges; otherwise exact counts per kind.
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [otherAvoid, setOtherAvoid] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, startSave] = useTransition();
  const runSize = settings.runSize[slug];
  const customMix = counts !== null;
  const mix = useMemo(
    () => (counts ? rules.categories.map((c) => ({ ...c, min: counts[c.name] ?? 0, max: counts[c.name] ?? 0 })) : rules.categories),
    [rules.categories, counts],
  );
  const buildRules = useMemo(() => ({ ...rules, categories: mix }), [rules, mix]);
  const countTotal = counts ? Object.values(counts).reduce((t, n) => t + n, 0) : rules.total;
  const avoidText = [...allergens, otherAvoid].filter(Boolean).join(", ");
  const conflict = useMemo(() => {
    const m = new Map<string, string>();
    if (avoidText) for (const s of snacks) { const why = avoidConflict(s, avoidText); if (why) m.set(s.id, why); }
    return m;
  }, [snacks, avoidText]);

  const extraOz = extras.reduce((n, s) => n + (s.unit_wt_oz ?? 0), 0);
  const checks = useMemo(() => checkLineup(slug, buildRules, picks, settings, packagingOz + extraOz), [slug, buildRules, picks, settings, packagingOz, extraOz]);
  const weight = packedWeightOz(picks, packagingOz + extraOz);
  const postage = estimatePostage({ settings, slug, weightOz: weight, packageProfileId: mailer?.id, history });
  const cost = landedCost({
    slug,
    settings,
    pickCosts: picks.map((p) => p.snack.unitCostCents),
    extraCosts: extras.map((s) => s.unitCostCents),
    mailer: mailer ? { name: mailer.name, cents: mailer.cents } : null,
    postageCents: postage.cents,
    postageNote: postage.note,
  });
  const build = canBuild([...picks, ...extras.map((snack) => ({ snack, category: null }))]);
  const ready = picks.length > 0 && isReady(checks) && !picks.some((p) => conflict.has(p.snack.id)) && extras.every((s) => eligibleFor(slug, s, rules, settings.policy, s.rejectReason).fits && !conflict.has(s.id));
  const stage = lineupStage([...picks, ...extras.map((snack) => ({ snack }))], ready);
  const cats = mix.map((c) => c.name);

  function startCustom() {
    // Start from what's in the box now, so the total is already right.
    setCounts(Object.fromEntries(rules.categories.map((c) => [c.name, picks.filter((p) => p.category === c.name).length || c.min])));
  }

  function runOptimizer() {
    if (countTotal !== rules.total) {
      toast.error(`Your snack mix adds up to ${countTotal}; make it ${rules.total} first.`);
      return;
    }
    const r = optimize({ slug, rules: buildRules, settings, snacks: requireReady ? snacks.filter(isReadyToPack) : snacks, objective, packagingOz: packagingOz + extraOz, runSize, requireStock, excludeIds: [...conflict.keys()] });
    setPicks(r.picks);
    setSource(objective);
    if (r.picks.length < rules.total) toast.warning(`Only ${r.picks.length} eligible picks found (${r.candidates} candidates). Add stock or products.`);
    else if (r.deficit > 0) toast.warning("Best lineup found still fails a rule; see checks.");
    else toast.success(`Lineup built from ${r.candidates} eligible products`);
  }

  // Add from the products table: put it in a category this box uses that still has room.
  function addPick(s: Snack) {
    setPicks((ps) => {
      const own = s.categories.filter((c) => cats.includes(c));
      const count = (c: string) => ps.filter((p) => p.category === c).length;
      const range = (c: string) => mix.find((m) => m.name === c);
      const category = own.find((c) => count(c) < (range(c)?.min ?? 0)) ?? own.find((c) => count(c) < (range(c)?.max ?? Infinity)) ?? own[0] ?? null;
      return [...ps, { snack: s, category }];
    });
    setSource("manual");
  }

  function save(activate: boolean) {
    startSave(async () => {
      const res = await saveLineup({
        slug,
        objective: source,
        notes:
          [notes, customMix && `Custom mix: ${mix.map((c) => `${c.min} ${c.name}`).join(", ")}`, avoidText && `Avoids: ${avoidText}`]
            .filter(Boolean)
            .join(" · ") || null,
        activate,
        items: [...picks.map((p) => ({ product_id: p.snack.id, category: p.category, is_extra: false })), ...extras.map((s) => ({ product_id: s.id, category: null, is_extra: true }))],
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success(activate ? "Lineup activated: new orders use it" : "Draft saved");
        router.refresh();
      }
    });
  }

  const failing = checks.filter((c) => !c.pass && c.level !== "info");
  // Phones: the secondary controls and the passing checks start folded away.
  const [showOptions, setShowOptions] = useState(false);
  const [showAllChecks, setShowAllChecks] = useState(false);
  const passing = checks.filter((c) => c.pass || c.level === "info");

  return (
    <div className="space-y-4 max-sm:pb-24">
      {extras.length > 0 && <p className="text-sm text-muted-foreground">Extras included in stock, weight and cost: {extras.map((s) => s.name).join(", ")}</p>}
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-56 flex-1 space-y-1 max-sm:basis-full">
                <span className="text-sm font-medium">Pick snacks for</span>
                <select value={objective} onChange={(e) => setObjective(e.target.value as Objective)} className={cn(fieldClass, "max-sm:h-11")}>
                  {OBJECTIVES.map((o) => (
                    <option key={o} value={o}>
                      {OBJECTIVE_LABEL[o]}
                      {o === "favorites" ? " (needs ratings)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <Button size="lg" className="max-sm:h-12 max-sm:flex-1" onClick={runOptimizer}>
                Build box
              </Button>
              <Button type="button" variant="outline" className="sm:hidden max-sm:h-12" aria-expanded={showOptions} onClick={() => setShowOptions((v) => !v)}>
                {showOptions ? "Hide options" : "Options"}
              </Button>
            </div>

            <div className={cn("space-y-4", !showOptions && "max-sm:hidden")}>
              <div className="flex flex-wrap gap-x-6">
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" className="size-5" checked={requireStock} onChange={(e) => setRequireStock(e.target.checked)} /> Only snacks in stock
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" className="size-5" checked={requireReady} onChange={(e) => setRequireReady(e.target.checked)} /> Only approved &amp; package-verified
                </label>
              </div>

              <div>
                <p className="mb-1 text-sm font-medium">Leave out</p>
                <div className="flex flex-wrap items-center gap-2">
                  {ALLERGENS.map((a) => {
                    const on = allergens.includes(a);
                    return (
                      <Button key={a} size="sm" className="max-sm:h-11" variant={on ? "default" : "outline"} aria-pressed={on} onClick={() => setAllergens((xs) => (on ? xs.filter((x) => x !== a) : [...xs, a]))}>
                        {a}
                      </Button>
                    );
                  })}
                  <input value={otherAvoid} onChange={(e) => setOtherAvoid(e.target.value)} placeholder="Other, e.g. sesame, coconut" className={cn(fieldClass, "h-8 w-56 max-sm:h-11 max-sm:w-full")} aria-label="Other foods to leave out" />
                </div>
                {avoidText && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {`${conflict.size} products left out. Matches recorded ingredients, allergen labels, cross-contact warnings and product names. Check the package for anything not on file.`}
                  </p>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">Snack mix</p>
                  {customMix ? (
                    <Button size="xs" className="max-sm:h-11" variant="ghost" onClick={() => setCounts(null)}>
                      Back to the box recipe
                    </Button>
                  ) : (
                    <Button size="xs" className="max-sm:h-11" variant="outline" onClick={startCustom}>
                      Choose my own mix
                    </Button>
                  )}
                </div>
                {!customMix ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {`Build box follows the box recipe: ${rules.categories.map((c) => `${c.name} ${c.min === c.max ? c.min : `${c.min}–${c.max}`}`).join(", ")}. It picks the exact numbers so they total ${rules.total}.`}
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-muted-foreground">{`How many of each kind in this build only. The saved recipe doesn't change.`}</p>
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                      {rules.categories.map((c) => {
                        const n = counts![c.name] ?? 0;
                        const set = (v: number) => setCounts((m) => ({ ...m!, [c.name]: Math.max(0, Math.min(rules.total, v)) }));
                        return (
                          <li key={c.name} className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
                            <span className="flex-1 text-sm">{c.name}</span>
                            <Button size="icon-xs" className="max-sm:size-11" variant="outline" aria-label={`Fewer ${c.name}`} disabled={n === 0} onClick={() => set(n - 1)}>
                              −
                            </Button>
                            <span className="w-6 text-center text-base font-semibold tabular-nums" aria-live="polite">
                              {n}
                            </span>
                            <Button size="icon-xs" className="max-sm:size-11" variant="outline" aria-label={`More ${c.name}`} onClick={() => set(n + 1)}>
                              +
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                    <p className={cn("mt-2 text-sm font-medium", countTotal === rules.total ? "text-emerald-700" : "text-amber-700")}>
                      {countTotal === rules.total
                        ? `${countTotal} of ${rules.total} ✓ Ready to build`
                        : countTotal < rules.total
                          ? `${countTotal} of ${rules.total}: add ${rules.total - countTotal} more`
                          : `${countTotal} of ${rules.total}: remove ${countTotal - rules.total}`}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card">
            <div className="flex flex-wrap items-center gap-2 border-b p-4">
              <p className="font-semibold">
                {BOX_LABEL[slug]} lineup · {picks.length}/{rules.total}
              </p>
              <Badge tone={stage.tone} title={stage.detail}>
                {ready ? stage.label : `FIX · ${failing.filter((c) => c.level === "block").length} failing`}
              </Badge>
              {ready && stage.tone === "warn" && <span className="text-xs text-muted-foreground">{stage.detail}</span>}
              <span className="ml-auto text-xs text-muted-foreground">{source === "manual" ? "Edited by hand" : `Suggested: ${OBJECTIVE_LABEL[source]}`}</span>
            </div>
            <ul className="divide-y">
              {picks.map((p, i) => {
                const fit = eligibleFor(slug, p.snack, buildRules, settings.policy, p.snack.rejectReason);
                const d = daysUntil(p.snack.earliestExpiry);
                return (
                  <li key={`${p.snack.id}-${i}`} className="grid grid-cols-[1fr_auto] items-start gap-x-2 gap-y-1 p-3 sm:grid-cols-[110px_1fr_auto] sm:items-center sm:gap-2">
                    <select
                      value={p.category ?? ""}
                      onChange={(e) => setPicks((ps) => ps.map((x, j) => (j === i ? { ...x, category: e.target.value || null } : x)))}
                      className={cn(fieldClass, "h-8 text-xs max-sm:order-3 max-sm:h-11 max-sm:w-44")}
                      aria-label={`Category for ${p.snack.name}`}
                    >
                      <option value="">—</option>
                      {cats.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <div className="min-w-0 max-sm:order-1">
                      <p className="text-sm font-medium sm:truncate sm:font-normal">{p.snack.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                        <span>{p.snack.type}</span>
                        <span>· {p.snack.unit_wt_oz ?? "?"} oz</span>
                        <span className="sm:hidden">· {fmt$(p.snack.unitCostCents)}</span>
                        {conflict.has(p.snack.id) && <Badge tone="bad">{conflict.get(p.snack.id)}</Badge>}
                        {!fit.fits && <Badge tone="bad" title={fit.reasons.join("; ")}>{`not eligible: ${fit.reasons[0] ?? ""}`}</Badge>}
                        {p.snack.status !== "Approved" && <Badge tone="info">{p.snack.status}</Badge>}
                        {p.snack.onHand < runSize && <Badge tone={p.snack.onHand === 0 ? "bad" : "warn"}>{p.snack.onHand} on hand</Badge>}
                        {d !== null && d < settings.expiryTiersDays[2] && <Badge tone="orange">expires in {d} d</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 max-sm:order-2 sm:justify-end">
                      <span className="text-sm tabular-nums max-sm:hidden">{fmt$(p.snack.unitCostCents)}</span>
                      <Button size="icon-xs" className="max-sm:size-11" variant="ghost" aria-label={`Remove ${p.snack.name}`} onClick={() => { setPicks((ps) => ps.filter((_, j) => j !== i)); setSource("manual"); }}>
                        ✕
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {picks.length < rules.total && (
              <p className="border-t p-3 text-sm text-muted-foreground">{`${rules.total - picks.length} to go: add them from the products table below.`}</p>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4">
            <p className="mb-2 font-semibold">Does this box follow the recipe?</p>
            {failing.length === 0 && <p className="mb-2 text-sm text-emerald-700">Every rule passes.</p>}
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {[...failing, ...passing].map((c) => (
                <li key={c.key} className={cn("flex items-start gap-2", !showAllChecks && c.pass && "max-sm:hidden")}>
                  <span className={cn("w-4 shrink-0", c.level === "info" ? "text-muted-foreground" : c.pass ? "text-emerald-700" : c.level === "warn" ? "text-amber-700" : "text-red-700")}>
                    {c.level === "info" ? "ℹ" : c.pass ? "✓" : c.level === "warn" ? "!" : "✕"}
                  </span>
                  <span>
                    {c.label}: <span className="text-muted-foreground">{c.value}</span>
                  </span>
                </li>
              ))}
            </ul>
            {passing.length > 0 && (
              <Button type="button" variant="ghost" className="mt-1 h-11 w-full sm:hidden" onClick={() => setShowAllChecks((v) => !v)}>
                {showAllChecks ? "Hide passing checks" : `Show ${passing.length} passing checks`}
              </Button>
            )}
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
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes for this version (optional)" aria-label="Notes for this version" className={cn(fieldClass, "h-auto")} />
            <Button className="w-full max-sm:hidden" disabled={saving || !ready} onClick={() => save(true)}>
              {saving ? "Saving…" : "Save & activate"}
            </Button>
            <Button className="w-full max-sm:hidden" variant="outline" disabled={saving || !picks.length} onClick={() => save(false)}>
              Save as draft
            </Button>
            {!ready && picks.length > 0 && <p className="text-xs text-amber-700">Fix the failing checks before activating. You can save your work as a draft.</p>}
          </div>
        </aside>
      </div>
      {/* Phones: progress and Save stay in reach however far down the page you are. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t bg-card/95 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tabular-nums">
            {picks.length}/{rules.total} picked
          </p>
          <p className={cn("truncate text-xs", !ready ? "text-red-700" : stage.tone === "good" ? "text-emerald-700" : "text-amber-700")}>{ready ? stage.label : `FIX · ${failing.filter((c) => c.level === "block").length} failing`}</p>
        </div>
        <Button variant="outline" className="h-11" disabled={saving || !picks.length} onClick={() => save(false)}>
          Save draft
        </Button>
        <Button className="h-11" disabled={saving || !ready} onClick={() => save(true)}>
          {saving ? "Saving…" : "Activate"}
        </Button>
      </div>
      <BoxProductTable
        slug={slug}
        snacks={snacks}
        inBox={new Set(picks.map((p) => p.snack.id))}
        full={picks.length >= rules.total}
        rules={{ ...allRules, [slug]: buildRules }}
        settings={settings}
        conflict={conflict}
        categories={cats}
        photos={photos}
        findings={findings}
        onAdd={addPick}
        onRemove={(id) => {
          setPicks((ps) => ps.filter((p) => p.snack.id !== id));
          setSource("manual");
        }}
      />
    </div>
  );
}
