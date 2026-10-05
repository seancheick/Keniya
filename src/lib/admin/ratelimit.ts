import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Login attempts: 8 per 10 minutes per IP. Upstash when configured (works across Vercel
// instances); otherwise a per-instance memory window, which still slows guessing.
let limiter: Ratelimit | null | undefined;
const memory = new Map<string, number[]>();
const WINDOW_MS = 10 * 60_000;
const MAX = 8;

export async function allowLoginAttempt(ip: string): Promise<boolean> {
  if (limiter === undefined) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    limiter =
      url && token
        ? new Ratelimit({ redis: new Redis({ url, token }), limiter: Ratelimit.slidingWindow(MAX, "10 m"), prefix: "keniya-admin-login" })
        : null;
  }
  if (limiter) {
    try {
      return (await limiter.limit(ip)).success;
    } catch (e) {
      console.error("admin login rate limit unavailable", e);
    }
  }
  const now = Date.now();
  const hits = (memory.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  memory.set(ip, hits);
  return hits.length <= MAX;
}
