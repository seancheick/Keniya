"use server";

import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendWaitlistConfirmEmail } from "@/lib/resend";

const waitlistSchema = z.object({
  email: z.email().max(255),
  boxInterest: z.string().max(40).default("pregnancy_comfort"),
  source: z.string().max(40).default("site"),
  quizWho: z.string().max(60).optional(),
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

  const mail = await sendWaitlistConfirmEmail({
    to: email,
    boxInterest: d.boxInterest,
    quizWho: d.quizWho,
    quizCraving: d.quizCraving,
  });

  if (!dbOk) {
    try {
      const { getResend } = await import("@/lib/resend");
      const { env } = await import("@/lib/env");
      await getResend().emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: "hello@keniyahealth.com",
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
    } catch (notifyErr) {
      console.error("founder notify failed", notifyErr);
      if (!mail.ok) {
        return {
          ok: false,
          message:
            "Something hiccuped — email hello@keniyahealth.com and we’ll add you by hand.",
        };
      }
    }
  }

  return {
    ok: true,
    message: mail.ok
      ? "You're on the list — check your inbox for a confirmation."
      : "You're on the list — we'll be in touch soon.",
  };
}
