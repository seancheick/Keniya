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
          .from(".hero-visual", { autoAlpha: 0, y: 30, scale: 0.97, duration: 0.9 }, "-=0.6");

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
            Pregnancy, blood sugar or heart health. Choose what you&rsquo;re navigating, and
            Keniya screens and selects {site.snackCount} snacks around it, with a guide explaining
            why each one made the box.
          </p>
          <div className="hero-actions mt-9 flex flex-wrap items-center gap-6">
            <Button asChild size="lg" className="h-12 rounded-full px-8 text-base font-semibold">
              <a href="#boxes">Pick your box, ${site.preorderPriceUSD}</a>
            </Button>
            <a
              href="#gift"
              className="text-sm font-medium text-ink underline underline-offset-4 transition-colors hover:text-terracotta-deep"
            >
              Send as a gift
            </a>
          </div>
        </div>

        <div className="hero-visual relative mx-auto w-full max-w-md lg:max-w-none">
          {/* Badge sits on the frame's corner (a sticker), not inside it: no card-in-card. */}
          <div className="relative mx-auto max-w-md">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-blush shadow-sm">
              <Image
                src="/images/hero-guide.jpg"
                alt="A Packed for You guide that reads Made for you, screened for your condition, over a box of 14 snack slots"
                fill
                loading="eager"
                fetchPriority="high"
                sizes="(max-width: 768px) 90vw, 480px"
                className="object-cover"
              />
            </div>
            <div
              data-speed="0.7"
              className="absolute -right-3 -top-4 grid size-24 rotate-6 place-items-center rounded-full bg-terracotta-deep text-center shadow-[0_8px_20px_-6px_rgb(51_48_43/0.35)] sm:-right-5"
            >
              <p className="font-display text-sm leading-tight text-cream">
                {site.snackCount} snacks
                <br />${site.preorderPriceUSD}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
