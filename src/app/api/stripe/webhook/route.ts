import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { boxes } from "@/lib/box";
import { env } from "@/lib/env";
import { sendCartReminder, sendOrderEmails } from "@/lib/resend";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Stripe → Keniya. Handles:
 * - checkout.session.completed / async_payment_succeeded (paid): save the order, email the
 *   customer a confirmation and the founder a packing alert.
 * - checkout.session.expired: one "you left your box" reminder with Stripe's recovery link.
 * Emails are idempotent per session (see sendOnce), so Stripe retries are safe.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    console.error("stripe webhook: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET missing");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await req.text(),
      req.headers.get("stripe-signature") ?? "",
      secret,
    );
  } catch (err) {
    console.error("stripe webhook: bad signature", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const box = boxes.find((b) => b.slug === session.metadata?.box_slug);
  const email = session.customer_details?.email ?? session.customer_email ?? null;

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (session.payment_status !== "paid" || !box || !email) break;
      const ship = session.collected_information?.shipping_details;
      const a = ship?.address;
      const giftNote =
        session.custom_fields.find((f) => f.key === "gift_note")?.text?.value?.trim() || undefined;

      const { error } = await getSupabaseAdmin()
        .from("preorders")
        .insert({
          stripe_event_id: event.id,
          stripe_session_id: session.id,
          email,
          customer_name: session.customer_details?.name ?? ship?.name ?? null,
          amount_total: session.amount_total ?? 0,
          currency: session.currency ?? "usd",
          shipping: ship ?? null,
          box_slug: box.slug,
          status: "paid",
        });
      // 23505 = already saved (Stripe retry); anything else is logged but still emails —
      // the founder alert below is the backup record.
      if (error && error.code !== "23505") console.error("preorder insert failed", error);

      await sendOrderEmails(
        email,
        {
          box,
          firstName: (session.customer_details?.name ?? "").split(" ")[0] || undefined,
          amountCents: session.amount_total ?? 0,
          orderRef: session.id.slice(-8).toUpperCase(),
          gift: session.metadata?.gift === "yes",
          giftNote,
          shipTo: a
            ? {
                name: ship?.name ?? undefined,
                lines: [
                  [a.line1, a.line2].filter(Boolean).join(" "),
                  [a.city, a.state, a.postal_code].filter(Boolean).join(" "),
                ].filter(Boolean),
              }
            : undefined,
        },
        session.id,
      );
      break;
    }

    case "checkout.session.expired": {
      const recoveryUrl = session.after_expiration?.recovery?.url;
      if (!box || !email || !recoveryUrl) break;
      if (session.consent?.promotions === "opt_out") break;
      // Skip if they came back and bought anyway.
      const { data: bought } = await getSupabaseAdmin()
        .from("preorders")
        .select("id")
        .eq("email", email)
        .limit(1);
      if (bought?.length) break;
      await sendCartReminder(email, box, recoveryUrl, session.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
