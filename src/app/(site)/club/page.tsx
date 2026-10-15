import type { Metadata } from "next";
import { ClubLinkForm, ClubManage, type ClubCard } from "@/components/club-manage";
import { Sticker } from "@/components/wrap";
import { boxes } from "@/lib/box";
import { verifyClubLink } from "@/lib/club-link";
import { getSupabaseAdminStrict } from "@/lib/supabase";
import { dateLabel, subscriptionsById, usd, type ClubRow } from "@/lib/subscriptions";
import { clubPaymentIssue } from "@/lib/club-shared";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Manage your Snack Club",
  description: "Skip a month, pause, change your address or cancel your Keniya Monthly Snack Club.",
  alternates: { canonical: "/club" },
  // The manage link carries a token; keep it out of search and out of Referer headers.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function card(row: ClubRow): ClubCard {
  const next = dateLabel(row.current_period_end);
  const state: ClubCard["state"] =
    row.status === "canceled" || row.status === "incomplete_expired" ? "ended"
      : row.cancel_at_period_end ? "cancelling"
        : row.paused && row.resumes_at ? "skipping"
          : row.paused ? "paused"
            : "active";
  const statusLine = {
    active: next ? `Next renewal: ${next}. We email you a few days before.` : "Active.",
    skipping: `Skipping renewals until ${dateLabel(row.resumes_at)}. Billing resumes on the next scheduled renewal after that.`,
    paused: "Paused. No boxes and no charges until you resume.",
    cancelling: `Cancels after ${next}. No more charges after that.`,
    ended: "Cancelled. Thanks for snacking with us.",
  }[state];
  const a = row.shipping?.address ?? {};
  return {
    id: row.stripe_subscription_id,
    boxName: boxes.find((b) => b.slug === row.box_slug)?.name ?? "Keniya box",
    priceLabel: usd(row.price_cents),
    state,
    statusLine,
    paymentIssue: clubPaymentIssue(row.status),
    shipTo: row.shipping ? [row.shipping.name, a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", ") : null,
    address: { name: row.shipping?.name ?? "", line1: a.line1 ?? "", line2: a.line2 ?? "", city: a.city ?? "", state: a.state ?? "", postal_code: a.postal_code ?? "" },
  };
}

export default async function ClubPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const ids = verifyClubLink(t);
  const rows = ids ? await subscriptionsById(getSupabaseAdminStrict(), ids) : [];

  return (
    <article className="mx-auto max-w-3xl px-5 py-12 lg:py-20">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-headline text-ink">Your Snack Club</h1>
          <p className="mt-3 max-w-[50ch] text-lg leading-relaxed text-ink-soft">
            Skip a month, pause, change where it ships or cancel. No calls, no emails needed.
          </p>
        </div>
        <Sticker tone="butter" className="hidden w-24 rotate-12 sm:grid">
          <span className="font-label text-xs uppercase leading-tight">Skip
            <br />
            anytime</span>
        </Sticker>
      </div>

      <div className="mt-10">
        {ids && t && rows.length ? (
          <ClubManage token={t} cards={rows.map(card)} />
        ) : (
          <div className="rounded-[6px] border-2 border-ink bg-cream-card p-5 sm:p-6">
            <p className="font-display text-2xl font-extrabold tracking-tight text-ink">
              {t ? "That link has expired." : "We'll email you a link."}
            </p>
            <p className="mb-5 mt-1.5 text-ink-soft">
              Enter the email you subscribed with. The link works for 24 hours.
            </p>
            <ClubLinkForm />
          </div>
        )}
      </div>
      <p className="mt-8 text-sm text-ink-soft">
        Questions? <a href={`mailto:${site.email}`} className="font-semibold text-ink underline underline-offset-4">{site.email}</a>
      </p>
    </article>
  );
}
