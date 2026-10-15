import Link from "next/link";
import { boxes } from "@/lib/box";
import { giftLanding, landingFor } from "@/lib/landing";
import { site } from "@/lib/site";

const linkClass = "text-cream/75 transition-colors hover:text-cream";

export function Footer() {
  return (
    <footer className="bg-ink text-cream">
      <div className="mx-auto max-w-6xl px-5 py-16 pb-28 md:pb-16">
        <p className="max-w-[20ch] font-display text-headline text-cream">
          Someone thought this through for you.
        </p>
        <div className="mt-12 grid gap-10 sm:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <p className="font-display text-2xl font-extrabold tracking-[-0.04em]">
              Keniya<span className="text-coral">.</span>
            </p>
            <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-cream/75">
              How we write <em>kɛnɛya</em>, &ldquo;health&rdquo; in Dioula. Curated with{" "}
              <a
                href={site.pharmaguide.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-cream underline underline-offset-4"
              >
                PharmaGuide
              </a>{" "}
              ingredient intelligence.
            </p>
          </div>
          <nav aria-label="Boxes">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cream/60">Boxes</p>
            <ul className="mt-3 space-y-2 text-sm">
              {boxes.map((b) => (
                <li key={b.slug}>
                  <Link className={linkClass} href={landingFor(b.slug).path}>
                    {b.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Footer">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cream/60">Keniya</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link className={linkClass} href={giftLanding.path}>Gifts</Link></li>
              <li><Link className={linkClass} href="/corporate-gifts">Corporate &amp; team gifts</Link></li>
              <li><Link className={linkClass} href="/#how">How it works</Link></li>
              <li><Link className={linkClass} href="/about">Our story</Link></li>
              <li><Link className={linkClass} href="/#faq">FAQ</Link></li>
              <li><a className={linkClass} href="/privacy">Privacy</a></li>
              <li><a className={linkClass} href="/terms">Terms</a></li>
              <li><a className={linkClass} href={`mailto:${site.email}`}>{site.email}</a></li>
            </ul>
          </nav>
        </div>
        {/* Conventional food, no supplement claims: no FDA supplement disclaimer. What stays is
            the honest scope of what Keniya does, and the allergen reminder. */}
        <p className="mt-12 max-w-[90ch] border-t border-cream/15 pt-6 text-xs leading-relaxed text-cream/70">
          Keniya curates packaged snacks to each box&rsquo;s published standards. It isn&rsquo;t
          medical or nutritional advice; follow your healthcare provider&rsquo;s guidance about
          what&rsquo;s right for you. Every item ships in its original sealed packaging, so check
          each label for allergens.
        </p>
        <p className="mt-4 text-xs text-cream/70">
          © 2026 Keniya. All rights reserved. · Free US shipping ·{" "}
          <a href={site.url} className="hover:text-cream">
            keniyahealth.com
          </a>
        </p>
      </div>
    </footer>
  );
}
