"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";


export function StickyBuyBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Hidden near the top and while the shop itself is on screen (it has its own button).
    let inShop = false;
    const update = () => setShow(window.scrollY > 520 && !inShop);
    const shop = document.getElementById("boxes");
    const io = new IntersectionObserver(([e]) => {
      inShop = e.isIntersecting;
      update();
    });
    if (shop) io.observe(shop);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", update);
    };
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
          href="#boxes"
          className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Pick your box
        </a>
      </div>
    </div>
  );
}
