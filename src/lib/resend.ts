import { Resend } from "resend";
import { env } from "@/lib/env";
import { site } from "@/lib/site";
import type { Box } from "@/lib/box";
import type { OrderEmailProps } from "@/emails/OrderConfirmEmail";

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

type SendArgs = Parameters<Resend["emails"]["send"]>[0];

/**
 * Send once per key: Stripe retries webhooks, and Resend drops a repeat idempotency key
 * (24h window), so a retried event never double-emails a customer.
 */
async function sendOnce(label: string, idempotencyKey: string, payload: SendArgs) {
  try {
    const { error } = await getResend().emails.send(payload, { idempotencyKey });
    if (error) {
      console.error(`resend ${label} failed`, error);
      return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  } catch (err) {
    console.error(`resend ${label} threw`, err);
    return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendOrderEmails(
  to: string,
  props: OrderEmailProps,
  sessionId: string,
) {
  const { OrderConfirmEmail } = await import("@/emails/OrderConfirmEmail");
  const customer = await sendOnce("order confirm", `order-${sessionId}`, {
    from: env.RESEND_FROM_EMAIL,
    to,
    replyTo: site.email,
    subject: `Your ${props.box.name} is reserved`,
    react: OrderConfirmEmail(props),
  });
  // Founder alert: everything needed to pack it, including the gift card message.
  const founder = await sendOnce("order alert", `alert-${sessionId}`, {
    from: env.RESEND_FROM_EMAIL,
    to: site.email,
    replyTo: to,
    subject: `[Keniya order] ${props.box.shortName}${props.gift ? " (GIFT)" : ""} · ${to}`,
    text: [
      `Box: ${props.box.name}`,
      `Customer: ${props.firstName ?? ""} <${to}>`,
      `Paid: $${(props.amountCents / 100).toFixed(2)}`,
      `Gift: ${props.gift ? "yes" : "no"}`,
      `Card message: ${props.giftNote || "(none)"}`,
      `Ship to: ${props.shipTo ? [props.shipTo.name, ...props.shipTo.lines].filter(Boolean).join(", ") : "(missing)"}`,
      `Stripe session: ${sessionId}`,
    ].join("\n"),
  });
  return { customer, founder };
}

export async function sendCartReminder(to: string, box: Box, recoveryUrl: string, sessionId: string) {
  const { CartReminderEmail } = await import("@/emails/CartReminderEmail");
  return sendOnce("cart reminder", `cart-${sessionId}`, {
    from: env.RESEND_FROM_EMAIL,
    to,
    replyTo: site.email,
    subject: `Your ${box.shortName} box is still waiting`,
    react: CartReminderEmail({ box, recoveryUrl }),
  });
}
