import type { Metadata } from "next";
import Link from "next/link";
import { BoxFacts } from "@/components/admin/box-facts";
import { PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { fmt$, fmtPct } from "@/lib/admin/costing";
import { loadAdminContext } from "@/lib/admin/summary";
import { BOX_SLUGS } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Boxes" };

const STEPS = [
  { n: 1, title: "Add snacks", body: "Scan a label in Products → New, or send the package photos to Claude. It answers ✓ / ? / ✕ per box.", href: "/admin/products/new", cta: "Add a snack" },
  { n: 2, title: "Build each box", body: "Open a box, press Build box, swap anything marked ✕ for a suggestion. Save & activate when the label is all ✓.", href: null, cta: null },
  { n: 3, title: "Verify packages", body: "When snacks arrive, scan each package once to confirm the label in hand.", href: "/admin/verify", cta: "Verify" },
  { n: 4, title: "Pack & ship", body: "Orders get the live lineup. Fix any flag the order shows, then pack and ship.", href: "/admin/orders", cta: "Orders" },
] as const;

export default async function BoxesPage() {
  // Show each box's newest working lineup (a draft when it's newer than the live one).
  const { boxes, rules, settings } = await loadAdminContext(undefined, true);
  return (
    <>
      <PageHeader title="Boxes" description="Each box as its Snack Facts label: the limits every snack has to meet and how the current lineup measures up. ✓ is good, ✕ needs fixing." />
      <ol className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-3 rounded-xl border bg-card p-3">
            <span className="font-label flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-lg text-cream-card">{s.n}</span>
            <div className="min-w-0 text-sm">
              <p className="font-semibold">{s.title}</p>
              <p className="text-muted-foreground">{s.body}</p>
              {s.href && (
                <Link href={s.href} className="mt-1 inline-block font-medium underline underline-offset-2">
                  {s.cta} →
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
        {BOX_SLUGS.map((slug) => {
          const b = boxes[slug];
          const uncosted = b.picks.filter((p) => p.snack.unitCostCents === null).length;
          return (
            <div key={slug} className="space-y-2">
              <BoxFacts
                slug={slug}
                rules={rules[slug]}
                policy={settings.policy}
                picks={b.picks}
                extras={b.extras}
                checks={b.checks}
                lineupNote={b.lineup ? `${b.lineup.status === "active" ? "Live" : "Draft"} v${b.lineup.version}` : "no lineup yet"}
              />
              <Button asChild size="lg" className="h-12 w-full text-base">
                <Link href={`/admin/boxes/${slug}`}>{b.lineup ? "Open box builder" : "Build this box"}</Link>
              </Button>
              {b.cost && (
                <p className="text-center text-xs text-muted-foreground">
                  Can build {b.canBuild.n} · landed {fmt$(b.cost.totalCents)} · margin {fmtPct(b.cost.contributionPct)}
                  {uncosted ? ` · ${uncosted} without a cost yet` : ""}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
