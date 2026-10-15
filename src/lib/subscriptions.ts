import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { likeExact } from "@/lib/offers";

/**
 * The Monthly Snack Club's Stripe ↔ Keniya plumbing. Stripe owns billing (the subscription,
 * its invoices, pausing); Keniya mirrors what it needs to pack and ship in `subscriptions`.
 */

/** When the current period ends (= the next renewal), from the subscription's items. */
export function periodEnd(sub: Stripe.Subscription): number | null {
  const ends = sub.items.data.map((i) => i.current_period_end).filter((n): n is number => typeof n === "number");
  return ends.length ? Math.min(...ends) : null;
}

export function invoiceSubscriptionId(inv: Pick<Stripe.Invoice, "parent">): string | null {
  const s = inv.parent?.subscription_details?.subscription;
  return typeof s === "string" ? s : (s?.id ?? null);
}

/** The PaymentIntent that paid an invoice, so refunds and disputes map back to the order. */
export async function invoicePaymentIntent(stripe: Stripe, invoiceId: string): Promise<string | null> {
  const inv = await stripe.invoices.retrieve(invoiceId, { expand: ["payments"] });
  const payments = inv.payments?.data ?? [];
  const pi = (payments.find((p) => p.status === "paid") ?? payments[0])?.payment?.payment_intent;
  return typeof pi === "string" ? pi : (pi?.id ?? null);
}

const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);

function mirror(sub: Stripe.Subscription) {
  return {
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    box_slug: sub.metadata.box_slug ?? "",
    status: sub.status,
    paused: sub.pause_collection !== null,
    resumes_at: iso(sub.pause_collection?.resumes_at),
    cancel_at_period_end: sub.cancel_at_period_end,
    current_period_end: iso(periodEnd(sub)),
    price_cents: sub.items.data[0]?.price.unit_amount ?? 0,
    updated_at: new Date().toISOString(),
  };
}

/** First sight of a subscription (its checkout completed): the full row, with who and where. */
export async function saveSubscription(db: SupabaseClient, sub: Stripe.Subscription, email: string, shipping: unknown) {
  const { error } = await db.from("subscriptions").upsert({ ...mirror(sub), email, shipping }, { onConflict: "stripe_subscription_id" });
  if (error) throw new Error(`Subscription save failed: ${error.message}`);
}

/**
 * Later changes (pause, skip, cancel, renewals). Update only: a row is created by its
 * checkout, so an update event that arrives first changes nothing and the checkout handler
 * then writes the current state.
 */
export async function syncSubscription(db: SupabaseClient, sub: Stripe.Subscription) {
  const { error } = await db.from("subscriptions").update(mirror(sub)).eq("stripe_subscription_id", sub.id);
  if (error) throw new Error(`Subscription sync failed: ${error.message}`);
}

export type ClubRow = {
  stripe_subscription_id: string;
  email: string;
  box_slug: string;
  status: string;
  paused: boolean;
  resumes_at: string | null;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  price_cents: number;
  shipping: { name?: string; address?: Record<string, string | null> } | null;
};

const CLUB_COLUMNS = "stripe_subscription_id, email, box_slug, status, paused, resumes_at, cancel_at_period_end, current_period_end, price_cents, shipping";

/** A subscriber's subscriptions, newest first (who gets a manage link). */
export async function subscriptionsFor(db: SupabaseClient, email: string): Promise<ClubRow[]> {
  const { data, error } = await db.from("subscriptions").select(CLUB_COLUMNS).ilike("email", likeExact(email)).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ClubRow[];
}

/** The subscriptions a manage link names (the manage page and its actions). */
export async function subscriptionsById(db: SupabaseClient, ids: string[]): Promise<ClubRow[]> {
  const { data, error } = await db.from("subscriptions").select(CLUB_COLUMNS).in("stripe_subscription_id", ids).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ClubRow[];
}

export const usd = (cents: number) => `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
export const dateLabel = (isoOrUnix: string | number | null) => {
  if (isoOrUnix === null) return "";
  const d = typeof isoOrUnix === "number" ? new Date(isoOrUnix * 1000) : new Date(isoOrUnix);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/New_York" });
};
