import Link from "next/link";
import { ArrowRightIcon, Gift, ScanText, Stethoscope, type LucideIcon } from "lucide-react";
import { ReviewerCard } from "@/components/reviewer-card";
import { landingFor } from "@/lib/landing";
import { boxes } from "@/lib/box";
import { site } from "@/lib/site";

const steps: { title: string; body: string; Icon: LucideIcon }[] = [
  {
    title: "We read the labels",
    body: "Ingredients, allergens and the nutrition that matters for your box. A snack has to pass that box's limits, which are printed on every box.",
    Icon: ScanText,
  },
  {
    title: "A pharmacist reviews the selection",
    body: "Laurie Pham, PharmD, reviews each box's criteria and every season's snacks.",
    Icon: Stethoscope,
  },
  {
    title: "We pack your box",
    body: "By hand, around any allergies or cravings you tell us, with a Packed for You card inside.",
    Icon: Gift,
  },
];

export function Screening() {
  return (
    <section id="how" className="scroll-mt-20 border-b border-border bg-cream-deep/50">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:py-16">
        <h2 className="text-center font-display text-3xl text-ink" data-reveal>
          How we pick every snack
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-ink-soft" data-reveal>
          Your condition already gives you enough to think about. So every Keniya box has its own
          screening, and a snack has to qualify for it before it can go in.
        </p>

        <ol
          className="relative mx-auto mt-10 grid max-w-4xl gap-7 lg:mt-12 lg:grid-cols-3 lg:gap-8"
          data-reveal-group
        >
          {/* The track the steps sit on: down the left on mobile, across on desktop. */}
          <span
            aria-hidden
            className="absolute bottom-6 left-6 top-6 w-px bg-sage/40 lg:bottom-auto lg:left-[16%] lg:right-[16%] lg:top-6 lg:h-px lg:w-auto"
          />
          {steps.map(({ title, body, Icon }, i) => {
            const last = i === steps.length - 1;
            return (
              <li
                key={title}
                data-reveal-item
                className="relative flex gap-4 lg:flex-col lg:items-center lg:gap-0 lg:text-center"
              >
                <span
                  className={`relative grid size-12 shrink-0 place-items-center rounded-full border shadow-[0_4px_12px_-4px_rgb(51_48_43/0.18)] ${
                    last
                      ? "border-terracotta-deep bg-terracotta-deep text-cream"
                      : "border-border bg-cream-card text-sage-deep"
                  }`}
                >
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="lg:mt-4">
                  <span className="block text-xs font-medium tabular-nums text-ink-soft">
                    Step {i + 1}
                  </span>
                  <span className="mt-0.5 block font-display text-xl leading-tight text-ink">
                    {title}
                  </span>
                  <span className="mt-1.5 block max-w-[28ch] text-sm leading-snug text-ink-soft lg:mx-auto">
                    {body}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="mt-12 text-center" data-reveal>
          <p className="text-sm font-medium text-ink">See exactly how we choose for each box</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {boxes.map((b) => (
              <Link
                key={b.slug}
                href={landingFor(b.slug).path}
                className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-sage-deep bg-cream-card px-5 text-sm font-semibold text-sage-deep transition-colors hover:bg-sage-deep hover:text-cream"
              >
                {b.shortName}
                <ArrowRightIcon className="size-4" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Clinical reviewer + origin story, after the gift section. */
export function TrustStory() {
  return (
    <section className="border-b border-border bg-cream-deep/50">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:py-16">
        <h2 className="sr-only">Clinical review and our story</h2>
        <ReviewerCard className="mx-auto" />

        <p
          className="mx-auto mt-8 max-w-[60ch] text-center text-base leading-relaxed text-ink-soft"
          data-reveal
        >
          It started with years of reading labels for our own family. Now we do that work for
          everyone: whatever you&rsquo;re living with, you get a box that already did the reading,
          so you can just enjoy the snack. Six boxes today, each with its own standards, with
          more as you ask for them. Every snack is screened with the same care as{" "}
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
        <p className="mx-auto mt-4 max-w-[70ch] text-center text-xs text-ink-soft" data-reveal>
          Keniya picks packaged snacks. It isn&rsquo;t medical advice. Follow your
          doctor&rsquo;s guidance and check each label for allergens.
        </p>
      </div>
    </section>
  );
}
