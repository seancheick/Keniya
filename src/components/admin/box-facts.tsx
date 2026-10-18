import { boxes } from "@/lib/box";
import { eligibleFor, isReadyToPack, type Check, type Pick, type ReasonCode } from "@/lib/admin/rules";
import { BOX_LABEL, type BoxRules, type BoxSlug, type Settings, type Snack } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

/**
 * The box as a Snack Facts label (the website's card): how many snacks of each kind, every
 * per-snack limit with the picks that break it, and the whole-box checks. ✓ = within, ✕ = fix.
 * Everything is computed from the live rules, so the card can't drift from what the engine checks.
 */
type Limit = { label: string; limit: string; codes: ReasonCode[] };

function limitsFor(slug: BoxSlug, r: BoxRules): Limit[] {
  const pregnancyFamily = slug === "pregnancy_comfort" || slug === "postpartum" || slug === "gestational_diabetes";
  const rows: (Limit | false)[] = [
    { label: "Label complete", limit: "nutrition + ingredients", codes: ["NUTRITION_MISSING", "INGREDIENTS_MISSING", "SAT_FAT_MISSING"] },
    r.carbsMax !== null && { label: "Total carbs", limit: `≤ ${r.carbsMax} g${r.beverageCarbsMax !== null ? ` · sips ≤ ${r.beverageCarbsMax} g` : ""}`, codes: ["CARBS_OVER"] },
    r.addedSugarMax !== null && { label: "Added sugar", limit: `≤ ${r.addedSugarMax} g${r.treatAddedSugarMax !== null ? ` · treats ≤ ${r.treatAddedSugarMax} g` : ""}`, codes: ["ADDED_SUGAR_OVER"] },
    r.sodiumMax !== null && { label: "Sodium", limit: `≤ ${r.sodiumMax} mg`, codes: ["SODIUM_OVER"] },
    r.satFatMax !== null && { label: "Saturated fat", limit: `≤ ${r.satFatMax} g${r.satFatNutMax !== null ? ` · nuts ≤ ${r.satFatNutMax} g` : ""}`, codes: ["SAT_FAT_OVER", "PHO"] },
    r.caffeineMax !== null && { label: "Caffeine", limit: `≤ ${r.caffeineMax} mg`, codes: ["CAFFEINE_OVER", "CAFFEINE_UNKNOWN", "CAFFEINE_ESTIMATE_HOLD"] },
    pregnancyFamily && { label: "Pregnancy safety", limit: "P1–P8 + ingredients", codes: ["PREGNANCY_CHECK_FAILED", "PREGNANCY_CHECK_BLANK", "SAFETY_FINDING", "CLINICIAN_DECISION"] },
    { label: "Single-serve pack", limit: "1 pack = 1 snack", codes: ["MULTI_SERVE", "SINGLE_SERVE_UNCONFIRMED", "SHIPPING_POLICY"] },
    { label: "No synthetic dyes", limit: "Red 40, Yellow 5…", codes: ["DYE"] },
    { label: "Qualifies for this box", limit: "protein, fiber, whole food…", codes: ["NO_PATHWAY"] },
  ];
  return rows.filter((x): x is Limit => Boolean(x));
}

// Covered by the limit rows, the counts or the status line, so not repeated under "Whole box".
const SHOWN_ELSEWHERE = new Set(["fit", "filled", "nutrition", "costed", "stock", "verified", "caffeine", "cat:none"]);

export type BoxState = { label: string; tone: "good" | "warn" | "bad"; detail: string };

/** One word for where the box stands: what to do next. */
export function boxState(picks: Pick[], extras: Snack[], total: number, checks: Check[]): BoxState {
  if (!picks.length) return { label: "Empty", tone: "bad", detail: `Press Build box to fill ${total} snacks` };
  if (picks.length < total) return { label: `Add ${total - picks.length}`, tone: "bad", detail: `${picks.length} of ${total} picked` };
  const fails = checks.filter((c) => c.level === "block" && !c.pass).length;
  if (fails) return { label: `Fix ${fails}`, tone: "bad", detail: `${fails} rule${fails > 1 ? "s" : ""} not met` };
  const unverified = [...picks.map((p) => p.snack), ...extras].filter((s) => !isReadyToPack(s)).length;
  if (unverified) return { label: "Rules ✓", tone: "warn", detail: `${unverified} package${unverified > 1 ? "s" : ""} to verify in hand before packing` };
  return { label: "Ready to pack", tone: "good", detail: "Every rule passes and every package is verified" };
}

const TONE = { good: "bg-emerald-700 text-white", warn: "bg-amber-400 text-ink", bad: "bg-red-700 text-white" } as const;
const short = (s: string) => (s.length > 26 ? `${s.slice(0, 25)}…` : s);

