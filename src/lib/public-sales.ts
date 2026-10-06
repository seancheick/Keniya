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
    const { rules, sales } = await loadCommerceState();
    const boxes: PublicBox[] = publicBoxes(rules).map((box) => {
      const sale = sales[box.slug];
      return { ...box, founding: sale.founding, sale: { available: sale.available, clinicianApproved: sale.clinicianApproved, priceCents: sale.priceCents, remaining: sale.remaining,
        state: sale.available ? "preorder" : sale.remaining <= 0 ? "sold_out" : "waitlist",
      } };
    });
    return { rules, boxes };
  } catch (error) {
    console.error("Public sales unavailable", error);
    const rules = await loadBoxRules();
    const boxes: PublicBox[] = publicBoxes(rules).map((box) => ({ ...box, founding: 0, sale: {
      available: false, clinicianApproved: false, priceCents: 0, remaining: 0, state: "waitlist",
    } }));
    return { rules, boxes };
  }
});
