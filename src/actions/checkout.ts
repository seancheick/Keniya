"use server";

import type Stripe from "stripe";
import { z } from "zod";
import { boxes, cravings } from "@/lib/box";
import { site } from "@/lib/site";
import { getStripe, isCheckoutConfigured, priceIdForBox } from "@/lib/stripe";

const schema = z.object({
  boxSlug: z.enum(["pregnancy_comfort", "blood_sugar", "heart"]),
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
});

const CHECKOUT_DOWN =
  "Checkout is having a moment. Leave your email and we’ll hold your spot and write to you.";

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; message: string; needsEmail?: boolean; code?: string };

export type CheckoutInput = {
  boxSlug: string;
  gift?: boolean;
  craving?: string;
  avoid?: string;
};

export async function startCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Pick a box to preorder.", code: "bad_box" };
  }

  const gift = parsed.data.gift === true;
  const { craving, avoid } = parsed.data;
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
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: site.preorderPriceUSD * 100,
              product_data: {
                name: `${box.name}${gift ? " (Gift)" : ""} (Founding preorder)`,
                description: `${site.snackCount} snacks · Free shipping · Ships ${site.shipDate} · Refundable before it ships`,
              },
            },
          },
        ];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
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
        gift: gift ? "yes" : "no",
      },
      allow_promotion_codes: true,
      custom_text: {
        submit: {
          message: `Want a different box? Use the ← arrow at the top to switch. Every box is $${site.preorderPriceUSD}.`,
        },
      },
      // Unfinished checkouts expire after 2h; Stripe then sends checkout.session.expired
      // with a recovery link, and the webhook emails one "you left your box" reminder.
      expires_at: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
      after_expiration: { recovery: { enabled: true, allow_promotion_codes: true } },
    });

    if (!session.url) {
      return {
        ok: false,
        message: "Couldn’t start checkout — try again.",
        code: "no_session_url",
      };
    }
    return { ok: true, url: session.url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("stripe checkout failed", msg);
    // Shoppers get one plain message; the cause stays in the server log (and `code`).
    return {
      ok: false,
      needsEmail: true,
      code: msg.includes("No such price") ? "stripe_price" : msg.includes("api_key") || msg.includes("Invalid API Key") ? "stripe_key" : "stripe_error",
      message: CHECKOUT_DOWN,
    };
  }
}
