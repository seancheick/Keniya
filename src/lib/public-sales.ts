import "server-only";
import { connection } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdminStrict } from "@/lib/supabase";
import { reconcileCheckoutHolds } from "@/lib/commerce-reconcile";
import { BOX_SLUGS } from "@/lib/admin/types";
import { loadCommerceState } from "@/lib/commerce";
import { publicBoxes } from "@/lib/public-rules";
import { loadBoxRules } from "@/lib/admin/db";
import { cache } from "react";
import type { PublicBox } from "@/lib/box";
import { site } from "@/lib/site";
import { discountedCents, loadWelcomeOffer } from "@/lib/offers";
import type { Settings } from "@/lib/admin/types";
import type Stripe from "stripe";

/** The offers the site may show right now. Each is null unless switched on and real. */
export type PublicOffers = {
  welcome: { code: string; percentOff: number; priceCents: number } | null;
  subscription: { priceCents: number; savingsPct: number } | null;
  foundingBonus: { description: string; remaining: number } | null;
};
const NO_OFFERS: PublicOffers = { welcome: null, subscription: null, foundingBonus: null };

async function publicOffers(stripe: Stripe | null, settings: Settings): Promise<PublicOffers> {
  const list = site.preorderPriceUSD * 100;
  const { subscription, foundingBonus } = settings.offers;
  // A Stripe hiccup hides the welcome banner rather than taking the page down.
  const welcome = await loadWelcomeOffer(stripe, settings).catch((err) => {
    console.error("Welcome offer unavailable", err);
    return null;
  });
  let bonusLeft = 0;
  if (foundingBonus.enabled && foundingBonus.limit > 0) {
    // Real orders only: the first `limit` admitted orders (never renewals) get the bonus, the
    // same rule the packing view uses (foundingBonusOrders), so what's left is exact.
    const { count, error } = await getSupabaseAdminStrict().from("preorders").select("id", { count: "exact", head: true }).eq("admission_verified", true).neq("kind", "renewal");
    if (error) console.error("Founding bonus count unavailable", error.message);
    else bonusLeft = Math.max(0, foundingBonus.limit - (count ?? 0));
  }
  return {
    welcome: welcome && { code: welcome.code, percentOff: welcome.percentOff, priceCents: discountedCents(list, welcome.percentOff) },
    subscription: subscription.enabled && subscription.priceCents > 0 && subscription.priceCents < list
      ? { priceCents: subscription.priceCents, savingsPct: Math.round((1 - subscription.priceCents / list) * 100) }
      : null,
    foundingBonus: bonusLeft > 0 ? { description: foundingBonus.description, remaining: bonusLeft } : null,
  };
}

/** Failed sales/config reads keep the public catalog in waitlist mode. */
export const loadPublicCatalog = cache(async () => {
  await connection();
  try {
    // A full batch has no buy button to initiate checkout cleanup. Reconcile here too.
    const stripe = getStripe();
    if (stripe) {
      const db = getSupabaseAdminStrict();
      await Promise.all(BOX_SLUGS.map((slug) => reconcileCheckoutHolds(db, stripe, slug)));
    }
    const { rules, sales, settings } = await loadCommerceState();
    const boxes: PublicBox[] = publicBoxes(rules).map((box) => {
      const sale = sales[box.slug];
      return { ...box, founding: sale.founding, sale: { available: sale.available, clinicianApproved: sale.clinicianApproved, priceCents: sale.priceCents, remaining: sale.remaining,
        // Sold out means a real first shipment filled up; a run size of 0 is just not open yet.
        state: sale.available ? "preorder" : sale.founding > 0 && sale.remaining <= 0 ? "sold_out" : "waitlist",
      } };
    });
    // Offers are extras: a failure hides them, never the boxes.
    const offers = await publicOffers(stripe, settings).catch((err) => {
      console.error("Public offers unavailable", err);
      return NO_OFFERS;
    });
    return { rules, boxes, offers };
  } catch (error) {
    console.error("Public sales unavailable", error);
    const rules = await loadBoxRules();
    const boxes: PublicBox[] = publicBoxes(rules).map((box) => ({ ...box, founding: 0, sale: {
      available: false, clinicianApproved: false, priceCents: 0, remaining: 0, state: "waitlist",
    } }));
    return { rules, boxes, offers: NO_OFFERS };
  }
});
