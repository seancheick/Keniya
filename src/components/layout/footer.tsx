import Link from "next/link";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border bg-cream-deep/70">
      <div className="mx-auto max-w-6xl px-6 py-14 pb-28 md:pb-14">
        <p className="font-display text-headline max-w-[22ch] text-ink">
          Someone thought this through for you.
        </p>
        <div className="mt-10 flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
          <div>
            <p className="font-display text-xl text-ink">
              Keniya<span className="text-terracotta">.</span>
            </p>
            <p className="mt-2 max-w-[44ch] text-sm text-ink-soft">
              How we write <em>kɛnɛya</em> — &ldquo;health&rdquo; in Dioula. Curated
              with{" "}
              <a
                href={site.pharmaguide.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sage-deep underline-offset-2 hover:underline"
              >
                PharmaGuide
              </a>{" "}
              ingredient intelligence.
            </p>
          </div>
          <nav
            className="flex flex-wrap gap-x-7 gap-y-2 text-sm text-ink-soft"
            aria-label="Footer"
          >
            <Link className="transition-colors hover:text-ink" href="/pregnancy-snack-box">
              Pregnancy box
            </Link>
            <Link className="transition-colors hover:text-ink" href="/balanced-blood-sugar-snack-box">
              Blood sugar box
            </Link>
            <Link className="transition-colors hover:text-ink" href="/heart-healthy-snack-box">
              Heart box
            </Link>
            <Link className="transition-colors hover:text-ink" href="/pregnancy-gift-box">
              Pregnancy gifts
            </Link>
            <a className="transition-colors hover:text-ink" href="/about">
              Our story
            </a>
            <Link className="transition-colors hover:text-ink" href="/#how">
              How we pick
            </Link>
            <a
              className="transition-colors hover:text-ink"
              href={site.pharmaguide.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              PharmaGuide
            </a>
            <Link className="transition-colors hover:text-ink" href="/#faq">
              FAQ
            </Link>
            <a className="transition-colors hover:text-ink" href="/privacy">
              Privacy
            </a>
            <a className="transition-colors hover:text-ink" href="/terms">
              Terms
            </a>
            <a className="transition-colors hover:text-ink" href={`mailto:${site.email}`}>
              {site.email}
            </a>
          </nav>
        </div>
        <p className="mt-10 max-w-3xl text-xs leading-relaxed text-ink-soft">
          Keniya curates packaged snacks for comfort and enjoyment through pregnancy and
          other life stages. These statements have not been evaluated by the Food and Drug
          Administration. Our boxes are not intended to diagnose, treat, cure, or prevent
          any disease or condition, and nothing here is medical or nutritional advice —
          always follow the guidance of your healthcare provider about what&rsquo;s right
          for you. Every item ships in its original sealed packaging; check manufacturer
          labels for allergens.
        </p>
        <p className="mt-6 text-xs text-ink-soft">
          © 2026 Keniya. All rights reserved. · Free shipping on founding preorders ·{" "}
          <a href={site.url} className="hover:text-ink">
            keniyahealth.com
          </a>
        </p>
      </div>
    </footer>
  );
}
