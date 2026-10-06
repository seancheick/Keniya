// Admin session token: base64url(JSON {n: name, exp}) + "." + HMAC-SHA256. Shared by
// proxy.ts (gate) and the server (requireAdmin). Node runtime only (proxy defaults to Node).
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "keniya_admin";
export const SESSION_DAYS = 7;

/**
 * Signing key: ADMIN_SESSION_SECRET, or derived from ADMIN_PASSWORD so a single env var is
 * enough (changing the password then signs everyone out). null = admin disabled.
 */
function key(): Buffer | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret && secret.length >= 16) return createHash("sha256").update(`${secret}:${process.env.ADMIN_PASSWORD}:${process.env.CLINICIAN_PASSWORD}`).digest();
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return createHash("sha256").update(`keniya-admin-session:${pw}:${process.env.CLINICIAN_PASSWORD}`).digest();
}

export const adminConfigured = () => Boolean(process.env.ADMIN_PASSWORD);

const b64 = (s: string) => Buffer.from(s).toString("base64url");

export const CLINICIAN_NAME = "Laurie Pham";
export type AdminSession = { name: string; role: "admin" | "clinician" };
export function clinicianConfigured() { return Boolean(process.env.CLINICIAN_PASSWORD && process.env.CLINICIAN_PASSWORD !== process.env.ADMIN_PASSWORD); }

export function signSession(name: string, now = Date.now(), role: AdminSession["role"] = "admin"): string | null {
  const k = key();
  if (!k) return null;
  const body = b64(JSON.stringify({ v: 2, role, n: role === "clinician" ? CLINICIAN_NAME : name.slice(0, 40), exp: now + SESSION_DAYS * 86_400_000 }));
  return `${body}.${createHmac("sha256", k).update(body).digest("base64url")}`;
}

export function verifySession(token: string | undefined | null, now = Date.now()): AdminSession | null {
  const k = key();
  if (!k || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expected = createHmac("sha256", k).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const { n, exp, role, v } = JSON.parse(Buffer.from(body, "base64url").toString()) as { n: string; exp: number; role: string; v: number };
    if (typeof exp !== "number" || exp < now || typeof n !== "string") return null;
    if (v !== 2 || (role !== "admin" && role !== "clinician")) return null;
    if (role === "clinician" && (!clinicianConfigured() || n !== CLINICIAN_NAME)) return null;
    return { name: n, role };
  } catch {
    return null;
  }
}

/** Constant-time password check (hash both sides so lengths match). */
export function passwordMatches(given: string, role: AdminSession["role"] = "admin"): boolean {
  if (role === "clinician" && !clinicianConfigured()) return false;
  const pw = role === "clinician" ? process.env.CLINICIAN_PASSWORD : process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(pw).digest();
  return timingSafeEqual(a, b);
}
