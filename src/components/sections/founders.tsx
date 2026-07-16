const quotes = [
  {
    text: "Her first trimester turned every snack run into a research project. I built the box I wish someone had handed us in week six.",
    name: "Sean — co-founder",
  },
  {
    text: "I wanted snacks that feel like a gift, not a prescription. That's the bar for every box we pack.",
    name: "Keniya's first customer — and co-founder",
  },
];

export function Founders() {
  return (
    <section className="border-y border-border bg-cream-deep/60">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <p className="eyebrow" data-reveal>
          Why we started
        </p>
        <div className="mt-10 grid gap-12 md:grid-cols-2" data-reveal-group>
          {quotes.map((q) => (
            <figure key={q.name} data-reveal-item>
              <blockquote className="font-display text-2xl leading-snug text-ink lg:text-[1.7rem]">
                &ldquo;{q.text}&rdquo;
              </blockquote>
              <figcaption className="mt-5 text-sm text-ink-soft">{q.name}</figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-10 text-xs text-ink-soft/70" data-reveal>
          Taste-tester quotes join this section after our first prototype run — real ones
          only, promise.
        </p>
      </div>
    </section>
  );
}
