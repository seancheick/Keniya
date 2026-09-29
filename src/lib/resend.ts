import { Resend } from "resend";
import { env } from "@/lib/env";
import { site } from "@/lib/site";

let client: Resend | null = null;

export function getResend(): Resend {
  if (!client) {
    client = new Resend(env.RESEND_API_KEY);
  }
  return client;
}

export async function sendWaitlistConfirmEmail(opts: {
  to: string;
  boxInterest: string;
  quizWho?: string;
  quizCraving?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { WaitlistConfirmEmail } = await import("@/emails/WaitlistConfirmEmail");

  try {
    const { error } = await getResend().emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: opts.to,
      replyTo: site.email,
      subject: "You're on the list — Keniya founding release",
      react: WaitlistConfirmEmail({
        boxInterest: opts.boxInterest,
        quizWho: opts.quizWho,
        quizCraving: opts.quizCraving,
      }),
    });

    if (error) {
      console.error("resend waitlist email failed", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("resend waitlist email threw", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
