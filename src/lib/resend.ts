import { Resend } from "resend";
import { env } from "@/lib/env";
import { site } from "@/lib/site";
import { UPDATES_INTEREST, type Box } from "@/lib/box";
import type { OrderEmailProps } from "@/emails/OrderConfirmEmail";
import type { OrderAlertProps } from "@/emails/OrderAlertEmail";

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
      subject:
        opts.boxInterest === UPDATES_INTEREST
          ? "You're subscribed to Keniya updates"
          : "You're on the list — Keniya founding release",
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
  alert: Omit<OrderAlertProps, keyof OrderEmailProps | "customerEmail" | "sessionId">,
  sessionId: string,
) {
  const [{ OrderConfirmEmail }, { OrderAlertEmail }] = await Promise.all([
    import("@/emails/OrderConfirmEmail"),
    import("@/emails/OrderAlertEmail"),
  ]);
  const customer = await sendOnce("order confirm", `order-${sessionId}`, {
    from: env.RESEND_FROM_EMAIL,
    to,
    replyTo: site.email,
    subject: `Your ${props.box.name} is reserved`,
    react: OrderConfirmEmail(props),
  });
  // Founder packing slip; reply goes straight to the buyer.
  const left = alert.soldCount == null ? "" : ` · ${Math.max(site.firstRunPerBox - alert.soldCount, 0)} left`;
  const founder = await sendOnce("order alert", `alert-${sessionId}`, {
    from: env.RESEND_FROM_EMAIL,
    to: site.email,
    replyTo: to,
    subject: `New order: ${props.box.shortName}${props.gift ? " (gift)" : ""}${left}`,
    react: OrderAlertEmail({ ...props, ...alert, customerEmail: to, sessionId }),
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
