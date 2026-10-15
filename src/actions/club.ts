"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { getSupabaseAdminStrict } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { sendClubEmail } from "@/lib/resend";
import { signClubLink, verifyClubLink } from "@/lib/club-link";
import { periodEnd, subscriptionsById, subscriptionsFor, syncSubscription } from "@/lib/subscriptions";
import { site } from "@/lib/site";
import { CANCEL_REASONS, SKIP_CHOICES, skipUntil, type SkipMonths } from "@/lib/club-shared";



/**
 * Sends a 24-hour manage link to an address with a Snack Club. The answer is the same either
 * way, so the form can't be used to find out who subscribes.
 */
export async function requestClubLink(input: { email: string }): Promise<{ ok: boolean; message: string }> {
  const parsed = z.string().trim().toLowerCase().pipe(z.email().max(255)).safeParse(input.email);
  if (!parsed.success) return { ok: false, message: "That email doesn't look right. Mind checking it?" };
  const email = parsed.data;
  const db = getSupabaseAdminStrict();
  const h = await headers();
  const ip = h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = await db.rpc("allow_public_attempt", { p_key: `club-link:${createHash("sha256").update(`${ip}:${email}`).digest("hex")}`, p_limit: 3, p_window_seconds: 900 });
  if (limited.error || !limited.data) return { ok: false, message: "Too many tries. Please wait a few minutes." };
  const done = { ok: true, message: `If ${email} has a Snack Club, a link is on its way. It works for 24 hours.` };
  const subs = await subscriptionsFor(db, email);
  if (!subs.length) return done;
  const token = signClubLink(subs.map((s) => s.stripe_subscription_id));
  if (!token) return { ok: false, message: `Manage links are offline. Email ${site.email} and we'll help right away.` };
  const url = `${site.url.replace(/\/$/, "")}/club?t=${encodeURIComponent(token)}`;
  await sendClubEmail(email, `${createHash("sha256").update(email).digest("hex").slice(0, 16)}-${Math.floor(Date.now() / 60_000)}`, { kind: "link", url });
  return done;
}

const addressSchema = z.object({
  name: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().regex(/^[A-Za-z]{2}$/, "Use the two-letter state code"),
  postal_code: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Use a 5-digit ZIP"),
});

export type ClubActionInput =
  | { token: string; subscriptionId: string; action: "pause" | "resume" | "keep" }
  | { token: string; subscriptionId: string; action: "skip"; months?: SkipMonths }
  | { token: string; subscriptionId: string; action: "cancel"; reason?: string }
  | { token: string; subscriptionId: string; action: "address"; address: z.input<typeof addressSchema> };

/** One change to one subscription, by the holder of a valid link that names it. */
export async function clubAction(input: ClubActionInput): Promise<{ ok: boolean; message: string }> {
  const allowed = verifyClubLink(input.token);
  if (!allowed) return { ok: false, message: "This link has expired. Request a new one below." };
  if (!allowed.includes(input.subscriptionId)) return { ok: false, message: "We couldn't find that Snack Club on this link." };
  const db = getSupabaseAdminStrict();
  const [owned] = await subscriptionsById(db, [input.subscriptionId]);
  if (!owned) return { ok: false, message: "We couldn't find that Snack Club on this link." };

  if (input.action === "address") {
    const parsed = addressSchema.safeParse(input.address);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
    const { name, ...address } = parsed.data;
    const { error } = await db
      .from("subscriptions")
      .update({ shipping: { name, address: { ...address, line2: address.line2 || null, state: address.state.toUpperCase(), country: "US" } }, updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", owned.stripe_subscription_id);
    if (error) return { ok: false, message: `We couldn't save that. Please try again or email ${site.email}.` };
    return { ok: true, message: "Address saved. Your next box ships there." };
  }

  const stripe = getStripe();
  if (!stripe) return { ok: false, message: `We couldn't reach billing. Email ${site.email} and we'll help right away.` };
  try {
    const sub = await stripe.subscriptions.retrieve(owned.stripe_subscription_id);
    if (sub.status === "canceled") return { ok: false, message: "This Snack Club is already cancelled." };
    const end = periodEnd(sub);
    const updated = await stripe.subscriptions.update(sub.id, (() => {
      switch (input.action) {
        // Void just the next renewal: paused through the renewal date, back on a few days later.
        case "skip":
          if (!end) throw new Error("No renewal date");
          if (!SKIP_CHOICES.includes(input.months ?? 1)) throw new Error("Unsupported skip length");
          return { pause_collection: { behavior: "void" as const, resumes_at: skipUntil(end, input.months ?? 1) } };
        case "pause":
          return { pause_collection: { behavior: "void" as const } };
        case "resume":
          return { pause_collection: "" as const };
        case "cancel":
          return { cancel_at_period_end: true };
        case "keep":
          return { cancel_at_period_end: false };
      }
    })());
    await syncSubscription(db, updated);
    if (input.action === "cancel" && input.reason && (CANCEL_REASONS as readonly string[]).includes(input.reason)) {
      await db.from("subscriptions").update({ cancel_reason: input.reason }).eq("stripe_subscription_id", sub.id);
    }
  } catch (err) {
    console.error("club action failed", input.action, err instanceof Error ? err.message : err);
    return { ok: false, message: `That didn't go through. Please try again or email ${site.email}.` };
  }
  const skipped = input.action === "skip" ? (input.months ?? 1) : 1;
  const messages = {
    skip: skipped === 1 ? "Done. Your next box is skipped and you won't be charged for it." : `Done. Your next ${skipped} boxes are skipped and you won't be charged for them.`,
    pause: "Paused. No boxes and no charges until you resume.",
    resume: "Welcome back. Your Snack Club is on again.",
    cancel: "Cancelled. No more charges after this period; any paid box still ships.",
    keep: "Great, your Snack Club continues.",
  } as const;
  return { ok: true, message: messages[input.action] };
}
