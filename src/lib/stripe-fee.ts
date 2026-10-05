import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

/**
 * The real Stripe fee and net for a Checkout Session, from its charge's balance transaction.
 * null when Stripe isn't configured or the balance transaction isn't settled yet.
 */
export async function stripeFeeForSession(sessionId: string): Promise<{ feeCents: number; netCents: number } | null> {
  const stripe = getStripe();
  if (!stripe) return null;
  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.latest_charge.balance_transaction"],
    });
    const pi = s.payment_intent as Stripe.PaymentIntent | null;
    const charge = pi?.latest_charge as Stripe.Charge | null | undefined;
    const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null | undefined;
    if (!bt || typeof bt !== "object") return null;
    return { feeCents: bt.fee, netCents: bt.net };
  } catch (e) {
    console.error("stripe fee lookup failed", e instanceof Error ? e.message : e);
    return null;
  }
}
