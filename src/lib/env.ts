// Secrets are read only when their server feature runs.
export const env = {
  get STRIPE_WEBHOOK_SECRET() { return process.env.STRIPE_WEBHOOK_SECRET ?? ""; },
  get RESEND_API_KEY() {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("Missing env var: RESEND_API_KEY");
    return key;
  },
  get RESEND_FROM_EMAIL() { return process.env.RESEND_FROM_EMAIL ?? "Keniya <hello@keniyahealth.com>"; },
};
