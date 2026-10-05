import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://issfvpyewzlnxxdqrzqc.supabase.co";

/** Browser / public anon key (legacy JWT preferred for RLS `anon` policies). */
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

/**
 * Publishable client — RLS applies. Safe for insert-with-policy use cases.
 * Prefer the server client below for trusted server actions.
 */
export const supabase: SupabaseClient = createClient(url, anonKey || "missing", {
  auth: { persistSession: false },
});

let admin: SupabaseClient | null = null;

/** Service-role client — bypasses RLS. Server-only. */
export function getSupabaseAdmin(): SupabaseClient {
  if (admin) return admin;
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";
  if (!service) {
    // Fall back to anon (RLS must allow the write)
    return supabase;
  }
  admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

let strict: SupabaseClient | null = null;

/**
 * Service-role client for the admin area. Unlike getSupabaseAdmin() it never falls back to
 * the anon key: admin tables have no anon policies, so a fallback would only hide a
 * misconfiguration behind empty results.
 */
export function getSupabaseAdminStrict(): SupabaseClient {
  if (strict) return strict;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";
  if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set: the admin needs the service key");
  strict = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  return strict;
}

export const supabaseProject = {
  id: process.env.SUPABASE_PROJECT_ID ?? process.env.SUPABASE_PROJECT_REF ?? "issfvpyewzlnxxdqrzqc",
  url,
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "Keniya",
} as const;
