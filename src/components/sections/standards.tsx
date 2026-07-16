const checks = [
  "Ingredient list clarity",
  "Allergen declarations",
  "Caffeine content",
  "Added sugars",
  "Sodium",
  "Package integrity + expiration dates",
  "Condition-relevant ingredient flags",
  "Category balance across comfort, protein, hydration, sweet + savory",
  "Taste. Honestly.",
];

export function Standards() {
  return (
    <section id="standards" className="border-b border-border bg-cream-deep/60">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <p className="eyebrow" data-reveal>
          How we choose
        </p>
        <h2 className="font-display text-headline mt-4 max-w-[24ch] text-ink" data-reveal>
          Every item is reviewed for <em className="text-terracotta-deep">nine things</em>{" "}
          before it earns a card.
        </h2>
        <ul className="mt-10 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3" data-reveal-group>
          {checks.map((check) => (
            <li key={check} data-reveal-item className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-1.5 size-2 shrink-0 rounded-full bg-sage-deep"
              />
              <span className="text-[0.95rem] leading-relaxed text-ink">{check}</span>
            </li>
          ))}
        </ul>
        <div className="mt-10 max-w-3xl space-y-3" data-reveal>
          <p className="text-sm leading-relaxed text-ink-soft">
            Contents rotate based on availability, your preferences, and these category
            standards — every box is deliberately composed, never random. Specific brands
            may change batch to batch; the standard doesn&rsquo;t. And we count honestly:
            at least eight of the fourteen are substantial single servings, multi-piece
            packs count as one snack, and small extras aren&rsquo;t counted at all.
          </p>
          <p className="text-sm leading-relaxed text-ink-soft">
            PharmaGuide, our sister platform, supports the label review — ingredient
            lists, allergens, caffeine, added sugars, sodium. It doesn&rsquo;t replace
            individualized medical advice: your healthcare provider always comes first.
          </p>
        </div>

        <p className="eyebrow mt-14" data-reveal>
          Boxes that breathe
        </p>
        <div className="mt-6 grid gap-8 sm:grid-cols-3" data-reveal-group>
          <div data-reveal-item>
            <h3 className="font-display text-lg text-ink">Seasonal edits</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Winter, spring, summer, fall — every release refreshes the picks.
              You&rsquo;re looking at the Summer &rsquo;26 edit.
            </p>
          </div>
          <div data-reveal-item>
            <h3 className="font-display text-lg text-ink">Fed by feedback</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              The loved-it / send-again page in every guide shapes the next batch.
              Favorites come back on purpose — reruns never happen by accident.
            </p>
          </div>
          <div data-reveal-item>
            <h3 className="font-display text-lg text-ink">New finds earn in</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              When we discover something delicious with clean ingredients for your
              situation, it competes for a spot. The standard doesn&rsquo;t move; the
              snacks do.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
