"use client";

import { useState } from "react";
import { MatchQuiz } from "@/components/quiz/match-quiz";
import { WaitlistForm } from "@/components/waitlist-form";
import { boxes } from "@/lib/box";
import { site } from "@/lib/site";

export function PreorderCta() {
  const [slug, setSlug] = useState(boxes[0].slug);
  const selected = boxes.find((b) => b.slug === slug) ?? boxes[0];

  return (
    <section id="preorder" className="border-t border-border bg-blush/40">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <p className="eyebrow" data-reveal>
          Reserve your box
        </p>
        <h2 className="font-display text-display mt-5 max-w-[18ch] text-ink" data-reveal>
          Fifty per line. <em className="text-terracotta-deep">First come, first fed.</em>
        </h2>
        <p className="mt-6 max-w-[54ch] text-lg leading-relaxed text-ink-soft" data-reveal>
          ${site.preorderPriceUSD} · 12 items · estimated ship window {site.shipWindow} ·
          US addresses · refundable any time before it ships. Checkout opens on this page
          within days — your email holds a spot in the first {site.firstRunPerBox} today.
        </p>
        <div className="mt-8" data-reveal>
          <div className="flex flex-wrap gap-2">
            {boxes.map((box) => (
              <button
                key={box.slug}
                type="button"
                aria-pressed={slug === box.slug}
                onClick={() => setSlug(box.slug)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  slug === box.slug
                    ? "border-transparent bg-sage-deep text-cream"
                    : "border-border bg-cream-card text-ink hover:border-sage"
                }`}
              >
                {box.shortName}
              </button>
            ))}
          </div>
          <div className="mt-5">
            <WaitlistForm
              key={selected.slug}
              boxInterest={selected.slug}
              source="final_cta"
              cta="Reserve yours"
            />
          </div>
          <div className="mt-5">
            <MatchQuiz>
              <button
                type="button"
                className="text-sm font-medium text-sage-deep transition-colors hover:text-ink"
              >
                Not sure which box? Find yours →
              </button>
            </MatchQuiz>
          </div>
        </div>
      </div>
    </section>
  );
}
