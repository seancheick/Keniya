import { site } from "@/lib/site";

const points = [
  {
    title: "14 real snacks",
    body: "A pack of chews counts as one, never four. At least 8 are full single servings. Small extras are free and don't count.",
  },
  {
    title: "A written checklist, every snack",
    body: "Each box has its own rules. The pregnancy box alone has nine, from fully cooked and sealed to caffeine, sugar and sodium on every card. Screened the way our sister app PharmaGuide screens supplements.",
  },
  {
    title: "A card that explains it",
    body: "Your Packed for You card says in one line why each snack made the cut, and lists any swaps.",
  },
];

export function HowWePick() {
  return (
    <section id="how" className="scroll-mt-20 border-b border-border bg-cream-deep/50">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:py-16">
        <h2 className="font-display text-3xl text-ink" data-reveal>
          How we pick every snack
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3" data-reveal-group>
          {points.map((p) => (
            <div key={p.title} data-reveal-item>
              <p className="font-semibold text-ink">{p.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{p.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-ink-soft" data-reveal>
          Started by a family who lived it: a pregnancy full of snack runs, and a lifetime
          of label-reading with type 1 diabetes. See how we screen at{" "}
          <a
            href={site.pharmaguide.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sage-deep underline underline-offset-4 hover:text-ink"
          >
            PharmaGuide
          </a>
          .
        </p>
        <p className="mt-3 text-xs text-ink-soft/70" data-reveal>
          Keniya picks packaged snacks. It isn&rsquo;t medical advice. Follow your
          doctor&rsquo;s guidance and check each label for allergens.
        </p>
      </div>
    </section>
  );
}
