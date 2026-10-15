import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { ReviewerCard } from "@/components/reviewer-card";
import { Sticker } from "@/components/wrap";
import { landingFor } from "@/lib/landing";
import { boxes } from "@/lib/box";
import { site } from "@/lib/site";

const steps = [
  {
    title: "Pick your box.",
    body: "Pregnancy, postpartum, blood sugar, heart, gestational diabetes or GLP-1. Or send one as a gift.",
    color: "var(--lilac)",
  },
  {
    title: "We pick the good stuff.",
    body: "We read every label against your box's standards, and a pharmacist reviews each box's criteria and lineup.",
    color: "var(--butter)",
  },
  {
    title: "Enjoy the surprise.",
    body: `${site.snackCount} snacks arrive sealed and packed by hand, with a Packed for You card on how we chose them.`,
    color: "var(--mint)",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="paper scroll-mt-20 bg-cream-deep">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <h2 className="max-w-[16ch] font-display text-headline text-ink">
          The snacks change. Our standards don&rsquo;t.
        </h2>
        <p className="mt-4 max-w-[54ch] text-lg leading-relaxed text-ink-soft">
          Every box has its own written standards. A snack has to pass them before it can go in,
          so you get new finds each season without reading a single label.
        </p>

        {/* The steps slide in with the scroll, taking turns: 1 from the right, 2 from the left, 3 from the right. */}
        <ol className="mt-12 grid gap-10 overflow-x-clip md:grid-cols-3 md:gap-8">
          {steps.map((s, i) => (
            <li key={s.title} data-scrub={i % 2 ? "left" : "right"} data-scrub-index={i} className="flex gap-5 md:flex-col md:gap-4">
              <Sticker
                tone="cream"
                className="w-16 shrink-0 md:w-20"
                style={{ backgroundColor: s.color, rotate: `${[-8, 6, -4][i]}deg` }}
              >
                <span className="font-label text-3xl leading-none md:text-4xl">{i + 1}</span>
              </Sticker>
              <span>
                <span className="block font-display text-2xl font-extrabold leading-tight tracking-tight text-ink">
                  {s.title}
                </span>
                <span className="mt-2 block max-w-[34ch] leading-relaxed text-ink-soft">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-14">
          <p className="text-sm font-semibold text-ink">See the standards for each box</p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {boxes.map((b) => (
              <Link
                key={b.slug}
                href={landingFor(b.slug).path}
                data-colorway={b.colorway}
                className="paper inline-flex h-11 items-center gap-2 rounded-full bg-tissue px-5 text-sm font-semibold text-ink shadow-[0_8px_14px_-12px_rgb(37_37_37/0.7)] transition-transform hover:-translate-y-0.5"
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

/** Clinical reviewer + origin story: why the picking can be trusted. */
export function WhyKeniya() {
  return (
    <section aria-labelledby="why-heading">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16 lg:py-24">
        <div>
          <h2 id="why-heading" className="font-display text-headline text-ink">
            Every box gets a careful second look.
          </h2>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
            It started with years of reading labels for our own family. Now we do that work for
            you: whatever you&rsquo;re living with, the box already did the reading, so you can
            just enjoy the snack. Every pick gets the same care as{" "}
            <a
              href={site.pharmaguide.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ink underline underline-offset-4 hover:text-coral-deep"
            >
              PharmaGuide
            </a>
            , our sister platform for ingredient intelligence.
          </p>
        </div>
        <div>
          <ReviewerCard />
          <p className="mt-4 max-w-[60ch] text-xs leading-relaxed text-ink-soft">
            Keniya picks packaged snacks. It isn&rsquo;t medical advice. Follow your doctor&rsquo;s
            guidance and check each label for allergens.
          </p>
        </div>
      </div>
    </section>
  );
}
