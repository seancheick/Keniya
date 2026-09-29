"use client";

import { useState, useTransition } from "react";
import { startCheckout } from "@/actions/checkout";
import { Button } from "@/components/ui/button";
import { WaitlistForm } from "@/components/waitlist-form";
import { site } from "@/lib/site";
import type { Box } from "@/lib/box";
import { cn } from "@/lib/utils";

async function openCheckout(boxSlug: string, gift: boolean) {
  // Prefer server action; fall back to API route if the action throws
  try {
    return await startCheckout({ boxSlug, gift });
  } catch (err) {
    console.error("startCheckout action threw", err);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boxSlug, gift }),
    });
    return (await res.json()) as Awaited<ReturnType<typeof startCheckout>>;
  }
}

export function BuyButton({
  box,
  size = "lg",
  className,
  label,
  showFallbackEmail = true,
  gift = false,
  variant = "default",
  showNote = true,
}: {
  box: Box;
  size?: "default" | "lg" | "sm";
  className?: string;
  label?: string;
  showFallbackEmail?: boolean;
  gift?: boolean;
  variant?: "default" | "outline";
  showNote?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);

  const cta = label ?? `Preorder — $${site.preorderPriceUSD}`;

  return (
    <div className={cn("w-full max-w-md", className)}>
      <Button
        type="button"
        size={size}
        variant={variant}
        disabled={pending}
        className="h-12 w-full rounded-full px-8 text-base font-semibold sm:w-auto"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const res = await openCheckout(box.slug, gift);
              if (res.ok) {
                window.location.href = res.url;
                return;
              }
              setError(res.message);
              if (res.needsEmail && showFallbackEmail) setShowEmail(true);
            } catch (err) {
              console.error(err);
              setError("Couldn’t reach checkout — try again or hold your spot below.");
              if (showFallbackEmail) setShowEmail(true);
            }
          });
        }}
      >
        {pending ? "Opening secure checkout…" : cta}
      </Button>
      {showNote && (
        <p className="mt-2 text-xs text-ink-soft">
          One-time · free shipping · refundable before ship · only{" "}
          {site.firstRunPerBox} of each box
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-terracotta-deep" role="alert">
          {error}
        </p>
      )}
      {showEmail && (
        <div className="mt-4 rounded-2xl border border-border bg-cream-card p-4">
          <p className="mb-3 text-sm text-ink-soft">
            Hold your founding spot for the{" "}
            <strong className="text-ink">{box.shortName}</strong> box — we’ll email you
            the moment payment is confirmed live.
          </p>
          <WaitlistForm
            boxInterest={box.slug}
            source="checkout_fallback"
            cta="Hold my spot"
            compact
          />
        </div>
      )}
    </div>
  );
}
