import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { boxes } from "@/lib/box";
import { loadCommerceState } from "@/lib/commerce";
import { sendClubEmail } from "@/lib/resend";
import { dateLabel, invoicePaymentIntent, invoiceSubscriptionId, periodEnd, syncSubscription, usd } from "@/lib/subscriptions";

const boxName = (slug: string | undefined) => boxes.find((b) => b.slug === slug)?.name ?? "Keniya box";

/**
 * Snack Club events after the first checkout. Returns false for events it doesn't own.
 * - invoice.created (renewal): if the box can't be filled to its standards, the draft is
 *   finalized without collection and voided, so the subscriber is never charged for it.
 * - invoice.paid (renewal): a new admitted order to pack, plus a short email.
 * - invoice.upcoming: a reminder before the charge, with the skip/pause/cancel link.
 * - customer.subscription.updated/deleted: mirror the state; email on cancellation.
 * Every write and email is idempotent, so Stripe's retries are safe.
 */
export async function handleClubEvent(event: Stripe.Event, stripe: Stripe, db: SupabaseClient): Promise<boolean> {
  switch (event.type) {
    case "invoice.created": {
      const inv = event.data.object;
      if (inv.billing_reason !== "subscription_cycle" || inv.status !== "draft" || !inv.id) return true;
      const subId = invoiceSubscriptionId(inv);
      if (!subId) return true;
      const sub = await stripe.subscriptions.retrieve(subId);
      // A skipped or paused month is already voided by Stripe's pause_collection.
      if (sub.pause_collection) return true;
      const slug = sub.metadata.box_slug;
      const { sales } = await loadCommerceState();
      if (slug && sales[slug as keyof typeof sales]?.clinicianApproved) return true;
      await holdRenewal(stripe, inv.id);
      const email = inv.customer_email;
      if (email) await sendClubEmail(email, inv.id, { kind: "held", boxName: boxName(slug) });
      return true;
    }

    case "invoice.paid": {
      const inv = event.data.object;
      if (inv.billing_reason !== "subscription_cycle" || !inv.id) return true;
      const subId = invoiceSubscriptionId(inv);
      if (!subId) return true;
      const sub = await stripe.subscriptions.retrieve(subId);
      const { data: club, error: clubError } = await db.from("subscriptions").select("email, shipping, box_slug").eq("stripe_subscription_id", subId).maybeSingle();
      if (clubError) throw new Error(clubError.message);
      const email = club?.email ?? inv.customer_email ?? "";
      const { error } = await db.rpc("save_renewal_order", {
        p_order: {
          stripe_event_id: event.id,
          stripe_invoice_id: inv.id,
          stripe_subscription_id: subId,
          stripe_payment_intent_id: await invoicePaymentIntent(stripe, inv.id),
          email,
          customer_name: inv.customer_name,
          amount_total: inv.amount_paid,
          currency: inv.currency,
          shipping: club?.shipping ?? null,
          box_slug: club?.box_slug ?? sub.metadata.box_slug,
        },
      });
      if (error) throw new Error(`Renewal persistence failed: ${error.message}`);
      await syncSubscription(db, sub);
      if (email) await sendClubEmail(email, inv.id, { kind: "renewed", boxName: boxName(sub.metadata.box_slug), amountLabel: usd(inv.amount_paid) });
      return true;
    }

    case "invoice.upcoming": {
      const inv = event.data.object;
      const subId = invoiceSubscriptionId(inv);
      if (!subId || !inv.customer_email) return true;
      const sub = await stripe.subscriptions.retrieve(subId);
      if (sub.pause_collection || sub.cancel_at_period_end || sub.status !== "active") return true;
      const when = inv.next_payment_attempt ?? periodEnd(sub);
      await sendClubEmail(inv.customer_email, `${subId}-${when}`, {
        kind: "upcoming",
        boxName: boxName(sub.metadata.box_slug),
        amountLabel: usd(inv.amount_due),
        dateLabel: dateLabel(when),
      });
      return true;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      if (!sub.metadata?.box_slug) return true;
      await syncSubscription(db, sub);
      // Confirm a cancellation the moment it's made (at period end), and again if it ends now.
      const previous = (event.data as { previous_attributes?: Partial<Stripe.Subscription> }).previous_attributes;
      const scheduled = event.type === "customer.subscription.updated" && sub.cancel_at_period_end && previous?.cancel_at_period_end === false;
      if (scheduled || event.type === "customer.subscription.deleted") {
        const { data } = await db.from("subscriptions").select("email").eq("stripe_subscription_id", sub.id).maybeSingle();
        if (data?.email)
          await sendClubEmail(data.email, scheduled ? `${sub.id}-scheduled` : sub.id, {
            kind: "cancelled",
            boxName: boxName(sub.metadata.box_slug),
            endsLabel: scheduled ? dateLabel(periodEnd(sub)) : null,
          });
      }
      return true;
    }

    default:
      return false;
  }
}

/** Never collect a renewal we can't fill: finalize with collection off, then void. Retry-safe. */
async function holdRenewal(stripe: Stripe, invoiceId: string) {
  const current = await stripe.invoices.retrieve(invoiceId);
  if (current.status === "void") return;
  if (current.status === "draft") {
    await stripe.invoices.update(invoiceId, { auto_advance: false });
    await stripe.invoices.finalizeInvoice(invoiceId, { auto_advance: false });
  }
  const finalized = await stripe.invoices.retrieve(invoiceId);
  if (finalized.status === "open") await stripe.invoices.voidInvoice(invoiceId);
  else if (finalized.status === "paid") throw new Error(`Renewal ${invoiceId} was paid before it could be held`);
}
