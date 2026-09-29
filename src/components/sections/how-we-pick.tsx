import Link from "next/link";
import { ReviewerCard } from "@/components/reviewer-card";
import { landings } from "@/lib/landing";
import { boxes } from "@/lib/box";
import { site } from "@/lib/site";

const steps = [
  { title: "Label", body: "We read the ingredients and allergens on every snack." },
  { title: "Nutrition", body: "Sugar, sodium, protein, fiber, caffeine and serving size." },
  { title: "Your box's rules", body: "Each box has its own written checklist to pass." },
  { title: "Clinical review", body: "A pharmacist reviews the criteria and each lineup." },
  { title: "Packed for You", body: "Your card tells you why each snack made the cut." },
];

export function HowWePick() {
  return (
    <section id="how" className="scroll-mt-20 border-b border-border bg-cream-deep/50">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:py-16">
        <h2 className="text-center font-display text-3xl text-ink" data-reveal>
          How we pick every snack
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-ink-soft" data-reveal>
          Not every &ldquo;healthy&rdquo; snack makes the box. Each one goes through five steps.
        </p>

        {/* The process, left to right (top to bottom on mobile) */}
        <ol className="mt-8 grid gap-2 sm:mt-10 sm:grid-cols-5 sm:gap-3" data-reveal-group>
          {steps.map((s, i) => (
            <li
              key={s.title}
              data-reveal-item
              className="flex items-start gap-3 rounded-2xl border border-border bg-cream-card p-3 sm:block sm:p-4 sm:text-center"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sage-deep text-sm font-semibold text-cream sm:mx-auto">
                {i + 1}
              </span>
              <span>
                <span className="block font-semibold text-ink sm:mt-2">{s.title}</span>
                <span className="mt-0.5 block text-sm leading-snug text-ink-soft sm:mt-1">
                  {s.body}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-center text-sm text-ink-soft" data-reveal>
          See the full checklist for each box:{" "}
          {landings.map((l, i) => (
            <span key={l.path}>
              {i > 0 && " · "}
              <Link
                href={l.path}
                className="font-medium text-sage-deep underline underline-offset-4 hover:text-ink"
              >
                {boxes.find((b) => b.slug === l.slug)!.shortName}
              </Link>
            </span>
          ))}
        </p>

        {/* Packed for You: show the card, not just describe it */}
        <div className="mt-14 grid items-center gap-8 lg:grid-cols-2" data-reveal>
          <div>
            <p className="eyebrow">Packed for You</p>
            <h3 className="font-display text-headline mt-3 text-ink">
              You don&rsquo;t just get snacks. You get the reason for each one.
            </h3>
            <p className="mt-4 leading-relaxed text-ink-soft">
              Every box comes with a card that lists all {site.snackCount} snacks, the category
              each one fills, why we picked it, and the label numbers that matter for your box.
              For a gift, your message goes on it too.
            </p>
          </div>
          {/* Illustrative layout of one card entry; no real product named on purpose. */}
          <figure className="mx-auto w-full max-w-sm rotate-[-1.5deg] rounded-2xl border border-border bg-cream-card p-6 shadow-md">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-sage-deep">
              Packed for you · 3 of {site.snackCount}
            </p>
            <p className="mt-3 font-display text-2xl text-ink">Your snack&rsquo;s name</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-terracotta-deep">
              Comfort
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              <strong className="text-ink">Why it&rsquo;s here:</strong> one plain line on why
              this snack fits your box.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
              {["Caffeine", "Added sugar", "Sodium"].map((k) => (
                <div key={k}>
                  <p className="text-[0.65rem] uppercase tracking-[0.12em] text-ink-soft">{k}</p>
                  <p className="mt-1 text-sm font-semibold text-ink">from label</p>
                </div>
              ))}
            </div>
            <figcaption className="mt-4 text-[0.7rem] text-ink-soft">
              Example layout of one entry on a Packed for You card
            </figcaption>
          </figure>
        </div>

        <ReviewerCard className="mx-auto mt-14" />

        <p
          className="mx-auto mt-8 max-w-2xl text-center text-base leading-relaxed text-ink-soft"
          data-reveal
        >
          It started with years of reading labels for our own family. Now we do that work for
          everyone: whatever you&rsquo;re living with, you get a box that already did the reading,
          so you can just enjoy the snack. Pregnancy, blood sugar and heart health today, with
          more conditions on the way. Every snack is screened with the same care as{" "}
          <a
            href={site.pharmaguide.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sage-deep underline underline-offset-4 hover:text-ink"
          >
            PharmaGuide
          </a>
          , our sister platform.
        </p>
        <p className="mt-4 text-center text-xs text-ink-soft" data-reveal>
          Keniya picks packaged snacks. It isn&rsquo;t medical advice. Follow your
          doctor&rsquo;s guidance and check each label for allergens.
        </p>
      </div>
    </section>
  );
}
