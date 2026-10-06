"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { getSupabaseAdminStrict } from "@/lib/supabase";
import { sendWaitlistConfirmEmail } from "@/lib/resend";
import { site } from "@/lib/site";
import { UPDATES_INTEREST } from "@/lib/box";

const waitlistSchema = z.object({
  email: z.email().max(255),
  boxInterest: z.string().max(40).default("pregnancy_comfort"),
  source: z.string().max(40).default("site"),
  quizWho: z.string().max(300).optional(),
  quizAllergies: z.array(z.string().max(30)).max(6).optional(),
  quizCraving: z.string().max(30).optional(),
});

export type WaitlistInput = z.input<typeof waitlistSchema>;

export async function joinWaitlist(
  input: WaitlistInput,
): Promise<{ ok: boolean; message: string }> {
  const parsed = waitlistSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "That email doesn't look right — mind checking it?" };
  }
  const d = parsed.data;
  const email = d.email.trim().toLowerCase();

  let db;
  try {
    db = getSupabaseAdminStrict();
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    const key = createHash("sha256").update(ip).digest("hex");
    const limited = await db.rpc("allow_public_attempt", { p_key: `waitlist:ip:${key}`, p_limit: 5, p_window_seconds: 600 });
    if (limited.error) throw new Error(limited.error.message);
    const byEmail = await db.rpc("allow_public_attempt", { p_key: `waitlist:email:${createHash("sha256").update(email).digest("hex")}`, p_limit: 3, p_window_seconds: 3600 });
    if (byEmail.error) throw new Error(byEmail.error.message);
    if (!limited.data || !byEmail.data) return { ok: false, message: "Too many requests. Please try again later." };
  } catch (error) {
    console.error("waitlist unavailable", error);
    return { ok: false, message: `We couldn't save your request. Please try again later or email ${site.email}.` };
  }
  const { error } = await db.from("waitlist").insert({
    email,
    box_interest: d.boxInterest,
    source: d.source,
    quiz_who: d.quizWho ?? null,
    quiz_allergies: d.quizAllergies ?? null,
    quiz_craving: d.quizCraving ?? null,
  });

  if (error?.code === "23505") return { ok: true, message: "You're already on the list — we'll be in touch." };
  if (error) {
    console.error("waitlist insert failed", error.code, error.message);
    return { ok: false, message: `We couldn't save your request. Please try again later or email ${site.email}.` };
  }

  const mail = await sendWaitlistConfirmEmail({
    to: email,
    boxInterest: d.boxInterest,
    quizWho: d.quizWho,
    quizCraving: d.quizCraving,
  });

  const joined = d.boxInterest === UPDATES_INTEREST ? "You're subscribed" : "You're on the list";
  return {
    ok: true,
    message: mail.ok
      ? `${joined} — check your inbox for a confirmation.`
      : `${joined} — we'll be in touch soon.`,
  };
}
