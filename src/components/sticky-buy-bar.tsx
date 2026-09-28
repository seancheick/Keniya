"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";
import { boxes } from "@/lib/box";

export function StickyBuyBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-cream/95 p-3 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">
            Preorder · ${site.preorderPriceUSD}
          </p>
          <p className="truncate text-xs text-ink-soft">
            Free shipping · only {site.firstRunPerBox} of each box
          </p>
        </div>
        <a
          href={`#box-${boxes[0].slug}`}
          className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Shop boxes
        </a>
      </div>
    </div>
  );
}
