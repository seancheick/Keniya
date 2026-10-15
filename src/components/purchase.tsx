"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { BuyButton } from "@/components/buy-button";
import type { PublicBox } from "@/lib/box";
import type { PublicOffers } from "@/lib/public-sales";
import { site } from "@/lib/site";
import { openWelcome, useWelcome, writeWelcome } from "@/lib/welcome-client";
import { cn } from "@/lib/utils";

const money = (cents: number) => (cents % 100 ? `$${(cents / 100).toFixed(2)}` : `$${cents / 100}`);
const ships = site.shipDate.replace(/, \d{4}$/, "");

/**
 * Everything between "I want this box" and Stripe: price, who it's for, buy once or the
 * monthly Snack Club (only when it's on), the first-box offer, and the button. One-time is
 * always the default, and gifts are always one-time.
 */
export function Purchase({
  box,
  offers,
  status,
  gift: giftProp,
  onGiftChange,
}: {
  box: PublicBox;
  offers: PublicOffers;
  status: string;
  /** Controlled by the shop (so #gift links work); box pages leave it uncontrolled. */
  gift?: boolean;
  onGiftChange?: (gift: boolean) => void;
}) {
  const [ownGift, setOwnGift] = useState(false);
  const gift = giftProp ?? ownGift;
  const setGift = onGiftChange ?? setOwnGift;
  const [plan, setPlan] = useState<"once" | "monthly">("once");
  const welcome = useWelcome();

  const list = site.preorderPriceUSD * 100;
  const sub = gift ? null : offers.subscription;
  const monthly = plan === "monthly" && sub !== null;
  const claimed = !monthly && offers.welcome && welcome?.status === "claimed" ? welcome : null;
  const price = monthly ? sub.priceCents : claimed ? claimed.priceCents : list;
  const open = Boolean(box.sale?.available);

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-display text-5xl font-extrabold leading-none tracking-tight text-ink">
          {money(price)}
          {monthly && <span className="text-2xl">/mo</span>}
        </p>
        {price !== list && <s className="font-display text-2xl font-bold text-ink-soft">${site.preorderPriceUSD}</s>}
        <p className="text-sm text-ink-soft">
          {site.snackCount} snacks · {site.freeShippingLabel.toLowerCase()} · {monthly ? "every month" : "one-time"}
        </p>
      </div>
      <p className="paper mt-4 rounded-[3px] bg-tissue px-3 py-2 text-sm font-semibold text-tissue-ink">{status}</p>

      <div
        id={giftProp === undefined ? undefined : "gift"}
        role="radiogroup"
        aria-label="Who is it for?"
        className="mt-5 grid scroll-mt-24 grid-cols-2 gap-1 rounded-full border-2 border-ink p-1"
      >
        {[
          { value: false, label: "For me" },
          { value: true, label: "It's a gift" },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            role="radio"
            aria-checked={gift === opt.value}
            onClick={() => setGift(opt.value)}
            className={cn(
              "min-h-11 rounded-full py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              gift === opt.value ? "bg-ink text-cream" : "text-ink-soft hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {gift && (
        <p className="mt-3 text-sm text-ink-soft">
          Enter their address at checkout and write a message. We print it on a note inside their
          box, and the receipt comes to you. Gifts are always one-time.
        </p>
      )}

      {sub && open && (
        <div role="radiogroup" aria-label="How often?" className="mt-4 grid gap-2">
          {[
            { value: "once" as const, title: "Buy once", price: `$${site.preorderPriceUSD}`, note: "One box, no renewal" },
            { value: "monthly" as const, title: "Monthly Snack Club", price: `${money(sub.priceCents)}/mo`, note: `Save ${sub.savingsPct}% · skip, pause or cancel online` },
          ].map((o) => {
            const on = plan === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPlan(o.value)}
                className={cn(
                  "flex min-h-14 items-center justify-between gap-3 rounded-[6px] border-2 px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  on ? "border-ink bg-cream" : "border-ink/15 hover:border-ink/40",
                )}
              >
                <span className="flex items-center gap-3">
                  <span aria-hidden className={cn("grid size-5 place-items-center rounded-full border-2", on ? "border-ink bg-ink text-cream" : "border-ink/30")}>
                    {on && <CheckIcon className="size-3" strokeWidth={3.5} />}
                  </span>
                  <span>
                    <span className="block font-semibold text-ink">{o.title}</span>
                    <span className="block text-xs text-ink-soft">{o.note}</span>
                  </span>
                </span>
                <span className="font-display text-lg font-extrabold text-ink">{o.price}</span>
              </button>
            );
          })}
        </div>
      )}

      {monthly && (
        // Recurring terms stated before checkout, next to the button (ROSCA: clear and conspicuous).
        <p className="mt-3 rounded-[4px] bg-cream-deep px-3 py-2.5 text-xs leading-relaxed text-ink">
          <strong>{money(sub.priceCents)} today, then {money(sub.priceCents)} every month</strong> on the same date until you
          cancel. Skip a month, pause or cancel online anytime before your renewal date. Your first box ships {ships}; each
          renewal ships that month. If we can&rsquo;t fill a box to its standards, we hold that month and don&rsquo;t charge you.
        </p>
      )}

      {open && offers.welcome && !monthly && (
        claimed ? (
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[4px] border-2 border-dashed border-ink bg-butter px-3 py-2 text-sm text-ink">
            <CheckIcon className="size-4 shrink-0" strokeWidth={3} aria-hidden />
            <strong className="font-label tracking-wide">{claimed.code}</strong> applied: first box {money(claimed.priceCents)} for{" "}
            <span className="break-all font-semibold">{claimed.email}</span>
            <button type="button" onClick={() => writeWelcome(null)} className="ml-auto text-xs font-semibold underline underline-offset-2">
              Remove
            </button>
          </p>
        ) : (
          welcome?.status !== "ineligible" && (
            <button type="button" onClick={openWelcome} className="mt-4 text-sm font-semibold text-ink underline decoration-coral decoration-2 underline-offset-4 hover:decoration-ink">
              First order? Get {offers.welcome.percentOff}% off
            </button>
          )
        )
      )}

      <div className="mt-5">
        <BuyButton
          key={`${box.slug}-${gift}-${plan}-${claimed?.email ?? ""}`}
          box={box}
          gift={gift}
          plan={monthly ? "monthly" : "once"}
          welcomeEmail={claimed?.email}
          onOfferRejected={() => writeWelcome({ status: "ineligible" })}
          showNote={false}
          className="max-w-none [&>button]:w-full"
          label={
            gift
              ? `Send the ${box.shortName} box, ${money(price)}`
              : monthly
                ? `Join the Snack Club, ${money(price)}/mo`
                : `Order the ${box.shortName} box, ${money(price)}`
          }
        />
      </div>
      {!monthly && <p className="mt-3 text-center text-sm font-semibold text-ink">No subscription. No surprise renewal.</p>}
    </div>
  );
}
