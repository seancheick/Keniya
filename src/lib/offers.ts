import "server-only";
import type Stripe from "stripe";
import type { Settings } from "@/lib/admin/types";

type Welcome = Settings["offers"]["welcome"];
export type WelcomeOffer = { code: string; percentOff: number; couponId: string };

/**
 * Stripe coupon terms can't change after creation, so the id carries them: a new percent or
 * cap in Settings is a new coupon, and the old one simply stops being applied.
 */
export function welcomeCouponId(w: Welcome): string {
  return `keniya-${w.code.toLowerCase()}-${w.percentOff}pct-${w.limit ?? "nocap"}`;
}

/** What the buyer pays after a percent-off coupon (Stripe rounds the discount to the cent). */
export function discountedCents(priceCents: number, percentOff: number): number {
  return priceCents - Math.round((priceCents * percentOff) / 100);
}

const isMissing = (err: unknown) => (err as { code?: string } | null)?.code === "resource_missing";

/**
 * The welcome offer the site may advertise right now: switched on in Settings and its coupon
 * not used up. A coupon that doesn't exist yet is fine; checkout creates it on first use.
 */
export async function loadWelcomeOffer(stripe: Stripe | null, settings: Settings): Promise<WelcomeOffer | null> {
  const w = settings.offers.welcome;
  if (!w.enabled || !stripe) return null;
  const couponId = welcomeCouponId(w);
  try {
    const coupon = await stripe.coupons.retrieve(couponId);
    return coupon.valid ? { code: w.code, percentOff: w.percentOff, couponId } : null;
  } catch (err) {
    if (isMissing(err)) return { code: w.code, percentOff: w.percentOff, couponId };
    throw err;
  }
}

/** Creates the welcome coupon the first time a buyer qualifies (idempotent on its id). */
export async function ensureWelcomeCoupon(stripe: Stripe, w: Welcome): Promise<string> {
  const id = welcomeCouponId(w);
  try {
    const coupon = await stripe.coupons.retrieve(id);
    if (!coupon.valid) throw new Error("Welcome coupon is no longer valid");
    return id;
  } catch (err) {
    if (!isMissing(err)) throw err;
  }
  await stripe.coupons.create(
    {
      id,
      percent_off: w.percentOff,
      duration: "once",
      name: `${w.code}: ${w.percentOff}% off your first box`,
      ...(w.limit ? { max_redemptions: w.limit } : {}),
      metadata: { keniya_offer: "welcome" },
    },
    { idempotencyKey: `coupon:${id}` },
  );
  return id;
}

/** Escape LIKE wildcards so an email matches itself, case-insensitively, and nothing else. */
export const likeExact = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
