import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { activateLineup } from "@/actions/admin/boxes";
import { BoxBuilder } from "@/components/admin/box-builder";
import { RulesForm } from "@/components/admin/rules-form";
import { Badge, Disclosure, PageHeader, Table } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { db, loadPostageHistory, must, signedUrls, type LineupRow } from "@/lib/admin/db";
import { splitNotes } from "@/lib/admin/clinical";
import { loadAdminContext } from "@/lib/admin/summary";
import { BOX_LABEL, BOX_SLUGS, OBJECTIVE_LABEL, isBoxSlug, type Objective } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Box builder" };

export default async function BoxPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isBoxSlug(slug)) notFound();
  const [ctx, history, versionsRes, photosRes] = await Promise.all([
    loadAdminContext(),
    loadPostageHistory(),
    db().from("box_lineups").select("*").eq("box_slug", slug).order("version", { ascending: false }).limit(20),
    db().from("product_photos").select("product_id, path, created_at").eq("kind", "front").order("created_at", { ascending: false }),
  ]);
  // Newest front photo per product, as short-lived signed URLs (private bucket).
  const fronts = new Map<string, string>();
  for (const ph of must(photosRes, "photos") as { product_id: string; path: string }[]) if (!fronts.has(ph.product_id)) fronts.set(ph.product_id, ph.path);
  const urls = await signedUrls([...fronts.values()]);
  const photos = Object.fromEntries([...fronts].flatMap(([id, path]) => (urls.get(path) ? [[id, urls.get(path)!]] : [])));
  const findings = Object.fromEntries(ctx.catalog.products.map((p) => [p.id, splitNotes(p.notes).prescreen]).filter(([, f]) => f));
  const versions = must(versionsRes, "versions") as LineupRow[];
  const b = ctx.boxes[slug];

  return (
    <>
      <PageHeader
        title={`${BOX_LABEL[slug]} box`}
        description={
          <>
            1. Press <b>Build box</b> to pick {ctx.rules[slug].total} snacks. 2. Swap any you don&apos;t want. 3. <b>Save &amp; activate</b>: new orders get that lineup.
            <span className="block text-xs">
              {b.lineup ? `Orders now get lineup v${b.lineup.version}, saved by ${b.lineup.created_by ?? "—"}.` : "No lineup is active yet."}
            </span>
          </>
        }
        actions={
          <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:gap-1">
            {BOX_SLUGS.map((s) => (
              <Button key={s} asChild size="sm" variant={s === slug ? "default" : "outline"} className="max-sm:h-11">
                <Link href={`/admin/boxes/${s}`} aria-current={s === slug ? "page" : undefined}>
                  {BOX_LABEL[s]}
                </Link>
              </Button>
            ))}
          </div>
        }
      />
      <BoxBuilder
        key={b.lineup?.id ?? "none"}
        slug={slug}
        rules={ctx.rules[slug]}
        settings={ctx.settings}
        snacks={ctx.catalog.snacks}
        extras={b.extras}
        initial={b.picks.map((p) => ({ product_id: p.snack.id, category: p.category }))}
        packagingOz={ctx.packOz}
        mailer={ctx.pkg ? { id: ctx.pkg.id, name: ctx.pkg.name, cents: ctx.pkg.cost_cents } : null}
        history={history}
        allRules={ctx.rules}
        photos={photos}
        findings={findings}
      />
      <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
        <Disclosure title="Box recipe" summary="saved default: ranges and hard limits">
          <RulesForm slug={slug} rules={ctx.rules[slug]} />
        </Disclosure>
        <Disclosure title="Saved lineups" summary={`${versions.length} saved · v${b.lineup?.version ?? "—"} active`}>
          <p className="mb-3 text-sm text-muted-foreground">Each time you save a lineup it is kept here. The active one is what new orders get; activate an older one to go back to it.</p>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">None saved yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Lineup</th>
                  <th>Status</th>
                  <th>How it was picked</th>
                  <th>By</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id} className={cn(v.status === "archived" && "text-muted-foreground")}>
                    <td>
                      v{v.version}
                      <div className="text-xs">{new Date(v.created_at).toLocaleDateString()}</div>
                    </td>
                    <td>
                      <Badge tone={v.status === "active" ? "good" : v.status === "draft" ? "info" : "muted"}>{v.status}</Badge>
                    </td>
                    <td className="text-xs">{v.objective ? (OBJECTIVE_LABEL[v.objective as Objective] ?? v.objective) : "—"}</td>
                    <td className="text-xs">{v.created_by ?? "—"}</td>
                    <td>
                      {v.status !== "active" && (
                        <form action={activateLineup}>
                          <input type="hidden" name="id" value={v.id} />
                          <Button size="xs" variant="outline">
                            Activate
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Disclosure>
      </div>
    </>
  );
}
