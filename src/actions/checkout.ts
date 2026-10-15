"use server";

import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { reconcileCheckoutHolds } from "@/lib/commerce-reconcile";
import { loadCommerceState } from "@/lib/commerce";
import { ensureWelcomeCoupon, likeExact, loadWelcomeOffer } from "@/lib/offers";
import { getSupabaseAdminStrict } from "@/lib/supabase";
import type Stripe from "stripe";
import { z } from "zod";
import { boxes, cravings } from "@/lib/box";
import { BOX_SLUGS } from "@/lib/admin/types";
import { site } from "@/lib/site";
import { getStripe, isCheckoutConfigured, priceIdForBox } from "@/lib/stripe";

const schema = z.object({
  boxSlug: z.enum(BOX_SLUGS),
  requestKey: z.string().uuid(),
  gift: z.boolean().optional(),
  // Quiz answers only prefill checkout (the buyer can change them there), so a bad value is
  // dropped rather than blocking the purchase.
  craving: z
    .string()
    .optional()
    .transform((v) => cravings.find((c) => c.value === v)?.value),
  avoid: z
    .string()
    .optional()
    .transform((v) => v?.trim().slice(0, 255) || undefined),
  // First-order offer: the buyer's email, checked against past orders and locked into checkout.
  welcomeEmail: z.string().trim().toLowerCase().pipe(z.email().max(255)).optional(),
  // "monthly" = the Snack Club (only while it's switched on in Settings).
  plan: z.enum(["once", "monthly"]).default("once"),
});

const CHECKOUT_DOWN =
  "Checkout is having a moment. Join the email list and we’ll write when checkout is available.";

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; message: string; needsEmail?: boolean; code?: string };

export type CheckoutInput = {
  boxSlug: string;
  requestKey: string;
  gift?: boolean;
  craving?: string;
  avoid?: string;
  welcomeEmail?: string;
  plan?: "once" | "monthly";
};

