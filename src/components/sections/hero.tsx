"use client";

import Image from "next/image";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/button";
import { ExampleChip, Sticker, Tissue } from "@/components/wrap";
import { site } from "@/lib/site";
import { extrasLabel } from "@/lib/box";

gsap.registerPlugin(useGSAP);

/**
 * `open`: at least one box takes orders right now (live sale state, never assumed).
 * `extras`: the little-extras range every box's live recipe promises, or null.
 */
export function Hero({ open, extras }: { open: boolean; extras: { min: number; max: number } | null }) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      // The one authored moment: the tissue fans out under the box, then the seal lands.
      // Everything is visible by default; reduced motion skips straight to the end state.
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.from(".hero-line", { yPercent: 40, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.05)
          .fromTo(".hero-tissue", { "--fan": 0 }, { "--fan": 1, duration: 1.2 }, 0.15)
          .from(".hero-seal", { scale: 1.6, rotate: -40, autoAlpha: 0, duration: 0.7, ease: "back.out(2.2)" }, 0.55)
          .from(".hero-after", { autoAlpha: 0, y: 12, duration: 0.6, stagger: 0.08 }, 0.4);
      });
    },
    { scope },
  );

  return (
    <section ref={scope} className="overflow-x-clip">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-14 px-5 pb-14 pt-8 sm:pt-12 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:pb-24 lg:pt-16 [grid-template-areas:'title'_'visual'_'copy'] lg:[grid-template-areas:'title_visual'_'copy_visual']">
        <h1 className="font-display text-display text-ink [grid-area:title] lg:self-end">
          <span className="hero-line block">Better snacks.</span>
          <span className="hero-line block">
            Less guesswork<span className="text-coral-deep">.</span>
          </span>
        </h1>

        <div className="[grid-area:copy] lg:self-start">
          <p className="hero-after mt-6 max-w-[42ch] text-lg leading-relaxed text-ink-soft lg:mt-7">
            Delicious snack boxes, picked with care for life&rsquo;s different needs: pregnancy
            cravings, postpartum days, blood sugar, heart wellness and GLP-1 routines.
          </p>
          <div className="hero-after mt-7 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-14 rounded-full px-9 text-base font-semibold shadow-[0_10px_20px_-12px_rgb(37_37_37/0.7)] hover:bg-ink/85">
              <a href="#boxes">Find my box</a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 rounded-full border-2 border-ink bg-transparent px-8 text-base font-semibold text-ink shadow-none hover:bg-ink hover:text-cream"
            >
              <a href="#gift">Send a gift</a>
            </Button>
          </div>
          <p className="hero-after mt-5 text-sm font-medium text-ink">
            ${site.preorderPriceUSD} a box · {site.snackCount} snacks{extras ? ` + ${extrasLabel(extras)} little extras` : ""} · Free US shipping · No subscription needed
          </p>
          <p className="hero-after mt-1.5 text-sm text-ink-soft">
            {open ? "Order now. " : ""}First boxes ship {site.shipDate.replace(/, \d{4}$/, "")}.
          </p>
        </div>

        <div className="relative mx-auto mb-12 mt-10 w-full max-w-xl [grid-area:visual] sm:mb-16 lg:mb-0 lg:mt-0 lg:ml-0 lg:mr-[min(0px,calc(38rem-50vw))] lg:w-auto lg:max-w-none">
          <div className="relative px-3 py-4 sm:px-5 sm:py-6">
            <Tissue
              className="hero-tissue [--fan-scale:0.6] lg:[--fan-scale:1]"
              colors={["var(--lilac)", "var(--butter)", "var(--mint)"]}
            />
            <div className="relative aspect-[16/11] overflow-hidden rounded-md bg-cream-deep shadow-[0_24px_40px_-24px_rgb(37_37_37/0.55)]">
              <Image
                src="/images/hero-box.jpg"
                alt="An example Keniya box: 14 snacks with a Packed for You card"
                fill
                loading="eager"
                fetchPriority="high"
                sizes="(max-width: 1024px) 92vw, 600px"
                className="object-cover"
              />
              <ExampleChip />
            </div>
          </div>
          <Sticker className="hero-seal absolute -left-2 -top-5 w-28 -rotate-12 sm:-left-6 sm:w-36 lg:-left-10 lg:-top-8 lg:w-40">
            <span className="leading-none">
              <span className="font-label block text-[2.6rem] leading-[0.85] sm:text-5xl lg:text-6xl">
                {site.snackCount}
              </span>
              <span className="font-label block text-sm uppercase tracking-wide sm:text-base">snacks</span>
              <span className="mt-1 block text-[11px] font-semibold sm:text-xs">{extras ? "+ little extras" : `$${site.preorderPriceUSD} · ships free`}</span>
            </span>
          </Sticker>
        </div>
      </div>
    </section>
  );
}
