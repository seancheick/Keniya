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

const chips = [
  { label: "Ginger chews", className: "left-[-8%] top-[12%]", speed: "1.4" },
  { label: "Freeze-dried strawberries", className: "right-[-6%] top-[30%]", speed: "0.9" },
  { label: "Electrolytes", className: "left-[-4%] top-[54%]", speed: "1.1" },
  { label: "Dark chocolate almonds", className: "right-[-8%] top-[70%]", speed: "1.5" },
];

export function Hero() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = new SplitText(".hero-title", { type: "lines", mask: "lines" });
        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
        tl.from(".hero-eyebrow", { autoAlpha: 0, y: 14, duration: 0.6 }, 0.1)
          .from(
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
            [".hero-sub", ".hero-actions", ".hero-meta"],
            { autoAlpha: 0, y: 18, duration: 0.7, stagger: 0.1 },
            "-=0.55",
          )
          .from(".hero-visual", { autoAlpha: 0, y: 30, scale: 0.97, duration: 0.9 }, "-=0.6")
          .from(".hero-chip", { autoAlpha: 0, y: 16, stagger: 0.08, duration: 0.5 }, "-=0.5");

        gsap.utils.toArray<HTMLElement>(".hero-chip").forEach((chip, i) => {
          gsap.to(chip, {
            y: i % 2 ? 9 : -9,
            duration: 2.6 + i * 0.4,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
          });
        });

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
          <p className="hero-eyebrow eyebrow">Founding preorder · only {site.firstRunPerBox} of each</p>
          <h1 className="hero-title font-display text-display mt-5 text-ink">
            The snack box that did the{" "}
            <em className="text-terracotta-deep">label reading</em> for you.
          </h1>
          <p className="hero-sub mt-6 max-w-[48ch] text-lg leading-relaxed text-ink-soft">
            Pregnancy, blood sugar or heart health. 14 snacks picked for you, with a card
            that says why each one is there.
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
          <p className="hero-meta mt-6 text-sm text-ink-soft/80">
            ${site.preorderPriceUSD} · {site.freeShippingLabel} · Ships {site.shipDate} ·
            Refundable until it ships
          </p>
        </div>

        <div className="hero-visual relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative mx-auto aspect-[4/5] max-w-md overflow-hidden rounded-[1.75rem] bg-blush shadow-sm">
            <Image
              src="/images/hero-unboxing.jpg"
              alt="Keniya founding snack box unboxing with Packed for You guide"
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 768px) 90vw, 480px"
              className="object-cover"
            />
            <div
              data-speed="0.7"
              className="absolute right-4 top-4 grid size-24 place-items-center rounded-full border border-blush-ink/25 bg-cream/90 text-center backdrop-blur-sm"
            >
              <p className="text-[0.65rem] font-medium leading-tight tracking-[0.14em] text-blush-ink">
                14 SNACKS
                <br />· ${site.preorderPriceUSD} ·
              </p>
            </div>
          </div>
          {chips.map((chip) => (
            <span
              key={chip.label}
              data-speed={chip.speed}
              className={`hero-chip absolute hidden items-center gap-2 rounded-full border border-border bg-cream-card px-4 py-2 text-xs font-medium text-ink sm:inline-flex ${chip.className}`}
            >
              <span className="size-1.5 rounded-full bg-sage-deep" aria-hidden />
              {chip.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
