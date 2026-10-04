"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRightIcon, CheckIcon } from "lucide-react";
import { BuyButton } from "@/components/buy-button";
import { Button } from "@/components/ui/button";
import { MatchQuiz } from "@/components/quiz/match-quiz";
import { WaitlistForm } from "@/components/waitlist-form";
import Link from "next/link";
import { landingFor } from "@/lib/landing";
import { boxes, UPDATES_INTEREST, type Box } from "@/lib/box";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const promises = [
  `${site.freeShippingLabel} (US)`,
  `Ships ${site.shipDate}`,
  "Full refund any time before it ships",
];

/**
 * #box-heart selects that box; #gift switches to gift mode; #gift-<slug> does both
 * (e.g. #gift-blood_sugar). Links in llms.txt/JSON-LD and the gift section use these.
 */
function readHash(): { slug?: Box["slug"]; gift?: boolean; scroll?: boolean } {
  const h = typeof window === "undefined" ? "" : window.location.hash.slice(1);
  if (h === "gift") return { gift: true };
  const giftFor = boxes.find((b) => `gift-${b.slug}` === h || (h === "gift-pregnancy" && b.slug === "pregnancy_comfort"));
  if (giftFor) return { gift: true, slug: giftFor.slug, scroll: true };
  const match = boxes.find((b) => `box-${b.slug}` === h);
  return match ? { slug: match.slug, scroll: true } : {};
}

