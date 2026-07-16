import Link from "next/link";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

const nav = [
  { href: "/#boxes", label: "The boxes" },
  { href: "/#inside", label: "What's inside" },
  { href: "/#vote", label: "Vote" },
  { href: "/about", label: "Our story" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-display text-[1.55rem] leading-none tracking-tight text-ink"
        >
          Kaniya<span className="text-terracotta">.</span>
        </Link>
        <nav className="hidden items-center gap-8 sm:flex" aria-label="Main">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <Button asChild className="rounded-full px-5">
          <a href="/#boxes">Shop boxes — ${site.preorderPriceUSD}</a>
        </Button>
      </div>
    </header>
  );
}
