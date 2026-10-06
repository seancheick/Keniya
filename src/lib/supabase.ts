import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let strict: SupabaseClient | null = null;

/** Trusted server operations require a service credential; never fall back to anonymous access. */
export function getSupabaseAdminStrict(): SupabaseClient {
  if (strict) return strict;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !service) throw new Error("Supabase URL and service credential are required");
  strict = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return strict;
}