export function Shop() {
  const [slug, setSlug] = useState<Box["slug"]>(boxes[0].slug);
  const [gift, setGift] = useState(false);
  // After a choice the big cards fold into a compact switcher, so price + checkout sit
  // right under the choice instead of a scroll away.
  const [picked, setPicked] = useState(false);
  const box = boxes.find((b) => b.slug === slug) ?? boxes[0];

  useEffect(() => {
    const apply = () => {
      const { slug: s, gift: g, scroll } = readHash();
      if (s) {
        setSlug(s);
        setPicked(true);
      }
      if (g) setGift(true);
      // After the cards fold (next frame), bring the switcher + checkout into view. This is also
      // where Stripe's back arrow lands (#box-<slug> / #gift-<slug>), one tap from switching.
      if (scroll)
        requestAnimationFrame(() =>
          document.getElementById("box-picker")?.scrollIntoView({ block: "start" }),
        );
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  return (
    <section id="boxes" className="scroll-mt-20 border-b border-border">
      <span id="preorder" className="block scroll-mt-20" aria-hidden />
      <div className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
        <h2 className="font-display text-headline text-ink">Choose your box.</h2>
        <p className="mt-3 text-ink-soft">
          ${site.preorderPriceUSD} each · {site.snackCount} snacks · each screened for its condition
        </p>
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-sage/50 bg-sage/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-ink">
            <strong className="font-semibold">Need a hand choosing?</strong>{" "}
            <span className="text-ink-soft">Find your box with a few quick questions.</span>
          </p>
          <MatchQuiz>
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 rounded-full border-2 border-sage-deep bg-cream-card px-6 text-sm font-semibold text-sage-deep hover:bg-sage-deep hover:text-cream"
            >
              Help me choose
            </Button>
          </MatchQuiz>
        </div>

        {/* Step 1 — real, obviously clickable choices; folds to a switcher once chosen. */}
        <div
          id="box-picker"
          role="radiogroup"
          aria-label="Choose a box"
          className={cn(
            "mt-8 scroll-mt-24",
            picked
              ? "flex gap-2 overflow-x-auto rounded-full bg-cream-deep p-1"
              : "grid gap-3 sm:grid-cols-3 sm:gap-4",
          )}
        >
          {boxes.map((b) => {
            const active = b.slug === slug;
            const choose = () => {
              setSlug(b.slug);
              if (!picked) {
                setPicked(true);
                // Let the fold render, then bring the switcher + checkout into view.
                requestAnimationFrame(() =>
                  document.getElementById("box-picker")?.scrollIntoView({ behavior: "smooth", block: "start" }),
                );
              }
            };
            if (picked) {
              return (
                <button
                  key={b.slug}
                  id={`box-${b.slug}`}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={choose}
                  className={cn(
                    "min-h-11 flex-1 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    active ? "bg-ink text-cream shadow-sm" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {b.shortName}
                </button>
              );
            }
            return (
              <button
                key={b.slug}
                id={`box-${b.slug}`}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={choose}
                className={cn(
                  "group relative flex scroll-mt-24 items-stretch justify-start overflow-hidden rounded-2xl border-2 bg-cream-card text-left transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-col",
                  active
                    ? "border-terracotta shadow-md"
                    : "border-border hover:border-sage",
                )}
              >
                <div className="relative aspect-[4/3] w-32 shrink-0 self-start bg-cream-deep sm:w-full lg:aspect-[16/9]">
                  <Image
                    src={b.image}
                    alt={b.imageAlt}
                    fill
                    sizes="(max-width: 640px) 128px, 360px"
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
                <div className="min-w-0 p-3 sm:p-4">
                  <p className="text-base font-semibold leading-tight text-ink sm:text-lg">
                    {b.shortName}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    ${site.preorderPriceUSD} · {site.snackCount} snacks
                  </p>
                  <p className="mt-1 text-sm leading-snug text-ink-soft">
                    {b.why}
                  </p>
                  {b.caution && (
                    <p className="mt-1.5 text-xs font-semibold leading-snug text-blush-ink">
                      {b.caution}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>


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
                {b.caution && (
                  <p className="mt-1 text-sm font-semibold text-blush-ink">{b.caution}</p>
                )}
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
                <p className="mt-5 max-w-[52ch] text-xs leading-relaxed text-ink-soft">
                  A snack has to pass this box&rsquo;s screening before it can go in. Exact picks
                  rotate with the season, and every box includes a{" "}
                  <strong className="text-ink">Packed for You</strong> card on how we choose.
                </p>
                <Link
                  href={landingFor(b.slug).path}
                  className="mt-4 inline-flex h-11 items-center gap-2 rounded-full border-2 border-sage-deep px-5 text-sm font-semibold text-sage-deep transition-colors hover:bg-sage-deep hover:text-cream"
                >
                  How we choose these snacks
                  <ArrowRightIcon className="size-4" aria-hidden />
                </Link>
              </div>
            ))}
          </div>

          <div className="order-1 self-start rounded-3xl bg-blush/60 p-5 sm:p-7 lg:sticky lg:top-24 lg:order-2">
            {picked && (
              <div className="relative -mx-1 -mt-1 mb-5 aspect-[16/10] overflow-hidden rounded-2xl bg-cream-deep">
                <Image
                  key={box.slug}
                  src={box.image}
                  alt={box.imageAlt}
                  fill
                  sizes="(max-width: 1024px) 90vw, 440px"
                  className="object-cover animate-in fade-in duration-300"
                />
              </div>
            )}
            <p className="mb-1 font-display text-2xl text-ink">{box.name}</p>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
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
                    "min-h-11 rounded-full py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
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
                Enter their address at checkout and write a message. We print it on a note
                inside their box.
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

            <p className="mt-4 border-t border-ink/10 pt-4 text-xs leading-relaxed text-ink-soft">
              Allergies, or lean sweet or salty? Tell us at checkout. Box criteria reviewed by{" "}
              <a href="#reviewer" className="font-medium text-ink underline underline-offset-2">
                Laurie Pham, PharmD
              </a>
              .
            </p>

          </div>
        </div>

        {/* One visible secondary path below the decision: news about new boxes and shipping. */}
        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-cream-card p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-display text-xl text-ink">Not ready to order?</p>
            <p className="mt-1 text-sm text-ink-soft">Get Keniya news: shipping updates and new boxes.</p>
          </div>
          <div className="w-full max-w-md">
            <WaitlistForm
              boxInterest={UPDATES_INTEREST}
              source="home_updates"
              cta="Keep me posted"
              compact
              variant="outline"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
