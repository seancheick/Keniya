import Stripe from "stripe";

let stripe: Stripe | null | undefined;

function secretKey(): string {
  return (process.env.STRIPE_SECRET_KEY ?? "").trim();
}

export function isCheckoutConfigured(): boolean {
  const k = secretKey();
  return k.startsWith("sk_live_") || k.startsWith("sk_test_");
}

export function getStripe(): Stripe | null {
  if (stripe !== undefined) return stripe;
  const key = secretKey();
  if (!key.startsWith("sk_live_") && !key.startsWith("sk_test_")) {
    stripe = null;
    return null;
  }
  stripe = new Stripe(key);
  return stripe;
}

/** Map box slug → Stripe Price ID (one-time). Create products in Stripe Dashboard. */
export function priceIdForBox(slug: string): string | null {
  const map: Record<string, string | undefined> = {
    pregnancy_comfort: process.env.STRIPE_PRICE_PREGNANCY_BOX,
    blood_sugar: process.env.STRIPE_PRICE_BLOOD_SUGAR_BOX,
    heart: process.env.STRIPE_PRICE_HEART_BOX,
    gestational_diabetes: process.env.STRIPE_PRICE_GESTATIONAL_DIABETES_BOX,
    glp1: process.env.STRIPE_PRICE_GLP1_BOX,
    postpartum: process.env.STRIPE_PRICE_POSTPARTUM_BOX,
  };
  const id = (map[slug] ?? "").trim();
  return id || null;
}