export function BoxFacts({
  slug,
  rules,
  policy,
  picks,
  extras = [],
  checks,
  lineupNote,
  className,
}: {
  slug: BoxSlug;
  rules: BoxRules;
  policy: Settings["policy"];
  picks: Pick[];
  extras?: Snack[];
  checks: Check[];
  /** e.g. "Live v3" or "Draft v8". */
  lineupNote?: string;
  className?: string;
}) {
  const box = boxes.find((b) => b.slug === slug);
  const state = boxState(picks, extras, rules.total, checks);
  const all = [...picks.map((p) => p.snack), ...extras];
  const fits = all.map((s) => ({ s, e: eligibleFor(slug, s, rules, policy, s.rejectReason) }));
  const results = { PASS: 0, HOLD: 0, FAIL: 0 };
  for (const { e } of fits) results[e.result ?? (e.fits ? "PASS" : "FAIL")] += 1;
  const boxChecks = checks.filter((c) => !c.key.startsWith("cat:") && !SHOWN_ELSEWHERE.has(c.key) && c.level !== "info");

  return (
    <div data-colorway={box?.colorway} className={cn("overflow-hidden rounded-[4px] border-2 border-ink bg-cream-card text-ink", className)}>
      <div className="paper flex items-start gap-3 border-b-2 border-ink bg-tissue px-4 pb-2 pt-3">
        <div className="min-w-0 flex-1">
          <p className="font-label text-[2rem] leading-[0.9] tracking-tight">Snack Facts</p>
          <p className="mt-1 text-sm font-semibold text-tissue-ink">
            {box?.name ?? BOX_LABEL[slug]}
            {lineupNote && <span className="font-normal"> · {lineupNote}</span>}
          </p>
        </div>
        <span title={state.detail} className={cn("mt-1 shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", TONE[state.tone])}>
          {state.label}
        </span>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-end justify-between gap-4 border-b-[10px] border-ink pb-1.5 pt-2.5">
          <span className="font-semibold">Snacks per box</span>
          <span className="font-label text-4xl leading-none tabular-nums">
            <span className={cn(picks.length !== rules.total && "text-red-700")}>{picks.length}</span>
            <span className="text-2xl text-ink-soft">/{rules.total}</span>
          </span>
        </div>

        <ul className="divide-y divide-ink/40 border-b-[5px] border-ink">
          {rules.categories.map((c) => {
            const n = picks.filter((p) => p.category === c.name).length;
            const ok = n >= c.min && n <= c.max;
            return (
              <li key={c.name} className="flex items-baseline justify-between gap-3 py-1.5">
                <span className="min-w-0 font-bold leading-tight">
                  <Mark ok={ok} /> {box?.composition[c.name]?.name ?? c.name}
                </span>
                <span className="shrink-0 tabular-nums">
                  <span className={cn("font-label text-xl", !ok && "text-red-700")}>{n}</span>
                  <span className="text-xs text-ink-soft"> of {c.min === c.max ? c.min : `${c.min}–${c.max}`}</span>
                </span>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em]">Limits · every snack</p>
        <ul className="mt-1 divide-y divide-ink/20 text-sm">
          {limitsFor(slug, rules).map((l) => {
            const over = fits.filter(({ e }) => e.codes?.some((c) => l.codes.includes(c)));
            return (
              <li key={l.label} className="py-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">
                    <Mark ok={!over.length} /> {l.label}
                  </span>
                  <span className="shrink-0 text-right text-xs tabular-nums text-ink-soft">{l.limit}</span>
                </div>
                {over.length > 0 && (
                  <p className="pl-5 text-xs text-red-700">
                    {over.length} to fix: {over.map(({ s }) => short(s.name)).join(", ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        {boxChecks.length > 0 && (
          <>
            <p className="mt-3 border-t-[5px] border-ink pt-2 text-xs font-bold uppercase tracking-[0.14em]">Whole box</p>
            <ul className="mt-1 space-y-0.5 text-sm">
              {boxChecks.filter((c) => !c.pass).map((c) => (
                <CheckRow key={c.key} c={c} />
              ))}
            </ul>
            {boxChecks.some((c) => c.pass) && (
              <details className="mt-1 text-sm">
                <summary className="cursor-pointer text-ink-soft">
                  <Mark ok /> {boxChecks.filter((c) => c.pass).length} more pass
                </summary>
                <ul className="mt-1 space-y-0.5">
                  {boxChecks.filter((c) => c.pass).map((c) => (
                    <CheckRow key={c.key} c={c} />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}

        <p className="mt-3 border-t-2 border-ink pt-2 text-sm">
          <span className="font-bold">{state.detail}.</span>{" "}
          {all.length > 0 && (
            <span className="text-ink-soft">
              {results.PASS} pass{results.HOLD ? ` · ${results.HOLD} on hold` : ""}
              {results.FAIL ? ` · ${results.FAIL} fail` : ""}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function CheckRow({ c }: { c: Check }) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span>
        <Mark ok={c.pass} warn={c.level === "warn"} /> {c.label}
      </span>
      <span className={cn("shrink-0 text-xs tabular-nums", c.pass ? "text-ink-soft" : c.level === "warn" ? "text-amber-700" : "text-red-700")}>
        {c.pass ? c.value.replace(/\s*\(need [^)]*\)/, "") : c.value}
      </span>
    </li>
  );
}

function Mark({ ok, warn }: { ok: boolean; warn?: boolean }) {
  return (
    <span aria-label={ok ? "passes" : "needs fixing"} className={cn("inline-block w-4 font-bold", ok ? "text-mint-deep" : warn ? "text-amber-700" : "text-red-700")}>
      {ok ? "✓" : warn ? "!" : "✕"}
    </span>
  );
}
