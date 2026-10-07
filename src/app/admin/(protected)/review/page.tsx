import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Empty, PageHeader } from "@/components/admin/ui";
import { StatusControls } from "@/components/admin/product-widgets";
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
