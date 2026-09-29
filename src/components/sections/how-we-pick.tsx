import Link from "next/link";
import {
  BookOpenCheck,
  Scale,
  ScanText,
  ShieldCheck,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { ReviewerCard } from "@/components/reviewer-card";
import { landings } from "@/lib/landing";
import { boxes } from "@/lib/box";
import { site } from "@/lib/site";

const steps: { title: string; body: string; Icon: LucideIcon; conditions?: boolean }[] = [
  { title: "Label", body: "Ingredients and allergens, read on every snack.", Icon: ScanText },
  { title: "Nutrition", body: "Sugar, sodium, protein, fiber, caffeine and serving size.", Icon: Scale },
  {
    title: "Your condition's rules",
    body: "Each condition has its own screening. A snack must qualify for yours.",
    Icon: ShieldCheck,
    conditions: true,
  },
  { title: "Clinical review", body: "A pharmacist reviews the criteria and each lineup.", Icon: Stethoscope },
  { title: "Packed for You", body: "Your guide explains why each snack made the box.", Icon: BookOpenCheck },
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
          screening, and a snack has to qualify for your condition before it can go in.
        </p>

        {/* The funnel: many snacks in, only qualifying ones out. Decorative; the list below
            carries the meaning for screen readers. */}
        <div className="relative mx-auto mt-12 hidden max-w-5xl lg:block" aria-hidden data-reveal>
          <div
            className="h-16 bg-gradient-to-r from-sage/25 via-sage/15 to-terracotta/30"
            style={{ clipPath: "polygon(0 0, 100% 34%, 100% 66%, 0 100%)" }}
          />
          <p className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-sage-deep">
            Every snack we consider
          </p>
          <p className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-terracotta-deep">
            Your {site.snackCount}
          </p>
        </div>

        <ol
          className="relative mx-auto mt-10 grid max-w-5xl gap-7 lg:mt-8 lg:grid-cols-5 lg:gap-4"
          data-reveal-group
        >
          {/* The track the steps sit on: down the left on mobile, across on desktop. */}
          <span
            aria-hidden
            className="absolute bottom-6 left-6 top-6 w-px bg-sage/40 lg:bottom-auto lg:left-[10%] lg:right-[10%] lg:top-6 lg:h-px lg:w-auto"
          />
          {steps.map(({ title, body, Icon, conditions }, i) => {
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
                  {conditions && (
                    <span className="mt-3 flex flex-wrap gap-1.5 lg:justify-center">
                      {boxes.map((b) => (
                        <span
                          key={b.slug}
                          className="rounded-full border border-sage/40 bg-cream-card px-2.5 py-0.5 text-xs text-sage-deep"
                        >
                          {b.shortName}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-10 text-center text-sm text-ink-soft" data-reveal>
          See the full screening for each box:{" "}
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
      </div>
    </section>
  );
}

export function PackedGuide() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:py-16">
        {/* Packed for You: show the guide, not just describe it */}
        <div className="grid items-center gap-8 lg:grid-cols-2" data-reveal>
          <div>
            <h2 className="font-display text-headline text-ink">
              Your Packed for You guide: the reason behind every snack.
            </h2>
            <p className="mt-4 leading-relaxed text-ink-soft">
              Every box comes with one Packed for You guide: your name and box, the{" "}
              {site.snackCount} snacks inside, a short line on why each one was chosen, and the
              label numbers that matter for your condition. For a gift, your message goes in it
              too.
            </p>
          </div>
          {/* Illustrative layout of one guide entry; no real product named on purpose. */}
          <figure className="mx-auto w-full max-w-sm rotate-[-1.5deg] rounded-2xl border border-border bg-cream-card p-6 shadow-md">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-sage-deep">
              Packed for You guide
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Made for <strong className="text-ink">your name</strong> · Pregnancy Comfort ·
              avoiding what you told us
            </p>
            <p className="mt-4 border-t border-border pt-4 text-[0.65rem] uppercase tracking-[0.16em] text-ink-soft">
              Snack 3 of {site.snackCount}
            </p>
            <p className="mt-1 font-display text-2xl text-ink">Your snack&rsquo;s name</p>
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
              Example layout. Your guide covers all {site.snackCount} snacks.
            </figcaption>
          </figure>
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
        <p className="mx-auto mt-4 max-w-[70ch] text-center text-xs text-ink-soft" data-reveal>
          Keniya picks packaged snacks. It isn&rsquo;t medical advice. Follow your
          doctor&rsquo;s guidance and check each label for allergens.
        </p>
      </div>
    </section>
  );
}
