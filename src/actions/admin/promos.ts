"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { loadSettings } from "@/lib/admin/db";
import { createPromoCode } from "@/lib/promo-codes";
import { getStripe } from "@/lib/stripe";

export type PromoState = { error?: string; ok?: string };

const schema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,24}$/, "Code: 3–24 letters, numbers or dashes"),
  vendor: z.string().trim().max(60),
  percentOff: z.coerce.number().int().min(1, "Percent off: 1 to 100").max(100, "Percent off: 1 to 100"),
  maxRedemptions: z.string().trim().transform((v, ctx) => {
    if (!v) return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) ctx.addIssue({ code: "custom", message: "Max uses: a whole number, or blank for no cap" });
    return n;
  }),
  expires: z.string().trim().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Expiry: pick a date or leave blank"),
});

/** A new vendor or partner code: % off one one-time box, typed at checkout. */
export async function createPromo(_prev: PromoState, fd: FormData): Promise<PromoState> {
  await requireAdmin();
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  // The welcome offer is applied by the site after its own checks; a typed twin would skip them.
  if (d.code === (await loadSettings()).offers.welcome.code) return { error: `${d.code} is the first-box offer's code. Pick another.` };
  // End of the chosen day in New York, so a code "expiring Dec 31" works all of Dec 31.
  const expiresAt = d.expires ? Math.floor(new Date(`${d.expires}T23:59:59-05:00`).getTime() / 1000) : null;
  if (expiresAt && expiresAt <= Date.now() / 1000) return { error: "Expiry must be in the future" };
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe isn't configured on this environment" };
  try {
    await createPromoCode(stripe, { code: d.code, vendor: d.vendor, percentOff: d.percentOff, maxRedemptions: d.maxRedemptions, expiresAt });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Stripe refused the code" };
  }
  revalidatePath("/admin/promos");
  return { ok: `${d.code} is live: ${d.percentOff}% off one-time boxes.` };
}

/** Turn a code off (or back on). Orders already discounted keep their discount. */
export async function setPromoActive(fd: FormData) {
  await requireAdmin();
  const id = z.string().regex(/^promo_\w+$/).parse(fd.get("id"));
  const active = fd.get("active") === "true";
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe isn't configured on this environment");
  await stripe.promotionCodes.update(id, { active });
  revalidatePath("/admin/promos");
}
