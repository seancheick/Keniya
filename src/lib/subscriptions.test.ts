import { expect, it, vi } from "vitest";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
import { saveSubscription } from "./subscriptions";

it("preserves the subscriber's updated address when checkout is redelivered", async () => {
  const saved: Record<string, unknown> = { shipping: { name: "New address" }, email: "current@example.com" };
  const db = { from: () => ({
    upsert: async (row: object, opts: { ignoreDuplicates?: boolean }) => {
      if (!opts.ignoreDuplicates) Object.assign(saved, row);
      return { error: null };
    },
    update: (row: object) => ({ eq: async () => { Object.assign(saved, row); return { error: null }; } }),
  }) } as unknown as SupabaseClient;
  const sub = { id: "sub_1", customer: "cus_1", status: "active", metadata: { box_slug: "heart" }, pause_collection: null,
    items: { data: [{ current_period_end: 1800000000, price: { unit_amount: 3900 } }] } } as unknown as Stripe.Subscription;
  await saveSubscription(db, sub, "old@example.com", { name: "Old address" });
  expect(saved.shipping).toEqual({ name: "New address" });
  expect(saved.email).toBe("current@example.com");
  expect(saved.status).toBe("active");
});
