import "server-only";
import type Stripe from "stripe";

/**
 * Vendor and partner promo codes: a Stripe coupon (percent off, once) behind a customer-facing
 * promotion code, typed at checkout on one-time boxes. Stripe holds the codes and their counts;
 * orders record which code discounted them (preorders.promo_code) for vendor reporting.
 */
export type PromoRow = {
  id: string;
  code: string;
  vendor: string;
  percentOff: number | null;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: number | null;
  active: boolean;
};

export type PromoInput = { code: string; vendor: string; percentOff: number; maxRedemptions: number | null; expiresAt: number | null };

export async function listPromoCodes(stripe: Stripe): Promise<PromoRow[]> {
  const list = await stripe.promotionCodes.list({ limit: 100, expand: ["data.promotion.coupon"] });
  return list.data.map((p) => {
    const coupon = typeof p.promotion.coupon === "object" ? p.promotion.coupon : null;
    return {
      id: p.id,
      code: p.code,
      vendor: p.metadata?.vendor ?? coupon?.metadata?.vendor ?? "",
      percentOff: coupon?.percent_off ?? null,
      timesRedeemed: p.times_redeemed,
      maxRedemptions: p.max_redemptions,
      expiresAt: p.expires_at,
      active: p.active,
    };
  });
}

export async function createPromoCode(stripe: Stripe, input: PromoInput): Promise<string> {
  const coupon = await stripe.coupons.create({
    percent_off: input.percentOff,
    duration: "once",
    name: `${input.code}: ${input.percentOff}% off${input.vendor ? ` (${input.vendor})` : ""}`.slice(0, 40),
    metadata: { keniya_offer: "promo", vendor: input.vendor },
  });
  const promo = await stripe.promotionCodes.create({
    promotion: { type: "coupon", coupon: coupon.id },
    code: input.code,
    ...(input.maxRedemptions ? { max_redemptions: input.maxRedemptions } : {}),
    ...(input.expiresAt ? { expires_at: input.expiresAt } : {}),
    metadata: { vendor: input.vendor },
  });
  return promo.id;
}

/** The code (or offer) that discounted a paid checkout, for the order record. */
export async function sessionPromoCode(stripe: Stripe, session: Pick<Stripe.Checkout.Session, "discounts" | "metadata">): Promise<string | null> {
  if (session.metadata?.offer) return session.metadata.offer;
  const promo = session.discounts?.find((d) => d.promotion_code)?.promotion_code;
  if (!promo) return null;
  if (typeof promo === "object") return promo.code;
  return (await stripe.promotionCodes.retrieve(promo)).code;
}
