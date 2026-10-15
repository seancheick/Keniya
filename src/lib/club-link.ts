import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Snack Club manage links: base64url({s: subscription ids, exp}) + "." + HMAC. Emailed to the
 * subscriber, valid 24 hours, so holding the inbox is what proves who you are. The link names
 * subscriptions, never the email, so nothing personal sits in the URL. The key is derived from
 * ADMIN_SESSION_SECRET under its own label, so it can't be swapped for an admin session.
 */
const TTL_MS = 24 * 3_600_000;

function key(): Buffer | null {
  const secret = process.env.CLUB_LINK_SECRET ?? process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) return null;
  return createHash("sha256").update(`keniya-club-link:${secret}`).digest();
}

export const clubLinksConfigured = () => key() !== null;

export function signClubLink(subscriptionIds: string[], now = Date.now()): string | null {
  const k = key();
  if (!k || !subscriptionIds.length) return null;
  const body = Buffer.from(JSON.stringify({ s: subscriptionIds, exp: now + TTL_MS })).toString("base64url");
  return `${body}.${createHmac("sha256", k).update(body).digest("base64url")}`;
}

/** The subscriptions a valid, unexpired link opens; null for anything else. */
export function verifyClubLink(token: string | null | undefined, now = Date.now()): string[] | null {
  const k = key();
  if (!k || !token) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  const expected = createHmac("sha256", k).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const { s, exp } = JSON.parse(Buffer.from(body, "base64url").toString()) as { s: unknown; exp: unknown };
    const ok = Array.isArray(s) && s.length > 0 && s.every((id) => typeof id === "string" && /^sub_\w+$/.test(id));
    return ok && typeof exp === "number" && exp > now ? (s as string[]) : null;
  } catch {
    return null;
  }
}
