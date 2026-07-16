"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const ITEMS = [
  "Ginger chews",
  "Freeze-dried strawberries",
  "Electrolytes",
  "Dark chocolate almonds",
  "Ginger tea",
  "Roasted chickpeas",
];

const POS = [
  { x: -220, y: -150 },
  { x: 220, y: -170 },
  { x: -280, y: -20 },
  { x: 280, y: -45 },
  { x: -130, y: -260 },
  { x: 140, y: -280 },
];

export function BoxOpen() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.set(".open-chip", { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 0.4 });
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: scope.current,
            start: "top top",
            end: "+=180%",
            scrub: 1,
            pin: true,
          },
          defaults: { ease: "power2.inOut" },
        });
        tl.from(".open-title", { autoAlpha: 0, y: 40, duration: 0.6 })
          .to(".open-lid", { rotateX: -110, duration: 1.3 }, "<0.3")
          .to(
            ".open-chip",
            {
              x: (i: number) => POS[i].x,
              y: (i: number) => POS[i].y,
              autoAlpha: 1,
              scale: 1,
              stagger: 0.07,
              duration: 1.5,
              ease: "power3.out",
            },
            "-=0.5",
          )
          .from(".open-note", { autoAlpha: 0, y: 24, duration: 0.6 }, "-=0.5");
      });
    },
    { scope },
  );

  return (
    <>
      {/* Desktop: pinned scroll-scrubbed unboxing */}
      <section
        ref={scope}
        className="relative hidden overflow-hidden border-b border-border bg-cream-deep/40 md:block"
      >
        <div className="flex h-screen flex-col items-center justify-center px-6">
          <div className="open-title text-center">
            <p className="eyebrow">The unboxing</p>
            <h2 className="font-display text-headline mt-4 text-ink">
              Keep scrolling. <em className="text-terracotta-deep">Open it up.</em>
            </h2>
          </div>

          <div className="relative mt-24 [perspective:900px]">
            <div className="open-lid absolute -top-12 left-0 h-12 w-80 origin-bottom rounded-t-2xl border border-border bg-blush" />
            <div className="relative flex h-48 w-80 items-center justify-center rounded-b-2xl border border-border bg-cream-card">
              <p className="font-display text-2xl text-ink">
                Kaniya<span className="text-terracotta">.</span>
              </p>
            </div>
            <div className="absolute left-1/2 top-1/3">
              {ITEMS.map((item) => (
                <span
                  key={item}
                  className="open-chip absolute whitespace-nowrap rounded-full border border-border bg-cream-card px-4 py-2 text-xs font-medium text-ink"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <p className="open-note mt-24 max-w-md text-center text-sm text-ink-soft">
            Twelve items, five categories, one card each — guided by your quiz answers.
          </p>
        </div>
      </section>

      {/* Mobile: calm static composition */}
      <section className="border-b border-border bg-cream-deep/40 md:hidden">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <p className="eyebrow" data-reveal>
            The unboxing
          </p>
          <h2 className="font-display text-headline mt-4 text-ink" data-reveal>
            What tumbles out.
          </h2>
          <div className="mt-6 flex flex-wrap gap-2" data-reveal-group>
            {ITEMS.map((item) => (
              <span
                key={item}
                data-reveal-item
                className="rounded-full border border-border bg-cream-card px-4 py-2 text-xs font-medium text-ink"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
