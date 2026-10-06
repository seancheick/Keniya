import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { boxes, cravings } from "@/lib/box";
import { publicBoxes } from "@/lib/public-rules";
import { env } from "@/lib/env";
import { sendCartReminder, sendOrderEmails } from "@/lib/resend";
import { getStripe } from "@/lib/stripe";
import { stripeFeeForSession } from "@/lib/stripe-fee";
import { getSupabaseAdminStrict } from "@/lib/supabase";
import { loadCommerceState } from "@/lib/commerce";

/**
 * Stripe → Keniya. Handles:
 * - checkout.session.completed / async_payment_succeeded (paid): save the order, email the
 *   customer a confirmation and the founder a packing alert.
 * - checkout.session.expired: one box-page reminder when fresh preorder admission is available.
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

  try {
  const db = getSupabaseAdminStrict();
  if (["charge.refunded", "refund.created", "refund.updated", "refund.failed", "charge.dispute.created", "charge.dispute.updated", "charge.dispute.closed"].includes(event.type)) {
    const object = event.data.object as unknown as { object: string; id: string; charge?: string | Stripe.Charge | null };
    const chargeId = object.object === "charge" ? object.id : typeof object.charge === "string" ? object.charge : object.charge?.id;
    if (!chargeId) throw new Error("Financial event is missing its charge");
    const charge = await stripe.charges.retrieve(chargeId);
    const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    if (!pi) throw new Error("Charge is missing PaymentIntent");
    // Legacy orders predate PaymentIntent persistence; bind them through Stripe's own session lookup.
    const { data: known, error: lookupError } = await db.from("preorders").select("id").eq("stripe_payment_intent_id", pi).limit(1);
    if (lookupError) throw new Error(lookupError.message);
    if (!known?.length) {
      const sessions = await stripe.checkout.sessions.list({ payment_intent: pi, limit: 100 });
      const local = sessions.data.filter(s => s.metadata?.box_slug);
      if (!local.length) return NextResponse.json({ received: true });
      const { error: bindError } = await db.from("preorders").update({ stripe_payment_intent_id: pi }).in("stripe_session_id", local.map(s => s.id));
      if (bindError) throw new Error(bindError.message);
    }
    const { data: revision, error: observationError } = await db.rpc("begin_financial_observation", { p_payment_intent: pi });
    if (observationError || !Number.isSafeInteger(revision)) throw new Error(observationError?.message ?? "Invalid financial revision");
    // Fetch again after claiming the observation, so concurrent handlers are fenced.
    const currentCharge = await stripe.charges.retrieve(chargeId);
    const disputes = await stripe.disputes.list({ payment_intent: pi, limit: 100 });
    if (disputes.has_more) throw new Error("Incomplete dispute state; financial observation remains pending");
    const blocked = disputes.data.find(d => d.status !== "won" && d.status !== "warning_closed");
    const status = blocked ? "disputed" : currentCharge.refunded ? "refunded" : currentCharge.amount_refunded > 0 ? "partially_refunded" : "paid";
    // Read current Stripe state, so old or repeated webhook deliveries cannot undo refunds.
    const { error } = await db.rpc("finish_financial_observation", { p_payment_intent: pi, p_revision: revision, p_status: status, p_refunded: currentCharge.amount_refunded, p_dispute: blocked?.status ?? null });
    if (error) throw new Error(error.message);
    return NextResponse.json({ received: true });
  }
  if (!event.type.startsWith("checkout.session.")) return NextResponse.json({ received: true });
  const session = event.data.object as Stripe.Checkout.Session;
  // Emails list what goes in, so they use the same live-recipe composition as the site.
  const box = boxes.find((b) => b.slug === session.metadata?.box_slug);
  const email = session.customer_details?.email ?? session.customer_email ?? null;

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (session.payment_status !== "paid") break;
      const ship = session.collected_information?.shipping_details;
      const a = ship?.address;
      const giftNote =
        session.custom_fields.find((f) => f.key === "gift_note")?.text?.value?.trim() || undefined;
      const avoid =
        session.custom_fields.find((f) => f.key === "avoid")?.text?.value?.trim() || undefined;
      const cravingValue = session.custom_fields.find((f) => f.key === "craving")?.dropdown?.value;
      const craving = cravings.find((c) => c.value === cravingValue)?.label;

      const row = {
        stripe_event_id: event.id,
        stripe_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
        email,
        customer_name: session.customer_details?.name ?? ship?.name ?? null,
        amount_total: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
        shipping: ship ?? null,
        box_slug: box?.slug ?? session.metadata?.box_slug ?? null,
        avoid: avoid ?? null,
        craving: craving ?? null,
        status: "paid",
      };
      const reservationKey = session.metadata?.reservation_key;
      const validKey = reservationKey && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reservationKey) ? reservationKey : null;
      const { data: admitted, error } = await db.rpc("save_paid_order", { p_order: row, p_key: validKey });
      if (error) throw new Error(`Order persistence failed: ${error.message}`);

      if (admitted !== true) {
        console.error("Paid session requires admission review", session.id);
        return NextResponse.json({ received: true, admission: "hold" });
      }

      if (!box || !email) throw new Error("Admitted checkout is missing its box or customer email");

      // Actual Stripe fee for per-order profit in the admin (best effort; the admin retries
      // when it plans the shipment if the balance transaction wasn't ready yet).
      const fee = await stripeFeeForSession(session.id);
      if (fee) {
        const { error: feeError } = await getSupabaseAdminStrict()
          .from("preorders")
          .update({ stripe_fee_cents: fee.feeCents, amount_net_cents: fee.netCents })
          .eq("stripe_session_id", session.id);
        if (feeError) console.error("preorder fee update failed", feeError.message);
      }

      const { count } = await getSupabaseAdminStrict()
        .from("preorders")
        .select("id", { count: "exact", head: true })
        .eq("box_slug", box.slug)
        .eq("status", "paid");

      // Catalog reads can fail without losing the durable order. Stripe retries email work.
      const state = await loadCommerceState();
      const emailBox = publicBoxes(state.rules).find(b => b.slug === box.slug)!;
      const sale = state.sales[box.slug];
      await sendOrderEmails(
        email,
        {
          box: { ...emailBox, founding: sale.founding, sale: { available: sale.available, clinicianApproved: sale.clinicianApproved, priceCents: sale.priceCents, remaining: sale.remaining, state: sale.available ? "preorder" : "waitlist" } },
          firstName: (session.customer_details?.name ?? "").split(" ")[0] || undefined,
          amountCents: session.amount_total ?? 0,
          orderRef: session.id.slice(-8).toUpperCase(),
          gift: session.metadata?.gift === "yes",
          giftNote,
          avoid,
          craving,
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
        {
          customerName: session.customer_details?.name ?? undefined,
          soldCount: count ?? null,
          paymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : undefined,
        },
        session.id,
      );
      break;
    }

    case "checkout.session.expired": {
      const current = await stripe.checkout.sessions.retrieve(session.id);
      if (current.status !== "expired" || current.payment_status === "paid") break;
      const release = db.from("checkout_reservations").update({ released: true }).eq("box_slug", session.metadata?.box_slug ?? "").eq("consumed", false);
      const { error: expiryError } = session.metadata?.reservation_key
        ? await release.eq("request_key", session.metadata.reservation_key).or(`session_id.is.null,session_id.eq.${session.id}`)
        : await release.eq("session_id", session.id);
      if (expiryError) throw new Error(expiryError.message);
      if (!box || !email) break;
      if (session.consent?.promotions === "opt_out") break;
      // Skip if they came back and bought anyway.
      const { data: bought } = await getSupabaseAdminStrict()
        .from("preorders")
        .select("id")
        .eq("email", email)
        .limit(1);
      if (bought?.length) break;
      const state = await loadCommerceState();
      const emailBox = publicBoxes(state.rules).find(b => b.slug === box.slug)!;
      if (!state.sales[box.slug].available) break;
      await sendCartReminder(email, { ...emailBox, founding: state.sales[box.slug].founding }, session.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
  } catch (err) {
    console.error("stripe webhook persistence failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "retry required" }, { status: 500 });
  }
}
