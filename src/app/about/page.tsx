export const metadata = {
  title: "Our story",
  description:
    "Keniya started in the middle of a first trimester — one couple, a snack aisle, and too many labels. Here's why we pack every box with the why.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
      <h1 className="font-display text-display text-ink" data-reveal>
        Built in the middle of a <em className="text-terracotta-deep">first trimester</em>.
      </h1>

      <div className="mt-10 max-w-[62ch] space-y-6 text-lg leading-relaxed text-ink-soft">
        <p data-reveal>
          Keniya started in a grocery aisle at 9pm. My wife was newly pregnant, craving
          something — anything — that would actually sit right, and every option meant
          reading another label, searching another ingredient, second-guessing another
          choice. The snack run had turned into a research project, and she was the one
          doing the research while feeling her worst.
        </p>
        <p data-reveal>
          So we built the thing we wished someone had handed us: a box of fourteen
          genuinely good snacks, chosen around the cravings, nausea and label questions we
          were dealing with that week — with a
          folded &ldquo;Packed for You&rdquo; guide explaining exactly why each one earned
          its place. She calls it the first gift that did the reading for her.
        </p>
        <p data-reveal>
          The name comes from <em>kɛnɛya</em> — &ldquo;health&rdquo; in Dioula, the
          language of my family&rsquo;s roots in West Africa; Keniya is simply how we
          write it so everyone can say it. Health there is something you wish on people
          you love. That&rsquo;s the spirit every box ships with.
        </p>
        <p data-reveal>
          I also live with type 1 diabetes, which means I&rsquo;ve read nutrition labels
          my whole life. That obsession became PharmaGuide, the ingredient-intelligence
          platform I build by day — and it&rsquo;s the same engine of care behind how
          Keniya curates: every item screened for its ingredient story, not just its
          marketing.
        </p>
        <p data-reveal>
          We&rsquo;re starting small on purpose — fifty of each box, packed by hand,
          with any allergies or foods you tell us to avoid steered around where we can. All three founding edits open together:
          Pregnancy Comfort, Balanced Blood Sugar, and Heart Wellness. This is a family
          company; it will grow at the speed of trust.
        </p>
        <p data-reveal>
          By day I build{" "}
          <a
            href="https://pharmaguide.io"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sage-deep underline-offset-2 hover:underline"
          >
            PharmaGuide
          </a>
          — supplement and ingredient intelligence. Keniya is that care made edible and
          giftable.
        </p>
      </div>

      <div className="mt-12 border-t border-border pt-8" data-reveal>
        <p className="font-display text-xl text-ink">
          — Sean &amp; the first customer
          <span className="text-terracotta">.</span>
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Co-founders, Keniya ·{" "}
          <a
            href="https://pharmaguide.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sage-deep underline-offset-2 hover:underline"
          >
            PharmaGuide
          </a>{" "}
          ingredient intelligence
        </p>
      </div>
    </div>
  );
}
