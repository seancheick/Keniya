export const metadata = {
  title: "Our story",
  description:
    "Keniya started in the middle of a first trimester — one couple, a snack aisle, and too many labels. Here's why we pack every box with the why.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
      <p className="eyebrow" data-reveal>
        Our story
      </p>
      <h1 className="font-display text-display mt-5 text-ink" data-reveal>
        Built in the middle of a <em className="text-terracotta-deep">first trimester</em>.
      </h1>

      <div className="mt-10 space-y-6 text-lg leading-relaxed text-ink-soft">
        <p data-reveal>
          Keniya started in a grocery aisle at 9pm. My wife was newly pregnant, craving
          something — anything — that would actually sit right, and every option meant
          reading another label, searching another ingredient, second-guessing another
          choice. The snack run had turned into a research project, and she was the one
          doing the research while feeling her worst.
        </p>
        <p data-reveal>
          So we built the thing we wished someone had handed us: a box of fourteen
          genuinely good snacks, chosen around how she actually felt that week — with a
          folded &ldquo;Packed for You&rdquo; guide explaining exactly why each one earned
          its place. She calls it the first gift that did the reading for her.
        </p>
        <p data-reveal>
          The name comes from <em>kɛnɛya</em> — &ldquo;health&rdquo; in Dioula, the
          language of my family&rsquo;s roots in West Africa. Health there is something you
          wish on people you love. That&rsquo;s the spirit every box ships with.
        </p>
        <p data-reveal>
          I also live with type 1 diabetes, which means I&rsquo;ve read nutrition labels
          my whole life. That obsession became PharmaGuide, the ingredient-intelligence
          platform I build by day — and it&rsquo;s the same engine of care behind how
          Keniya curates: every item screened for its ingredient story, not just its
          marketing.
        </p>
        <p data-reveal>
          We&rsquo;re starting small on purpose — fifty boxes, packed by hand at our
          kitchen table, allergy swaps done one box at a time. The Pregnancy Comfort Box
          ships first. Balanced Blood Sugar and Heart Wellness are next, and the waitlists
          decide the order. This is a family company; it will grow at the speed of trust.
        </p>
      </div>

      <div className="mt-12 border-t border-border pt-8" data-reveal>
        <p className="font-display text-xl text-ink">
          — Sean &amp; the first customer
          <span className="text-terracotta">.</span>
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Co-founders, Keniya · Curated with PharmaGuide ingredient intelligence
        </p>
      </div>
    </div>
  );
}
