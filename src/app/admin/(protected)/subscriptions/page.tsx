import type { Metadata } from "next";
import { Badge, Card, Empty, PageHeader, Table, type Tone } from "@/components/admin/ui";
import { fmt$ } from "@/lib/admin/costing";
import { db } from "@/lib/admin/db";
import { BOX_LABEL, isBoxSlug } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Snack Club" };

type Row = {
  stripe_subscription_id: string;
  email: string;
  box_slug: string;
  status: string;
  paused: boolean;
  resumes_at: string | null;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  price_cents: number;
  cancel_reason: string | null;
  created_at: string;
};

function state(r: Row): [string, Tone] {
  if (r.status === "canceled") return ["Cancelled", "muted"];
  if (r.cancel_at_period_end) return ["Cancelling", "warn"];
  if (r.paused) return [r.resumes_at ? `Skipping until ${new Date(r.resumes_at).toLocaleDateString()}` : "Paused", "info"];
  if (r.status === "past_due" || r.status === "unpaid") return ["Payment issue", "bad"];
  return ["Active", "good"];
}

export default async function SubscriptionsPage() {
  const { data, error } = await db().from("subscriptions").select("*").order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];
  const active = rows.filter((r) => r.status !== "canceled" && !r.paused && !r.cancel_at_period_end);
  const reasons = Object.entries(
    rows.reduce<Record<string, number>>((acc, r) => (r.cancel_reason ? { ...acc, [r.cancel_reason]: (acc[r.cancel_reason] ?? 0) + 1 } : acc), {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader
        title="Snack Club"
        description="Monthly subscriptions mirrored from Stripe. Renewals appear in Orders once paid; a renewal for a box without an approved lineup is held and not charged."
      />
      {error ? (
        <Empty>The Snack Club table isn&rsquo;t in the database yet. Run the Snack Club migration (pnpm db:migrate).</Empty>
      ) : rows.length === 0 ? (
        <Empty>No Snack Club members yet. Switch the club on in Settings → Offers.</Empty>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card title="Active">{active.length}</Card>
            <Card title="Monthly revenue">{fmt$(active.reduce((s, r) => s + r.price_cents, 0))}</Card>
            <Card title="Paused / skipping">{rows.filter((r) => r.paused && r.status !== "canceled").length}</Card>
            <Card title="Cancelling / cancelled">{rows.filter((r) => r.cancel_at_period_end || r.status === "canceled").length}</Card>
          </div>
          {reasons.length > 0 && (
            <Card title="Why people cancel" className="mb-4">
              <ul className="flex flex-wrap gap-2 text-sm">
                {reasons.map(([r, n]) => (
                  <li key={r}><Badge tone="muted">{r} · {n}</Badge></li>
                ))}
              </ul>
            </Card>
          )}
          <Card>
            <Table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Box</th>
                  <th>State</th>
                  <th>Next renewal</th>
                  <th className="num">Price</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const [label, tone] = state(r);
                  return (
                    <tr key={r.stripe_subscription_id}>
                      <td>
                        {r.email}
                        <div className="text-xs text-muted-foreground">since {new Date(r.created_at).toLocaleDateString()}</div>
                      </td>
                      <td>{isBoxSlug(r.box_slug) ? BOX_LABEL[r.box_slug] : r.box_slug}</td>
                      <td>
                        <Badge tone={tone}>{label}</Badge>
                        {r.cancel_reason && <div className="mt-1 text-xs text-muted-foreground">{r.cancel_reason}</div>}
                      </td>
                      <td className="text-xs">{r.current_period_end ? new Date(r.current_period_end).toLocaleDateString() : "—"}</td>
                      <td className="num">{fmt$(r.price_cents)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
