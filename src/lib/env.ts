// ponytail: lazy getters — each secret is required only when its feature runs,
// so the site builds and runs before Supabase/Stripe/Resend accounts exist.
function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  get SUPABASE_URL() {
    return (
      process.env.SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      "https://issfvpyewzlnxxdqrzqc.supabase.co"
    );
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return (
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SECRET_KEY ??
      ""
    );
  },
  get SUPABASE_PROJECT_ID() {
    return (
      process.env.SUPABASE_PROJECT_ID ??
      process.env.SUPABASE_PROJECT_REF ??
      "issfvpyewzlnxxdqrzqc"
    );
  },
  get SUPABASE_STORAGE_BUCKET() {
    return process.env.SUPABASE_STORAGE_BUCKET ?? "Keniya";
  },
  get STRIPE_SECRET_KEY() {
    return process.env.STRIPE_SECRET_KEY ?? "";
  },
  get STRIPE_WEBHOOK_SECRET() {
    return process.env.STRIPE_WEBHOOK_SECRET ?? "";
  },
  get STRIPE_PRICE_PREGNANCY_BOX() {
    return process.env.STRIPE_PRICE_PREGNANCY_BOX ?? "";
  },
  get STRIPE_PRICE_BLOOD_SUGAR_BOX() {
    return process.env.STRIPE_PRICE_BLOOD_SUGAR_BOX ?? "";
  },
  get STRIPE_PRICE_HEART_BOX() {
    return process.env.STRIPE_PRICE_HEART_BOX ?? "";
  },
  get RESEND_API_KEY() {
    return req("RESEND_API_KEY");
  },
  get RESEND_FROM_EMAIL() {
    return process.env.RESEND_FROM_EMAIL ?? "Keniya <hello@keniyahealth.com>";
  },
  get UPSTASH_REDIS_REST_URL() {
    return req("UPSTASH_REDIS_REST_URL");
  },
  get UPSTASH_REDIS_REST_TOKEN() {
    return req("UPSTASH_REDIS_REST_TOKEN");
  },
};
