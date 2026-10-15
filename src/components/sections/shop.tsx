"use client";

import { useEffect, useState } from "react";
import { ArrowRightIcon, CheckIcon } from "lucide-react";
import { BoxVisual } from "@/components/box-visual";
import { MatchQuiz } from "@/components/quiz/match-quiz";
import { Purchase } from "@/components/purchase";
import { Sticker } from "@/components/wrap";
import { SnackFacts } from "@/components/snack-facts";
import { WaitlistForm } from "@/components/waitlist-form";
import Link from "next/link";
import { landingFor } from "@/lib/landing";
import { saleCopy, UPDATES_INTEREST, type Box, type PublicBox } from "@/lib/box";
import type { PublicOffers } from "@/lib/public-sales";
import type { BoxSlug } from "@/lib/admin/types";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const promises = [
  `${site.freeShippingLabel} (US)`,
  `First boxes ship ${site.shipDate}`,
  "Full refund any time before it ships",
];

/**
 * #box-heart selects that box; #gift switches to gift mode; #gift-<slug> does both
 * (e.g. #gift-blood_sugar). Links in llms.txt/JSON-LD and the gift section use these.
 */
function readHash(boxes: Box[]): { slug?: Box["slug"]; gift?: boolean; scroll?: boolean } {
  const h = typeof window === "undefined" ? "" : window.location.hash.slice(1);
  if (h === "gift") return { gift: true };
  const giftFor = boxes.find((b) => `gift-${b.slug}` === h || (h === "gift-pregnancy" && b.slug === "pregnancy_comfort"));
  if (giftFor) return { gift: true, slug: giftFor.slug, scroll: true };
  const match = boxes.find((b) => `box-${b.slug}` === h);
  return match ? { slug: match.slug, scroll: true } : {};
}

