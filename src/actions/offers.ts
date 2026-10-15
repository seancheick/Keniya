"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { resolveMx, resolve4, resolve6 } from "node:dns/promises";
import { getSupabaseAdminStrict } from "@/lib/supabase";
import { loadSettings } from "@/lib/admin/db";
import { discountedCents, loadWelcomeOffer } from "@/lib/offers";
import { sendWelcomeOfferEmail } from "@/lib/resend";
import { getStripe } from "@/lib/stripe";
import { UPDATES_INTEREST } from "@/lib/box";
import { site } from "@/lib/site";

export type WelcomeClaim =
  | { ok: true; eligible: true; email: string; code: string; percentOff: number; priceCents: number; emailed: boolean }
  | { ok: true; eligible: false; message: string }
  | { ok: false; message: string };

const email = z.string().trim().toLowerCase().pipe(z.email().max(255));

/**
 * Can this domain receive mail? MX records, or an address record (the implicit MX). A domain
 * that doesn't exist is a typo; a slow or failing resolver never blocks a real visitor.
 */
async function domainAcceptsMail(domain: string): Promise<boolean> {
  const lookup = (async () => {
    try {
      if ((await resolveMx(domain)).length) return true;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "ENODATA" && code !== "ENOTFOUND") return true;
      if (code === "ENOTFOUND") return false;
    }
    const any = await Promise.allSettled([resolve4(domain), resolve6(domain)]);
    return any.some((r) => r.status === "fulfilled" && r.value.length > 0);
  })();
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 2500));
  return Promise.race([lookup, timeout]);
}

/**
 * The WELCOME20 sign-up: a checked email joins the Keniya list and gets the first-box code on
 * screen and by email. It never says whether the email has ordered before (that would let
 * anyone look up someone's purchases); checkout enforces "first order" on its own.
 */
export async function claimWelcomeOffer(input: { email: string }): Promise<WelcomeClaim> {
  const parsed = email.safeParse(input.email);
  if (!parsed.success) return { ok: false, message: "That email doesn't look right. Mind checking it?" };
  const address = parsed.data;
  const domain = address.split("@")[1];

  const db = getSupabaseAdminStrict();
  try {
    const h = await headers();
    const ip = h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const byIp = await db.rpc("allow_public_attempt", { p_key: `welcome:ip:${createHash("sha256").update(ip).digest("hex")}`, p_limit: 6, p_window_seconds: 600 });
    const byEmail = await db.rpc("allow_public_attempt", { p_key: `welcome:email:${createHash("sha256").update(address).digest("hex")}`, p_limit: 3, p_window_seconds: 3600 });
    if (byIp.error || byEmail.error) throw new Error(byIp.error?.message ?? byEmail.error?.message);
    if (!byIp.data || !byEmail.data) return { ok: false, message: "Too many tries. Please wait a few minutes." };
  } catch (error) {
    console.error("welcome claim limiter unavailable", error);
    return { ok: false, message: `We couldn't check that right now. Please try again in a minute.` };
  }

  if (!(await domainAcceptsMail(domain))) return { ok: false, message: `We couldn't find "${domain}". Is there a typo?` };

  const settings = await loadSettings();
  const offer = await loadWelcomeOffer(getStripe(), settings).catch(() => null);

  // Join the list either way (duplicates are fine); the list is what the visitor asked for.
  const { error: listError } = await db.from("waitlist").insert({ email: address, box_interest: UPDATES_INTEREST, source: "welcome_offer" });
  if (listError && listError.code !== "23505") {
    console.error("welcome list insert failed", listError.code, listError.message);
    return { ok: false, message: `We couldn't save that. Please try again or email ${site.email}.` };
  }

  if (!offer) return { ok: true, eligible: false, message: "You're on the list! The first-box offer has ended, but we'll email you news and new boxes." };

  const priceCents = discountedCents(site.preorderPriceUSD * 100, offer.percentOff);
  const mail = await sendWelcomeOfferEmail(address, { code: offer.code, percentOff: offer.percentOff, priceLabel: `$${(priceCents / 100).toFixed(2)}` });
  return { ok: true, eligible: true, email: address, code: offer.code, percentOff: offer.percentOff, priceCents, emailed: mail.ok };
}
