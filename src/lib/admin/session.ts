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
  if (secret && secret.length >= 16) return Buffer.from(secret);
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return createHash("sha256").update(`keniya-admin-session:${pw}`).digest();
}

export const adminConfigured = () => Boolean(process.env.ADMIN_PASSWORD);

const b64 = (s: string) => Buffer.from(s).toString("base64url");

export function signSession(name: string, now = Date.now()): string | null {
  const k = key();
  if (!k) return null;
  const body = b64(JSON.stringify({ n: name.slice(0, 40), exp: now + SESSION_DAYS * 86_400_000 }));
  return `${body}.${createHmac("sha256", k).update(body).digest("base64url")}`;
}

export function verifySession(token: string | undefined | null, now = Date.now()): { name: string } | null {
  const k = key();
  if (!k || !token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", k).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const { n, exp } = JSON.parse(Buffer.from(body, "base64url").toString()) as { n: string; exp: number };
    if (typeof exp !== "number" || exp < now || typeof n !== "string") return null;
    return { name: n };
  } catch {
    return null;
  }
}

/** Constant-time password check (hash both sides so lengths match). */
export function passwordMatches(given: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(pw).digest();
  return timingSafeEqual(a, b);
}
