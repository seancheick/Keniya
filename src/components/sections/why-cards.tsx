export function WhyCards() {
  return (
    <section className="border-y border-border bg-cream-deep/60">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-16 lg:grid-cols-2 lg:py-28">
        <div className="relative mx-auto h-[360px] w-full max-w-sm">
          <div
            data-reveal
            data-reveal-delay="0.2"
            className="absolute left-2 top-10 h-64 w-full rotate-[5deg] rounded-2xl border border-border bg-cream-card"
          />
          <div
            data-reveal
            data-reveal-delay="0.1"
            className="absolute -left-2 top-6 h-64 w-full rotate-[-4deg] rounded-2xl border border-border bg-blush"
          />
          <div
            data-reveal
            className="absolute left-0 top-0 w-full rotate-[-1deg] rounded-2xl border border-border bg-cream-card p-7"
          >
            <p className="eyebrow">Why it&rsquo;s in your box</p>
            <p className="font-display mt-4 text-2xl text-ink">Freeze-dried strawberries</p>
            <p className="mt-3 leading-relaxed text-ink-soft">
              Bright, light, and airy — fruit that doesn&rsquo;t ask anything of you.
              Chosen for the weeks when fresh produce keeps losing the fridge battle.
            </p>
            <p className="mt-6 text-xs tracking-[0.18em] text-blush-ink">
              FROM YOUR GUIDE · 10 OF 14
            </p>
          </div>
        </div>
        <div>
          <p className="eyebrow" data-reveal>
            Packed for You — your box, explained
          </p>
          <h2 className="font-display text-headline mt-4 max-w-[20ch] text-ink" data-reveal>
            Every item earns its place — and <em className="text-terracotta-deep">shows its
            work</em>.
          </h2>
          <p className="mt-6 max-w-[48ch] leading-relaxed text-ink-soft" data-reveal>
            Anyone can fill a box with snacks. Kaniya ships the reasoning: one folded
            &ldquo;Packed for You&rdquo; guide with your name, your preferences, and a
            one-line why for all fourteen snacks — plus a QR code to full labels,
            ingredients, and a tell-us-what-you-loved page. The research you didn&rsquo;t
            have the energy to do, done and documented.
          </p>
          <p className="mt-6 text-sm text-sage-deep" data-reveal>
            Curated with PharmaGuide ingredient intelligence.
          </p>
          <p className="mt-2 max-w-[52ch] text-xs leading-relaxed text-ink-soft/70" data-reveal>
            PharmaGuide supports our label review — ingredients, allergens, caffeine,
            added sugars, sodium. It doesn&rsquo;t replace individualized medical advice.
          </p>
        </div>
      </div>
    </section>
  );
}