/** `boxes` and `standards` are filled from the live box rules by the page (src/lib/public-rules.ts). */
export function Shop({ boxes, standards, offers }: { boxes: PublicBox[]; standards: Record<BoxSlug, string[]>; offers: PublicOffers }) {
  const [slug, setSlug] = useState<Box["slug"]>(boxes[0].slug);
  const [gift, setGift] = useState(false);
  // After a choice the big cards fold into a compact switcher, so price + checkout sit
  // right under the choice instead of a scroll away.
  const [picked, setPicked] = useState(false);
  const box = boxes.find((b) => b.slug === slug) ?? boxes[0];
  const status = saleCopy(box, site.shipDate);

  useEffect(() => {
    const apply = () => {
      const { slug: s, gift: g, scroll } = readHash(boxes);
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
  }, [boxes]);

  return (
    <section id="boxes" className="scroll-mt-20">
      <span id="preorder" className="block scroll-mt-20" aria-hidden />
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-14 lg:pb-24 lg:pt-20">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-headline text-ink">Which box is for you?</h2>
            <p className="mt-3 max-w-[52ch] text-ink-soft">
              Six boxes, each with its own snack standards. ${site.preorderPriceUSD} each,{" "}
              {site.snackCount} snacks, free shipping.
            </p>
          </div>
          <MatchQuiz boxes={boxes}>
            <button
              type="button"
              className="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-full border-2 border-ink bg-cream-card px-5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-cream focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:self-auto"
            >
              Not sure? Help me choose
            </button>
          </MatchQuiz>
        </div>

        {/* Step 1 — six wrapped boxes, each in its own tissue; folds to a switcher once chosen. */}
        <div
          id="box-picker"
          role="radiogroup"
          aria-label="Choose a box"
          className={cn(
            "mt-9 scroll-mt-24",
            picked
              ? "flex gap-1.5 overflow-x-auto rounded-full border-2 border-ink bg-cream-card p-1 [scrollbar-width:none]"
              : "grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3",
          )}
        >
          {boxes.map((b, i) => {
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
                  data-colorway={b.colorway}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={choose}
                  className={cn(
                    "inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    active ? "bg-ink text-cream" : "text-ink-soft hover:bg-cream-deep hover:text-ink",
                  )}
                >
                  <span aria-hidden className="size-2.5 rounded-full bg-tissue ring-1 ring-ink/25" />
                  {b.shortName}
                </button>
              );
            }
            const s = saleCopy(b, site.shipDate);
            return (
              <button
                key={b.slug}
                id={`box-${b.slug}`}
                data-colorway={b.colorway}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={choose}
                className={cn(
                  "paper group relative flex scroll-mt-24 items-stretch gap-3 rounded-[6px] bg-tissue p-2.5 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 sm:flex-col sm:gap-0 sm:p-3",
                  // A springy lift with a slight tilt, like a gift tag swinging (eases back with a small overshoot).
                  "shadow-[0_14px_24px_-20px_rgb(37_37_37/0.7)] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-2 hover:shadow-[0_26px_34px_-22px_rgb(37_37_37/0.75)]",
                  i % 2 ? "hover:rotate-[0.8deg]" : "hover:-rotate-[0.8deg]",
                  active && "ring-[3px] ring-ink",
                )}
              >
                {/* The wrapped box: a sheet of tissue peeking behind the photo, sealed with its price. */}
                <div className="relative w-[42%] shrink-0 self-start sm:w-full">
                  <span aria-hidden className="paper absolute inset-0 -rotate-[2.5deg] rounded-[3px] bg-cream-card/85 shadow-[0_6px_12px_-8px_rgb(37_37_37/0.5)]" />
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-cream-deep">
                    <BoxVisual box={b} sizes="(max-width: 640px) 40vw, 360px" className="transition-transform duration-500 ease-[var(--ease-soft)] group-hover:scale-[1.03]" />
                    <span
                      aria-hidden
                      className={cn(
                        "absolute left-2 top-2 grid size-7 place-items-center rounded-full border-2 transition-colors sm:size-8",
                        active ? "border-ink bg-ink text-cream" : "border-ink/30 bg-cream-card/85 text-transparent",
                      )}
                    >
                      <CheckIcon className="size-3.5 sm:size-4" strokeWidth={3} />
                    </span>
                  </div>
                  <Sticker tone="butter" className="absolute -bottom-3 -right-2.5 w-[3.4rem] -rotate-[10deg] sm:-bottom-4 sm:-right-3 sm:w-[4.6rem]">
                    <span className="font-label text-[0.95rem] leading-none sm:text-xl">${site.preorderPriceUSD}</span>
                  </Sticker>
                </div>
                <div className="min-w-0 flex-1 py-1 sm:px-1.5 sm:pb-1.5 sm:pt-5">
                  <p className="font-display text-xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-2xl">
                    {b.name.replace(/ Box$/, "")}
                  </p>
                  <p className="mt-1.5 text-sm leading-snug text-tissue-ink">{b.tagline}</p>
                  {b.caution && (
                    <p className="mt-1.5 text-xs font-bold leading-snug text-ink">{b.caution}</p>
                  )}
                  <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-cream-card/80 px-2.5 py-1 text-[11px] font-semibold leading-none text-ink">
                    <span
                      aria-hidden
                      className={cn("size-1.5 rounded-full", b.sale?.available ? "bg-mint-deep" : "bg-ink/40")}
                    />
                    {s.chip}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Step 2 — the box's Snack Facts + buy */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
          {/* Every box's panel is in the HTML (tabpanel pattern) so search engines and screen
              readers get every box; only the selected one is shown. */}
          <div className="order-2 lg:order-1">
            {boxes.map((b) => (
              <div key={b.slug} role="tabpanel" aria-label={b.name} hidden={b.slug !== box.slug}>
                <p className="mb-4 max-w-[60ch] text-ink-soft">
                  <strong className="font-semibold text-ink">{b.name}.</strong> {b.forWho}
                </p>
                <SnackFacts box={b} standards={standards[b.slug]} />
                <p className="mt-4 text-sm text-ink-soft">
                  Every box includes a <strong className="text-ink">Packed for You</strong> card on how we
                  choose.
                </p>
                <Link
                  href={landingFor(b.slug).path}
                  className="mt-3 inline-flex h-11 items-center gap-2 rounded-full border-2 border-ink px-5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-cream"
                >
                  How we choose these snacks
                  <ArrowRightIcon className="size-4" aria-hidden />
                </Link>
              </div>
            ))}
          </div>

          <div
            data-colorway={box.colorway}
            className="relative order-1 self-start rounded-[6px] border-2 border-ink bg-cream-card p-5 pt-7 shadow-[0_18px_30px_-22px_rgb(37_37_37/0.6)] sm:p-7 sm:pt-9 lg:sticky lg:top-24 lg:order-2"
          >
            {/* The tag's punched hole. */}
            <span aria-hidden className="absolute left-1/2 top-2.5 size-3.5 -translate-x-1/2 rounded-full border-2 border-ink bg-cream" />
            {picked && (
              <div key={box.slug} className="relative mb-5 aspect-[16/10] overflow-hidden rounded-[3px] bg-cream-deep">
                <BoxVisual box={box} sizes="(max-width: 1024px) 90vw, 440px" className="animate-in fade-in duration-300" />
              </div>
            )}
            <p className="mb-2 font-display text-2xl font-extrabold leading-tight tracking-tight text-ink">{box.name}</p>
            <Purchase box={box} offers={offers} status={status.line} gift={gift} onGiftChange={setGift} />

            <ul className="mt-4 space-y-1.5 text-sm text-ink">
              {promises.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-mint-deep" strokeWidth={2.5} aria-hidden />
                  {p}
                </li>
              ))}
            </ul>

            <p className="mt-4 border-t-2 border-dashed border-ink/20 pt-4 text-xs leading-relaxed text-ink-soft">
              Allergies, or lean sweet or salty? Tell us at checkout. Box criteria reviewed by{" "}
              <a href="#reviewer" className="font-semibold text-ink underline underline-offset-2">
                Laurie Pham, PharmD
              </a>
              .
            </p>
          </div>
        </div>

        {/* One visible secondary path below the decision: news about new boxes and shipping. */}
        <div className="mt-10 flex flex-col gap-4 rounded-[6px] border-2 border-dashed border-ink/25 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-display text-xl font-extrabold tracking-tight text-ink">Not ready to order?</p>
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
