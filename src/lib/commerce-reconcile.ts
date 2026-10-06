import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

type Hold = { request_key: string; session_id: string | null; created_at: string; expires_at: string; invalidation_pending?: boolean };
/** Free only holds proven unpaid by Stripe; listing failure or truncation retains capacity. */
export async function reconcileCheckoutHolds(db: SupabaseClient, stripe: Stripe, slug: string, now = Date.now()) {
  const holds: Hold[] = [];
  for (let page = 0; ; page++) {
    if (page >= 100) throw new Error("Checkout reconciliation limit; holds preserved");
    const { data, error } = await db.from("checkout_reservations").select("request_key, session_id, created_at, expires_at, invalidation_pending")
      .eq("box_slug", slug).eq("consumed", false).eq("released", false)
      .or(`expires_at.lte.${new Date(now).toISOString()},invalidation_pending.eq.true`)
      .order("request_key").range(page * 100, page * 100 + 99);
    if (error) throw new Error(error.message);
    holds.push(...(data ?? []) as Hold[]);
    if ((data ?? []).length < 100) break;
  }
  for (const hold of holds) {
    let sessions: Stripe.Checkout.Session[];
    if (hold.session_id) sessions = [await stripe.checkout.sessions.retrieve(hold.session_id)];
    else {
      // Let in-flight requests finish; their original expiry cannot create a valid session later.
      if (!hold.invalidation_pending && new Date(hold.expires_at).getTime() > now - 5 * 60_000) continue;
      sessions = [];
      let cursor: string | undefined;
      let completed = false;
      for (let page = 0; page < 100; page++) {
        const list = await stripe.checkout.sessions.list({ limit: 100, created: { gte: Math.floor(new Date(hold.created_at).getTime() / 1000), lte: Math.ceil(new Date(hold.expires_at).getTime() / 1000) }, ...(cursor ? { starting_after: cursor } : {}) });
        sessions.push(...list.data.filter(s => s.metadata?.reservation_key === hold.request_key && s.metadata?.box_slug === slug));
        if (!list.has_more) { completed = true; break; }
        cursor = list.data.at(-1)?.id;
        if (!cursor) throw new Error("Incomplete Stripe checkout reconciliation page");
      }
      if (!completed) throw new Error("Stripe reconciliation pagination limit; hold preserved");
    }
    if (hold.invalidation_pending) {
      sessions = await Promise.all(sessions.map(s => s.status === "open" ? stripe.checkout.sessions.expire(s.id) : Promise.resolve(s)));
    }
    const paid = sessions.find(s => s.payment_status === "paid");
    const release = (!sessions.length && new Date(hold.expires_at).getTime() <= now - 5 * 60_000) || (sessions.length > 0 && sessions.every(s => s.status === "expired" && s.payment_status !== "paid"));
    const bind = paid ?? sessions[0];
    const update = { ...(bind ? { session_id: bind.id, session_url: bind.url } : {}), ...(release ? { released: true } : {}) };
    if (Object.keys(update).length) {
      const { error: writeError } = await db.from("checkout_reservations").update(update).eq("request_key", hold.request_key).eq("consumed", false);
      if (writeError) throw new Error(writeError.message);
    }
  }
}

/** Call after an admission-affecting admin mutation. Never release an uncertain payment. */
export async function expireInvalidCheckoutSessions(slugs: readonly string[]) {
  const { getSupabaseAdminStrict } = await import("@/lib/supabase");
  const { getStripe } = await import("@/lib/stripe");
  const db = getSupabaseAdminStrict();
  // Mark first: retries and in-flight creation binding fail closed even if Stripe is down.
  const { data, error } = await db.from("checkout_reservations")
    .update({ invalidation_pending: true }).in("box_slug", [...slugs]).eq("consumed", false).eq("released", false)
    .select("request_key,session_id");
  if (error) throw new Error(error.message);
  const stripe = getStripe();
  if (!stripe && data?.length) throw new Error("Stripe unavailable; checkout invalidation pending");
  for (const hold of data ?? []) {
    if (!hold.session_id) continue; // The creator's atomic binding rejects and expires it.
    let session = await stripe!.checkout.sessions.retrieve(hold.session_id);
    if (session.status === "open") session = await stripe!.checkout.sessions.expire(session.id);
    if (session.status === "expired" && session.payment_status !== "paid") {
      const { error: releaseError } = await db.from("checkout_reservations").update({ released: true })
        .eq("request_key", hold.request_key).eq("consumed", false);
      if (releaseError) throw new Error(releaseError.message);
    }
  }
  if (stripe) for (const slug of slugs) await reconcileCheckoutHolds(db, stripe, slug);
}
