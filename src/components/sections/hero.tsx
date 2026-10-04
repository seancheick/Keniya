"use client";

import Image from "next/image";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

export function Hero() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = new SplitText(".hero-title", { type: "lines", mask: "lines" });
        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
        tl.from(
            split.lines,
            {
              yPercent: 110,
              duration: 1.1,
              stagger: 0.09,
              onComplete: () => split.revert(),
            },
            0.15,
          )
          .from(
            [".hero-sub", ".hero-actions"],
            { autoAlpha: 0, y: 18, duration: 0.7, stagger: 0.1 },
            "-=0.55",
          )
          // Motion only, no fade: the hero image is the LCP element, so it must paint at once.
          .from(".hero-visual", { y: 30, scale: 0.97, duration: 0.9 }, "-=0.6");

        return () => split.revert();
      });

      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-speed]").forEach((el) => {
          gsap.to(el, {
            y: () => -44 * parseFloat(el.dataset.speed ?? "1"),
            ease: "none",
            scrollTrigger: {
              trigger: scope.current,
              start: "top top",
              end: "bottom top",
              scrub: 0.8,
            },
          });
        });
      });
    },
    { scope },
  );

  return (
    <section ref={scope} className="overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-16 px-6 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-24 lg:pt-24">
        <div>
          <h1 className="hero-title font-display text-display text-ink">
            The snack box that did the{" "}
            <em className="text-terracotta-deep">label reading</em> for you.
          </h1>
          <p className="hero-sub mt-6 max-w-[48ch] text-lg leading-relaxed text-ink-soft">
            For pregnancy, carb-conscious eating or heart health: {site.snackCount} snacks
            already screened for you, with a card on how we choose.
          </p>
          <div className="hero-actions mt-9">
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-14 rounded-full px-9 text-lg font-semibold shadow-md">
                <a href="#boxes">Choose your box</a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 rounded-full border-2 border-ink/80 bg-transparent px-8 text-lg font-semibold text-ink hover:bg-ink hover:text-cream"
              >
                <a href="#gift">Send a gift</a>
              </Button>
            </div>
            <p className="mt-4 text-sm font-medium text-ink">
              ${site.preorderPriceUSD} · {site.snackCount} snacks · Free US shipping · No subscription
            </p>
          </div>
        </div>

        <div className="hero-visual relative mx-auto w-full">
          <div className="relative mx-auto max-w-xl lg:max-w-none">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] bg-blush shadow-sm">
              <Image
                src="/images/hero-box.jpg"
                alt="An open Keniya box of 14 snacks with its Packed for You card"
                fill
                loading="eager"
                fetchPriority="high"
                sizes="(max-width: 1024px) 90vw, 560px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
