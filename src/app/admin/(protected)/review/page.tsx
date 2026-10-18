import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Empty, PageHeader } from "@/components/admin/ui";
import { FindingResolver, StatusControls } from "@/components/admin/product-widgets";
import { isDecided, openFindings } from "@/lib/admin/rules";
import type { Snack } from "@/lib/admin/types";
import { requireAdmin } from "@/lib/admin/auth";
import { clinicianReviewRows } from "@/lib/admin/clinical-packet";
import { packetInput } from "@/lib/admin/packet-data";
import { loadAdminContext } from "@/lib/admin/summary";
import { BOX_LABEL, BOX_SLUGS } from "@/lib/admin/types";
import { limitsLine } from "@/lib/admin/clinical-packet";

export const metadata: Metadata = { title: "PharmaGuide Team review" };

export default async function ReviewPage() {
  const admin = await requireAdmin();
  const ctx = await loadAdminContext(undefined, true);
  const rows = clinicianReviewRows(packetInput(ctx), ctx.catalog.snacks);
  return <>
    <PageHeader title="PharmaGuide Team review" description="Review internally completed products one at a time. Approve, request a specific change, or reject. Finished box packets stay separate until their lineups are complete."
      actions={<Button asChild><a href="/admin/reports/export?table=team_packet" download><Download /> Download finished packet</a></Button>} />
    <Card title="Current box standards"><div className="space-y-2 text-sm">{BOX_SLUGS.map((slug) => <p key={slug}><strong>{BOX_LABEL[slug]}: </strong>{limitsLine(ctx.rules[slug])}</p>)}</div></Card>
    <ScreeningQueue snacks={ctx.catalog.snacks} clinician={admin.role === "clinician"} />
    {!rows.length ? <Empty><strong>No products awaiting review</strong><p>Products appear here after their exact-label evidence and internal screening are complete.</p></Empty> :
      <div className="space-y-4">{rows.map((row) => {
        const s = ctx.catalog.byId.get(String(row["Product ID"]))!;
        const fields = ["Eligible boxes", "Exact pack", "Unit UPC", "Verified outer-pack barcode", "Label source", "Keniya recommendation", "Calories", "Protein (g)", "Fiber (g)", "Total carbs (g)", "Added sugar (g)", "Sodium (mg)", "Saturated fat (g)", "Caffeine (mg)", "Sugar alcohols (g)", "Ingredients", "Allergens", "Pregnancy checks", "Exceptions / pathways"];
        return <Card key={s.id} title={`${s.code} · ${s.name}`}><dl className="grid gap-2 text-sm sm:grid-cols-[12rem_1fr]">{fields.map((field) => <div key={field} className="contents"><dt className="text-muted-foreground">{field}</dt><dd className="break-words">{String(row[field] ?? "—")}</dd></div>)}</dl>
          {admin.role === "clinician" && <div className="mt-4"><StatusControls clinician id={s.id} status={s.status} /></div>}
        </Card>;
      })}</div>}
  </>;
}

/** Safety findings waiting on the PharmaGuide Team: a held product never reaches the box packet otherwise. */
function ScreeningQueue({ snacks, clinician }: { snacks: Snack[]; clinician: boolean }) {
  const waiting = snacks
    .filter((s) => s.status !== "Retired" && s.status !== "Rejected")
    .map((s) => ({ s, open: openFindings(s).filter((f) => f.kind === "safety" && f.severity !== "info" && !isDecided(s, f) && !(f.code === "caffeine_source" && typeof s.caffeine_mg === "number")) }))
    .filter((x) => x.open.length);
  if (!waiting.length) return null;
  return (
    <Card title={`Screening decisions waiting (${waiting.length})`}>
      <p className="mb-3 text-sm text-muted-foreground">
        Current ingredients matched a pregnancy no-go, watchlist or review rule. These products stay out of Pregnancy, Gestational Diabetes and Postpartum until decided. A decision applies only to this formula and ingredient text.
      </p>
      <div className="space-y-4">
        {waiting.map(({ s, open }) => (
          <div key={s.id} className="space-y-2">
            <p className="text-sm font-medium">{s.code} · {s.name}</p>
            <p className="text-xs text-muted-foreground">{s.ingredients}</p>
            {open.map((f) =>
              clinician ? (
                <FindingResolver key={f.key} id={s.id} findingKey={f.key} label={`${f.check ? `${f.check}: ` : ""}${f.label} (${f.evidence})`} />
              ) : (
                <p key={f.key} className="text-sm text-amber-800">{f.check ? `${f.check}: ` : ""}{f.label} ({f.evidence})</p>
              ),
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
