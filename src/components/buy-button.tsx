"use client";

import { useRef, useState, useTransition } from "react";
import { startCheckout, type CheckoutInput } from "@/actions/checkout";
import { Button } from "@/components/ui/button";
import { WaitlistForm } from "@/components/waitlist-form";
import { site } from "@/lib/site";
import type { Box } from "@/lib/box";
import { cn } from "@/lib/utils";

async function openCheckout(input: CheckoutInput) {
  // Prefer server action; fall back to API route if the action throws
  try {
    return await startCheckout(input);
  } catch (err) {
    console.error("startCheckout action threw", err);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
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
  prefill,
}: {
  box: Box;
  size?: "default" | "lg" | "sm";
  className?: string;
  label?: string;
  showFallbackEmail?: boolean;
  gift?: boolean;
  variant?: "default" | "outline";
  showNote?: boolean;
  /** Quiz answers to prefill at checkout. */
  prefill?: Pick<CheckoutInput, "craving" | "avoid">;
}) {
  const requestKey = useRef<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);

  if (!box.sale?.available) return <div className={cn("w-full max-w-md", className)}>
    <WaitlistForm boxInterest={box.slug} source="box_waitlist" cta="Join the waitlist" compact />
  </div>;

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
              const res = await openCheckout({ boxSlug: box.slug, gift, ...prefill, requestKey: (requestKey.current ??= crypto.randomUUID()) });
              if (res.ok) {
                window.location.href = res.url;
                return;
              }
              if (res.code === "expired_session" || res.code === "stale_request") requestKey.current = null;
              setError(res.message);
              if (res.needsEmail && showFallbackEmail) setShowEmail(true);
            } catch (err) {
              console.error(err);
              setError("Couldn’t reach checkout — try again or join the waitlist below.");
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
          {box.founding} founding {box.shortName} boxes
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
            Join the list for the{" "}
            <strong className="text-ink">{box.shortName}</strong> box — we’ll email you
            when preorders open.
          </p>
          <WaitlistForm
            boxInterest={box.slug}
            source="checkout_fallback"
            cta="Join the waitlist"
            compact
          />
        </div>
      )}
    </div>
  );
}
