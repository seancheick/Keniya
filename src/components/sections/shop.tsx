"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CheckIcon } from "lucide-react";
import { BuyButton } from "@/components/buy-button";
import { MatchQuiz } from "@/components/quiz/match-quiz";
import { WaitlistForm } from "@/components/waitlist-form";
import Link from "next/link";
import { landingFor } from "@/lib/landing";
import { boxes, type Box } from "@/lib/box";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const promises = [
  `${site.freeShippingLabel} (US)`,
  `Ships ${site.shipDate}`,
  "Full refund any time before it ships",
];

/** #box-heart selects that box; #gift switches to gift mode. Links in llms.txt/JSON-LD use these. */
function readHash(): { slug?: Box["slug"]; gift?: boolean; scroll?: boolean } {
  const h = typeof window === "undefined" ? "" : window.location.hash.slice(1);
  if (h === "gift") return { gift: true };
  if (h === "gift-pregnancy") return { gift: true, slug: "pregnancy_comfort", scroll: true };
  const match = boxes.find((b) => `box-${b.slug}` === h);
  return match ? { slug: match.slug } : {};
}

export function Shop() {
  const [slug, setSlug] = useState<Box["slug"]>(boxes[0].slug);
  const [gift, setGift] = useState(false);
  const box = boxes.find((b) => b.slug === slug) ?? boxes[0];

  useEffect(() => {
    const apply = () => {
      const { slug: s, gift: g, scroll } = readHash();
      if (s) setSlug(s);
      if (g) setGift(true);
      // #gift-pregnancy has no element of its own; bring the buy panel into view.
      if (scroll) document.getElementById("gift")?.scrollIntoView({ block: "center" });
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  return (
    <section id="boxes" className="scroll-mt-20 border-b border-border">
      <span id="preorder" className="block scroll-mt-20" aria-hidden />
      <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
        <h2 className="font-display text-headline text-ink">Pick your box.</h2>
        <p className="mt-3 text-ink-soft">
          ${site.preorderPriceUSD} each · {site.snackCount} snacks · only{" "}
          {site.firstRunPerBox} of each box
        </p>

        {/* Step 1 — real, obviously clickable choices */}
        <div
          role="radiogroup"
          aria-label="Choose a box"
          className="mt-8 grid grid-cols-3 gap-2 sm:gap-4"
        >
          {boxes.map((b) => {
            const active = b.slug === slug;
            return (
              <button
                key={b.slug}
                id={`box-${b.slug}`}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSlug(b.slug)}
                className={cn(
                  "group relative scroll-mt-24 overflow-hidden rounded-2xl border-2 bg-cream-card text-left transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active
                    ? "border-terracotta shadow-md"
                    : "border-border hover:border-sage",
                )}
              >
                <div className="relative aspect-[4/3] w-full bg-cream-deep lg:aspect-[16/9]">
                  <Image
                    src={b.image}
                    alt={b.imageAlt}
                    fill
                    sizes="(max-width: 640px) 33vw, 360px"
                    className="object-cover"
                  />
                  <span
                    className={cn(
                      "absolute right-2 top-2 grid size-6 place-items-center rounded-full border-2 sm:size-7",
                      active
                        ? "border-terracotta bg-terracotta text-cream"
                        : "border-cream bg-cream/80 text-transparent",
                    )}
                    aria-hidden
                  >
                    <CheckIcon className="size-3.5 sm:size-4" strokeWidth={3} />
                  </span>
                </div>
                <div className="p-2.5 sm:p-4">
                  <p className="text-sm font-semibold leading-tight text-ink sm:text-lg">
                    {b.shortName}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    ${site.preorderPriceUSD} · {site.snackCount} snacks
                  </p>
                  <p className="mt-1 hidden text-sm text-ink-soft sm:block">{b.why}</p>
                </div>
              </button>
            );
          })}
        </div>

        <details className="group mt-3 rounded-2xl border border-dashed border-border px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm [&::-webkit-details-marker]:hidden">
            <span>
              <strong className="text-ink">Coming next: GLP-1 Support.</strong>{" "}
              <span className="text-ink-soft">Small portions, protein-forward.</span>{" "}
            </span>
            <span className="shrink-0 font-medium text-sage-deep underline underline-offset-4">
              Join the waitlist
            </span>
          </summary>
          <div className="mt-3 max-w-md">
            <WaitlistForm boxInterest="glp1" source="shop_glp1" cta="Notify me" compact />
          </div>
        </details>

        {/* Step 2 — what's inside + buy */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:gap-8">
          {/* All three panels are in the HTML (tabpanel pattern) so search engines and screen
              readers get every box; only the selected one is shown. */}
          <div className="order-2 lg:order-1">
            {boxes.map((b) => (
              <div
                key={b.slug}
                role="tabpanel"
                aria-label={b.name}
                hidden={b.slug !== box.slug}
                className="rounded-3xl border border-border bg-cream-card p-5 sm:p-7"
              >
                <h3 className="font-display text-2xl text-ink">{b.name}</h3>
                <p className="mt-1 text-sm text-ink-soft">{b.forWho}</p>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-sage-deep">
                  What goes in: {site.snackCount} snacks
                </p>
                <ul className="mt-3 space-y-2.5 text-sm">
                  {b.categories.map((cat) => (
                    <li key={cat.name} className="flex gap-3">
                      <span className="w-7 shrink-0 font-display text-lg leading-5 text-terracotta-deep">
                        {cat.count}×
                      </span>
                      <span className="text-ink-soft">
                        <strong className="font-semibold text-ink">{cat.name}</strong> · {cat.note}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-xs leading-relaxed text-ink-soft">
                  Your condition shapes the box: a snack has to pass this box&rsquo;s screening
                  before it can go in. Exact picks rotate with the season, and your{" "}
                  <strong className="text-ink">Packed for You</strong> guide explains each one.
                </p>
                <Link
                  href={landingFor(b.slug).path}
                  className="mt-4 inline-block text-sm font-medium text-sage-deep underline underline-offset-4 hover:text-ink"
                >
                  How we screen the {b.shortName} box
                </Link>
              </div>
            ))}
          </div>

          <div className="order-1 self-start rounded-3xl bg-blush/60 p-5 sm:p-7 lg:sticky lg:top-24 lg:order-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-display text-4xl text-ink">
                ${site.preorderPriceUSD}
                <span className="ml-2 font-sans text-sm text-ink-soft">
                  {site.snackCount} snacks · {site.freeShippingLabel.toLowerCase()}
                </span>
              </p>
              <p className="text-sm font-semibold text-blush-ink">
                Only {site.firstRunPerBox} made
              </p>
            </div>

            <div
              id="gift"
              role="radiogroup"
              aria-label="Who is it for?"
              className="mt-5 grid scroll-mt-24 grid-cols-2 gap-1 rounded-full bg-cream-card p-1"
            >
              {[
                { value: false, label: "For me" },
                { value: true, label: "It's a gift" },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  role="radio"
                  aria-checked={gift === opt.value}
                  onClick={() => setGift(opt.value)}
                  className={cn(
                    "rounded-full py-2.5 text-sm font-medium transition-colors",
                    gift === opt.value
                      ? "bg-ink text-cream"
                      : "text-ink-soft hover:text-ink",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {gift && (
              <p className="mt-3 text-sm text-ink-soft">
                Enter their address at checkout and write a message. We print it in their
                Packed for You guide.
              </p>
            )}

            <div className="mt-5">
              <BuyButton
                key={`${box.slug}-${gift}`}
                box={box}
                gift={gift}
                showNote={false}
                className="max-w-none [&>button]:w-full"
                label={
                  gift
                    ? `Send the ${box.shortName} box, $${site.preorderPriceUSD}`
                    : `Preorder the ${box.shortName} box, $${site.preorderPriceUSD}`
                }
              />
            </div>

            <p className="mt-3 text-center text-sm font-semibold text-ink">
              No subscription. No surprise renewal.
            </p>

            <ul className="mt-4 space-y-1.5 text-sm text-ink">
              {promises.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-sage-deep" strokeWidth={2.5} aria-hidden />
                  {p}
                </li>
              ))}
            </ul>

            <MatchQuiz>
              <button
                type="button"
                className="mt-5 text-sm font-medium text-ink underline underline-offset-4 hover:text-terracotta-deep"
              >
                Not sure which box? Take the quick quiz
              </button>
            </MatchQuiz>

            <div className="mt-6 border-t border-ink/10 pt-5">
              <p className="text-sm font-medium text-ink">Not ready yet? Get updates.</p>
              <p className="mb-3 mt-0.5 text-xs text-ink-soft">
                Shipping news and first pick of the next box. No spam.
              </p>
              <WaitlistForm
                boxInterest={box.slug}
                source="shop_not_ready"
                cta="Keep me posted"
                compact
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
