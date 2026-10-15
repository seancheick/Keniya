"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Lenis from "lenis";
import { usePathname } from "next/navigation";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Global motion controller: Lenis smooth scroll driven by the GSAP ticker,
// plus data-attribute scroll reveals so sections can stay server components.
// html.fx gates the pre-reveal hidden state — no JS (or reduced motion) = fully visible page.
export function ScrollFx() {
  const pathname = usePathname();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        document.documentElement.classList.add("fx");

        // anchors:true = hash links smooth-scroll through the page, so scroll reveals
        // fire naturally instead of landing on un-revealed (invisible) sections.
        const lenis = new Lenis({ autoRaf: false, anchors: true });
        lenis.on("scroll", ScrollTrigger.update);
        const raf = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(raf);
        gsap.ticker.lagSmoothing(0);

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          const dir = el.dataset.reveal;
          // "left" slides in from the left, "right" from the right; distance is per element.
          const dist = parseFloat(el.dataset.revealDistance ?? "40");
          const from: gsap.TweenVars = { autoAlpha: 0, y: 28 };
          if (dir === "left") Object.assign(from, { x: -dist, y: 0 });
          if (dir === "right") Object.assign(from, { x: dist, y: 0 });
          gsap.fromTo(el, from, {
            autoAlpha: 1,
            x: 0,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            delay: parseFloat(el.dataset.revealDelay ?? "0"),
            scrollTrigger: { trigger: el, start: "top 82%", once: true },
          });
        });

        // Scroll-linked slides: data-scrub="left"|"right" moves an element in from that side in
        // step with the scroll (and back out if you scroll up), smoothed so it never jitters.
        // Each starts as soon as its top edge enters the screen. When siblings share a row
        // (md and up), data-scrub-index nudges them so they settle one after another; stacked,
        // their own positions already stagger them.
        const inRow = () => window.matchMedia("(min-width: 768px)").matches;
        gsap.utils.toArray<HTMLElement>("[data-scrub]").forEach((el) => {
          const side = el.dataset.scrub === "left" ? -1 : 1;
          const dist = parseFloat(el.dataset.scrubDistance ?? "90");
          const lag = () => (inRow() ? parseFloat(el.dataset.scrubIndex ?? "0") * 6 : 0);
          gsap.fromTo(
            el,
            { autoAlpha: 0, x: side * dist, rotate: side * 2 },
            {
              autoAlpha: 1,
              x: 0,
              rotate: 0,
              ease: "power2.out",
              scrollTrigger: {
                trigger: el,
                start: () => `top ${100 - lag()}%`,
                end: () => `top ${68 - lag()}%`,
                scrub: 0.6,
                invalidateOnRefresh: true,
              },
            },
          );
        });

        ScrollTrigger.refresh();
        // Web fonts can land after this runs and shift layout a few pixels; re-measure then.
        let live = true;
        document.fonts?.ready.then(() => live && ScrollTrigger.refresh());

        // Pinned sections (if any) insert their spacers after this effect, pushing every
        // #hash target further down. Re-measure next frame, then land on the hash —
        // lenis.resize() first, or Lenis clamps the jump to its stale (pre-spacer) limit.
        const settle = requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          lenis.resize();
          // getElementById, not a selector string: a malformed hash ("#", "#1a") would throw.
          const target = location.hash && document.getElementById(location.hash.slice(1));
          if (target) lenis.scrollTo(target, { immediate: true });
        });

        return () => {
          live = false;
          cancelAnimationFrame(settle);
          gsap.ticker.remove(raf);
          lenis.destroy();
          document.documentElement.classList.remove("fx");
        };
      });
    },
    // The layout persists across client-side navigation, but each page brings new
    // [data-reveal] elements that stay hidden until a trigger exists for them.
    { dependencies: [pathname], revertOnUpdate: true },
  );

  return null;
}
