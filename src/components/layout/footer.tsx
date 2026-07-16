import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border bg-cream-deep/70">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <p className="font-display text-headline max-w-[22ch] text-ink">
          Someone thought this through for you.
        </p>
        <div className="mt-10 flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
          <div>
            <p className="font-display text-xl text-ink">
              Keniya<span className="text-terracotta">.</span>
            </p>
            <p className="mt-2 max-w-[44ch] text-sm text-ink-soft">
              From <em>kɛnɛya</em> — &ldquo;health&rdquo; in Dioula. Curated with
              PharmaGuide ingredient intelligence.
            </p>
          </div>
          <nav
            className="flex flex-wrap gap-x-7 gap-y-2 text-sm text-ink-soft"
            aria-label="Footer"
          >
            <a className="transition-colors hover:text-ink" href="/about">
              Our story
            </a>
            <a className="transition-colors hover:text-ink" href="/#faq">
              FAQ
            </a>
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
        <p className="mt-10 max-w-3xl text-xs leading-relaxed text-ink-soft/80">
          Keniya curates packaged snacks for comfort and enjoyment through pregnancy and
          other life stages. These statements have not been evaluated by the Food and Drug
          Administration. Our boxes are not intended to diagnose, treat, cure, or prevent
          any disease or condition, and nothing here is medical or nutritional advice —
          always follow the guidance of your healthcare provider about what&rsquo;s right
          for you. Every item ships in its original sealed packaging; check manufacturer
          labels for allergens.
        </p>
        <p className="mt-6 text-xs text-ink-soft/70">
          © 2026 Keniya. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
