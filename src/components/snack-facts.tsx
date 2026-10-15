import { CheckIcon } from "lucide-react";
import { extrasLabel, type PublicBox } from "@/lib/box";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Keniya's signature label: what's fun inside, set like a snack label. It describes the snack
 * experience (counts from the live recipe), never a nutrition declaration; each snack's own
 * sealed label carries the official numbers. Standards print as the label's fine print.
 */
export function SnackFacts({
  box,
  standards,
  className,
  headingLevel: Heading = "h3",
}: {
  box: PublicBox;
  standards: string[];
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  const approval = "Every lineup is reviewed by a clinician before it ships";
  return (
    <div
      data-colorway={box.colorway}
      className={cn("rounded-[4px] border-2 border-ink bg-cream-card text-ink shadow-[0_18px_30px_-22px_rgb(37_37_37/0.6)]", className)}
    >
      <div className="paper border-b-2 border-ink bg-tissue px-4 pb-2.5 pt-3 sm:px-5">
        <Heading className="font-label text-[2.35rem] leading-[0.9] tracking-tight sm:text-5xl">Snack Facts</Heading>
        <p className="mt-1.5 text-sm font-semibold text-tissue-ink">{box.name}</p>
      </div>

      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="flex items-end justify-between gap-4 border-b-[10px] border-ink pb-1.5 pt-2.5">
          <span className="font-semibold">Snacks per box</span>
          <span className="font-label text-4xl leading-none tabular-nums">{site.snackCount}</span>
        </div>

        {box.extras && (
          <div className="flex items-baseline justify-between gap-4 border-b-[5px] border-ink py-2">
            <span>
              <span className="block font-bold leading-tight">Little extras</span>
              <span className="block text-[13px] leading-snug text-ink-soft">Drink sticks, tea or a sample, on top of the {site.snackCount}</span>
            </span>
            <span className="font-label shrink-0 text-xl leading-none tabular-nums">+{extrasLabel(box.extras)}</span>
          </div>
        )}
        <ul className="divide-y divide-ink/60 border-b-[5px] border-ink">
          {box.categories.map((cat) => (
            <li key={cat.name} className="flex items-baseline justify-between gap-4 py-2">
              <span className="min-w-0">
                <span className="block font-bold leading-tight">{cat.name}</span>
                <span className="block text-[13px] leading-snug text-ink-soft">
                  {cat.note.charAt(0).toUpperCase() + cat.note.slice(1)}
                </span>
              </span>
              <span className="font-label shrink-0 text-xl leading-none tabular-nums">{cat.count}</span>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em]">Every snack in this box</p>
        <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-ink-soft">
          {[...standards, approval].map((line) => (
            <li key={line} className="flex gap-2">
              <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-mint-deep" strokeWidth={3} aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 border-t-2 border-ink pt-2.5 font-display text-xl font-extrabold leading-tight tracking-tight">
          The snacks change. Our standards don&rsquo;t.
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
          Keniya standards, not medical cutoffs. Picks rotate with the season, so photos show an
          example box. Every snack ships sealed with its full label.
        </p>
      </div>
    </div>
  );
}
