import { boxes, type Box } from "@/lib/box";
import { WaitlistForm } from "@/components/waitlist-form";
import { MatchQuiz } from "@/components/quiz/match-quiz";
import { site } from "@/lib/site";

const tintClasses: Record<Box["tint"], string> = {
  blush: "bg-blush",
  sage: "bg-sage/25",
  cream: "bg-cream-deep",
};

const chipSpots = ["left-6 top-6", "right-8 top-1/3", "left-10 bottom-8"];

function BoxPhotoPlaceholder({ box }: { box: Box }) {
  return (
    <div
      className={`relative aspect-[4/3] w-full overflow-hidden rounded-3xl ${tintClasses[box.tint]}`}
      role="img"
      aria-label={`${box.name} — product photography placeholder`}
    >
      {chipSpots.map((spot, i) => (
        <span
          key={spot}
          className={`absolute ${spot} rounded-full border border-border bg-cream-card px-3.5 py-1.5 text-xs font-medium text-ink`}
        >
          {box.sample[i]}
        </span>
      ))}
      <div className="absolute inset-0 grid place-items-center">
        <div className="rounded-2xl border border-dashed border-ink-soft/30 bg-cream/70 px-6 py-4 text-center backdrop-blur-sm">
          <p className="font-display text-lg text-ink">
            Kaniya<span className="text-terracotta">.</span>
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Box photography — first prototype run
          </p>
        </div>
      </div>
    </div>
  );
}

export function OurBoxes() {
  return (
    <section id="boxes" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <p className="eyebrow" data-reveal>
          Our boxes
        </p>
        <h2 className="font-display text-headline mt-4 max-w-[24ch] text-ink" data-reveal>
          Three boxes. <em className="text-terracotta-deep">One standard.</em>
        </h2>
        <p className="mt-5 max-w-[54ch] text-ink-soft" data-reveal>
          Every box: twelve items across five categories, a &ldquo;why it&rsquo;s in your
          box&rdquo; card for each, and a first release capped at {site.firstRunPerBox}.
          Same care, different life moments.
        </p>

        <div className="mt-14 space-y-16 lg:space-y-24">
          {boxes.map((box, i) => (
            <article
              key={box.slug}
              data-reveal
              className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${
                i % 2 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <BoxPhotoPlaceholder box={box} />
              <div>
                <h3 className="font-display text-3xl text-ink">{box.name}</h3>
                <p className="mt-2 text-sm font-medium text-sage-deep">{box.forWho}</p>
                <p className="mt-4 max-w-[52ch] leading-relaxed text-ink-soft">{box.why}</p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {box.principles.map((p) => (
                    <li
                      key={p}
                      className="rounded-full border border-border px-3 py-1 text-xs font-medium text-ink-soft"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-sm text-ink-soft">
                  Inside: {box.sample.join(", ").toLowerCase()} + 7 more.
                </p>
                <p className="mt-5 font-display text-lg text-ink">
                  ${site.preorderPriceUSD} · 12 items ·{" "}
                  <span className="text-terracotta-deep">
                    First release: {site.firstRunPerBox} boxes
                  </span>
                </p>
                <div className="mt-4">
                  <WaitlistForm
                    boxInterest={box.slug}
                    source="our_boxes"
                    cta="Reserve yours"
                    compact
                  />
                  <p className="mt-2 text-xs text-ink-soft/80">
                    Checkout opens this week — your email holds a spot in the first{" "}
                    {site.firstRunPerBox}. Refundable any time before shipping.
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-14 border-t border-border pt-6 text-sm text-ink-soft" data-reveal>
          In development: GLP-1 Companion · Menopause Comfort · Postpartum Recovery.{" "}
          <MatchQuiz>
            <button
              type="button"
              className="font-medium text-sage-deep transition-colors hover:text-ink"
            >
              The quiz records which one you need →
            </button>
          </MatchQuiz>
        </p>
      </div>
    </section>
  );
}
