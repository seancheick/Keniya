import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, PageHeader, Stat } from "@/components/admin/ui";
import { fmt$, fmtPct } from "@/lib/admin/costing";
import { blockingFailures, lineupStage } from "@/lib/admin/rules";
import { loadAdminContext } from "@/lib/admin/summary";
import { BOX_LABEL, BOX_SLUGS } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Boxes" };

export default async function BoxesPage() {
  const { boxes, settings } = await loadAdminContext();
  return (
    <>
      <PageHeader title="Boxes" description="Each box's active lineup, whether it passes its rules, what it costs and how many you can build." />
      <div className="grid gap-4 md:grid-cols-3">
        {BOX_SLUGS.map((slug) => {
          const b = boxes[slug];
          const fails = blockingFailures(b.checks);
          const stage = lineupStage([...b.picks, ...b.extras.map((snack) => ({ snack }))], b.ready);
          return (
            <Link key={slug} href={`/admin/boxes/${slug}`} className="block">
              <Card className="h-full transition-colors hover:border-primary">
                <div className="mb-3 flex items-center gap-2">
                  <p className="font-display text-xl">{BOX_LABEL[slug]}</p>
                  <Badge tone={b.lineup ? stage.tone : "bad"} className="ml-auto" title={stage.detail}>
                    {b.lineup ? (b.ready ? stage.label : `FIX · ${fails.length}`) : "No lineup"}
                  </Badge>
                </div>
                {b.cost ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Can build" value={b.canBuild.n} hint={b.canBuild.limiting ? `Limit: ${b.canBuild.limiting.name}` : undefined} tone={b.canBuild.n < settings.runSize[slug] ? "warn" : "good"} />
                    <Stat label="Snacks" value={fmt$(b.cost.snackCents)} />
                    <Stat label="Landed" value={fmt$(b.cost.totalCents)} />
                    <Stat label="Margin" value={fmtPct(b.cost.contributionPct)} tone={b.cost.contributionCents < 0 ? "bad" : "good"} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active lineup yet. Open to build one.</p>
                )}
                {fails.length > 0 && (
                  <ul className="mt-3 space-y-0.5 text-xs text-red-700">
                    {fails.slice(0, 4).map((c) => (
                      <li key={c.key}>
                        ✕ {c.label}: {c.value}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
