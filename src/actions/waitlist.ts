"use server";

import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getResend, sendWaitlistConfirmEmail } from "@/lib/resend";
import { env } from "@/lib/env";
import { site } from "@/lib/site";
import { UPDATES_INTEREST } from "@/lib/box";

const waitlistSchema = z.object({
  email: z.email().max(255),
  boxInterest: z.string().max(40).default("pregnancy_comfort"),
  source: z.string().max(40).default("site"),
  quizWho: z.string().max(60).optional(),
  quizAllergies: z.array(z.string().max(30)).max(6).optional(),
  quizCraving: z.string().max(30).optional(),
});

export type WaitlistInput = z.input<typeof waitlistSchema>;

// Backup record when the database is unreachable. Resend returns `{ error }` rather than
// throwing on API failures, so both paths must be checked.
async function notifyFounder(
  email: string,
  d: z.output<typeof waitlistSchema>,
): Promise<boolean> {
  try {
    const { error } = await getResend().emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: site.email,
      subject: `[Keniya waitlist] ${email} · ${d.boxInterest}`,
      text: [
        `Email: ${email}`,
        `Box: ${d.boxInterest}`,
        `Source: ${d.source}`,
        `Who: ${d.quizWho ?? "—"}`,
        `Craving: ${d.quizCraving ?? "—"}`,
        `Allergies: ${(d.quizAllergies ?? []).join(", ") || "—"}`,
        `DB insert failed — saved via email only.`,
      ].join("\n"),
    });
    if (error) console.error("founder notify failed", error);
    return !error;
  } catch (err) {
    console.error("founder notify threw", err);
    return false;
  }
}

export async function joinWaitlist(
  input: WaitlistInput,
): Promise<{ ok: boolean; message: string }> {
  const parsed = waitlistSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "That email doesn't look right — mind checking it?" };
  }
  const d = parsed.data;
  const email = d.email.trim().toLowerCase();

  const db = getSupabaseAdmin();
  let dbOk = false;
  const { error } = await db.from("waitlist").insert({
    email,
    box_interest: d.boxInterest,
    source: d.source,
    quiz_who: d.quizWho ?? null,
    quiz_allergies: d.quizAllergies ?? null,
    quiz_craving: d.quizCraving ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      dbOk = true;
    } else {
      console.error("waitlist insert failed", error.code, error.message);
      dbOk = false;
    }
  } else {
    dbOk = true;
  }

  // Never tell someone they're on the list unless we actually recorded them somewhere.
  const saved = dbOk || (await notifyFounder(email, d));
  if (!saved) {
    return {
      ok: false,
      message: `Something hiccuped — email ${site.email} and we’ll add you by hand.`,
    };
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
