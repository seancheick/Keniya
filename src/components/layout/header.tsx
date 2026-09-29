import Link from "next/link";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/#boxes", label: "The boxes" },
  { href: "/pregnancy-gift-box", label: "Gifts" },
  { href: "/#how", label: "How we pick" },
  { href: "/#faq", label: "FAQ" },
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
          Keniya<span className="text-terracotta">.</span>
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
        <Button asChild className="hidden rounded-full px-5 md:inline-flex">
          <Link href="/#boxes">Pick your box</Link>
        </Button>
      </div>
    </header>
  );
}
