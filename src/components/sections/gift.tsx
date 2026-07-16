export function Gift() {
  return (
    <section>
      <div className="mx-auto grid max-w-6xl gap-5 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div data-reveal="left" className="rounded-3xl bg-blush p-9 lg:p-12">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-blush-ink/80">
            For you
          </p>
          <h2 className="font-display mt-4 text-3xl text-blush-ink">
            Stock your own nightstand.
          </h2>
          <p className="mt-4 max-w-[42ch] leading-relaxed text-blush-ink/90">
            Take the quiz, tell us how it&rsquo;s going, and open a box that already gets
            it — rough mornings, weird cravings, and all.
          </p>
          <a
            href="#preorder"
            className="mt-7 inline-block text-sm font-medium text-blush-ink underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            Preorder yours →
          </a>
        </div>
        <div data-reveal="right" className="rounded-3xl bg-sage-deep p-9 lg:p-12">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-cream/70">
            For someone you love
          </p>
          <h2 className="font-display mt-4 text-3xl text-cream">
            The gift that says: <em>I did the reading.</em>
          </h2>
          <p className="mt-4 max-w-[42ch] leading-relaxed text-cream/85">
            Partners, sisters, best friends — whatever they&rsquo;re navigating:
            pregnancy, blood sugar, heart health, GLP-1, menopause. Tell the quiz who
            it&rsquo;s for and we pack for them. Add a note; it rides along inside their
            Packed-for-You guide.
          </p>
          <a
            href="#preorder"
            className="mt-7 inline-block text-sm font-medium text-cream underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            Send as a gift →
          </a>
        </div>
      </div>
    </section>
  );
}
