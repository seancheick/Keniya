import Link from "next/link";
import { Button } from "@/components/ui/button";
import { giftLanding } from "@/lib/landing";

const nav = [
  { href: "/#boxes", label: "Shop boxes" },
  { href: giftLanding.path, label: "Gifts" },
  { href: "/#how", label: "How it works" },
  { href: "/#faq", label: "FAQ" },
  { href: "/about", label: "Our story" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-ink/10 bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link
          href="/"
          className="font-display text-[1.75rem] font-extrabold leading-none tracking-[-0.04em] text-ink [font-variation-settings:'wdth'_90,'opsz'_48]"
        >
          Keniya<span className="text-coral-deep">.</span>
        </Link>
        <nav className="hidden items-center gap-7 sm:flex" aria-label="Main">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <Button asChild className="hidden h-10 rounded-full px-5 font-semibold hover:bg-ink/85 md:inline-flex">
          <Link href="/#boxes">Find my box</Link>
        </Button>
      </div>
    </header>
  );
}