export async function startCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === "welcomeEmail"))
      return { ok: false, message: "That email doesn't look right. Mind checking it?", code: "bad_email" };
    return { ok: false, message: "Pick a box to order.", code: "bad_box" };
  }

  const gift = parsed.data.gift === true;
  const { craving, avoid, welcomeEmail, plan } = parsed.data;
  const monthly = plan === "monthly";
  if (monthly && gift) return { ok: false, code: "gift_subscription", message: "Gifts are one-time. Choose Buy once to send a gift." };
  if (monthly && welcomeEmail) return { ok: false, code: "offer_subscription", message: "The first-box offer is for one-time boxes. Choose Buy once to use it." };
  const box = boxes.find((b) => b.slug === parsed.data.boxSlug);
  if (!box) {
    return { ok: false, message: "That box isn’t available.", code: "missing_box" };
  }

  if (!isCheckoutConfigured()) {
    console.error("checkout: STRIPE_SECRET_KEY missing or invalid on this environment");
    return {
      ok: false,
      needsEmail: true,
      code: "no_stripe_key",
      message:
        CHECKOUT_DOWN,
    };
  }

  const stripe = getStripe();
  if (!stripe) {
    return {
      ok: false,
      needsEmail: true,
      code: "no_stripe_client",
      message: CHECKOUT_DOWN,
    };
  }

  const base = site.url.replace(/\/$/, "");
  const priceId = priceIdForBox(box.slug);

  try {
    const h = await headers();
    const origin = h.get("origin");
    if (origin && origin !== new URL(site.url).origin) throw new Error("Invalid checkout origin");
    const db = getSupabaseAdminStrict();
    const ip = h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const clientHash = createHash("sha256").update(ip).digest("hex");
    const { data: allowed, error: limitError } = await db.rpc("allow_public_attempt", { p_key: `checkout:${clientHash}`, p_limit: 15, p_window_seconds: 600 });
    if (limitError || allowed !== true) return { ok: false, code: "rate_limit", message: "Please wait a few minutes before trying checkout again." };
    await reconcileCheckoutHolds(db, stripe, box.slug);
    const { sales, settings } = await loadCommerceState();
    const sale = sales[box.slug];
    if (!sale.clinicianApproved || sale.priceCents !== site.preorderPriceUSD * 100) return { ok: false, needsEmail: true, code: "unavailable", message: "This box isn't open for orders yet. Join the list and we'll email you." };
    const club = settings.offers.subscription;
    if (monthly && (!club.enabled || club.priceCents <= 0)) return { ok: false, code: "no_subscription", message: "The Snack Club isn't open yet. You can still order one box." };
    if (priceId && !monthly) {
      const price = await stripe.prices.retrieve(priceId);
      if (!price.active || price.type !== "one_time" || price.currency !== "usd" || price.unit_amount !== sale.priceCents) throw new Error("Stripe price does not match the published price");
    }
    // WELCOME20: a buyer's first order only. Stripe counts every guest checkout as a first
    // purchase, so the check is ours: no earlier order on this email, and the email is locked
    // into checkout so the discount can't move to another address.
    let welcomeCoupon: string | null = null;
    if (welcomeEmail) {
      const offer = await loadWelcomeOffer(stripe, settings);
      if (!offer) return { ok: false, code: "offer_ended", message: `The first-box offer has ended. You can still order at $${site.preorderPriceUSD}.` };
      const { data: prior, error: priorError } = await db.from("preorders").select("id").ilike("email", likeExact(welcomeEmail)).limit(1);
      if (priorError) throw new Error(priorError.message);
      // Deliberately vague: the reason is "this email has ordered", which isn't ours to reveal.
      if (prior?.length) return { ok: false, code: "offer_used", message: `The first-box offer can't be used with this email. You can still order at $${site.preorderPriceUSD}.` };
      welcomeCoupon = await ensureWelcomeCoupon(stripe, settings.offers.welcome);
    }
    const fingerprint = createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex");
    const { data: hold, error: holdError } = await db.rpc("reserve_checkout", {
      p_key: parsed.data.requestKey, p_slug: box.slug, p_capacity: sale.founding,
      p_expected_lineup: sale.lineupId, p_expected_rules: sale.expectedRules, p_expected_settings: sale.expectedSettings, p_price: sale.priceCents,
      p_fingerprint: fingerprint, p_client: clientHash,
    });
    if (holdError || !hold) throw new Error(holdError?.message ?? "No capacity reservation");
    if (hold.session_id) {
      const existing = await stripe.checkout.sessions.retrieve(hold.session_id);
      if (existing.status === "open" && existing.payment_status !== "paid" && existing.url) return { ok: true, url: existing.url };
      return { ok: false, code: "expired_session", message: "This checkout has finished or expired. Please start a new checkout." };
    }
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = monthly
      ? [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: club.priceCents,
              recurring: { interval: "month" },
              product_data: {
                name: `${box.name} · Monthly Snack Club`,
                description: `${site.snackCount} snacks every month · Free shipping · First box ships ${site.shipDate} · Skip, pause or cancel online`,
              },
            },
          },
        ]
      : priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: sale.priceCents,
              product_data: {
                name: `${box.name}${gift ? " (Gift)" : ""}`,
                description: `${site.snackCount} snacks · Free shipping · First boxes ship ${site.shipDate} · Refundable until it ships`,
              },
            },
          },
        ];

    const session = await stripe.checkout.sessions.create({
      mode: monthly ? "subscription" : "payment",
      ...(monthly && {
        // The box rides on the subscription so renewals know what to pack.
        subscription_data: { metadata: { box_slug: box.slug, plan: "monthly" }, description: `${box.name} · Monthly Snack Club` },
      }),
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${base}/thanks?session_id={CHECKOUT_SESSION_ID}&box=${box.slug}${gift ? "&gift=1" : ""}`,
      // Stripe can't swap the product in place, so "back" lands on the picker with this box
      // selected (gift mode kept), one tap from switching.
      cancel_url: `${base}/#${gift ? "gift" : "box"}-${box.slug}`,
      shipping_address_collection: { allowed_countries: ["US"] },
      phone_number_collection: { enabled: false },
      billing_address_collection: "auto",
      custom_fields: [
        {
          key: "gift_note",
          label: {
            type: "custom",
            custom: gift ? "Gift message (printed on a note in the box)" : "Gift note (optional)",
          },
          type: "text",
          optional: !gift,
        },
        {
          // Condition decides eligibility (the box); these two choose among eligible snacks.
          key: "avoid",
          label: { type: "custom", custom: "Allergies or foods to avoid (optional)" },
          type: "text",
          optional: true,
          ...(avoid ? { text: { default_value: avoid } } : {}),
        },
        {
          key: "craving",
          label: { type: "custom", custom: "Sweet or salty? (optional)" },
          type: "dropdown",
          optional: true,
          dropdown: {
            options: cravings.map((c) => ({ label: c.label, value: c.value })),
            ...(craving ? { default_value: craving } : {}),
          },
        },
      ],
      metadata: {
        box_slug: box.slug,
        box_name: box.name,
        founding_release: "fall_26",
        reservation_key: parsed.data.requestKey,
        gift: gift ? "yes" : "no",
        plan,
        ...(welcomeCoupon && { offer: settings.offers.welcome.code }),
      },
      // One discount per order: the checked welcome coupon, or a code typed at checkout.
      // The Snack Club takes no codes (its price is already the saving).
      ...(monthly
        ? {}
        : welcomeCoupon && welcomeEmail
          ? { discounts: [{ coupon: welcomeCoupon }], customer_email: welcomeEmail }
          : { allow_promotion_codes: true }),
      custom_text: {
        submit: {
          // Express consent to the recurring charge, stated where they click (ROSCA).
          message: monthly
            ? `By subscribing you agree to $${(club.priceCents / 100).toFixed(2)} today and every month on this date until you cancel. Skip, pause or cancel anytime at ${base.replace(/^https?:\/\//, "")}/club.`
            : `Want a different box? Use the ← arrow at the top to switch. Every box is $${site.preorderPriceUSD}.`,
        },
      },
      // Unfinished checkouts expire after 2h. Reminders return to fresh admission on the box page.
      expires_at: Math.floor(new Date(hold.expires_at).getTime() / 1000),
    }, { idempotencyKey: `checkout:${parsed.data.requestKey}` });

    if (!session.url) {
      return {
        ok: false,
        message: "Couldn’t start checkout — try again.",
        code: "no_session_url",
      };
    }
    const { data: bound, error: bindError } = await db.rpc("bind_checkout_session", { p_key: parsed.data.requestKey, p_session: session.id, p_url: session.url });
    if (bindError || bound !== true) {
      // A rule/lineup change may have invalidated admission while Stripe was creating it.
      if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
      throw new Error(bindError?.message ?? "Checkout admission changed");
    }
    return { ok: true, url: session.url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("stripe checkout failed", msg);
    // Shoppers get one plain message; the cause stays in the server log (and `code`).
    return {
      ok: false,
      needsEmail: true,
      code: msg.includes("Checkout request is changed or expired") || msg.includes("Checkout admission changed") ? "stale_request" : msg.includes("No such price") ? "stripe_price" : msg.includes("api_key") || msg.includes("Invalid API Key") ? "stripe_key" : "stripe_error",
      message: CHECKOUT_DOWN,
    };
  }
}
