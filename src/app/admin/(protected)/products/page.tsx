import Link from "next/link";
import type { Metadata } from "next";
import { Download, Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, Empty, FitBadges, PageHeader, StatusBadge, Table, fieldClass } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { fmt$ } from "@/lib/admin/costing";
import { loadBoxRules, loadCatalog, loadSettings } from "@/lib/admin/db";
import { eligibleBoxes, isClinicianApproved, nutritionComplete, shipsUnderPolicy } from "@/lib/admin/rules";
import { BOX_LABEL, BOX_SLUGS, CATEGORIES, isBoxSlug, type BoxSlug } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Products" };

type SP = { q?: string; status?: string; box?: string; cat?: string; issue?: string };

const SHORT: Record<BoxSlug, string> = { pregnancy_comfort: "Preg", blood_sugar: "Carb", heart: "Heart" };

/** Review stages in the order a product moves through them. "Legacy" = approved in the old workbook, no named clinician. */
const TABS = [
  { key: "", label: "All" },
  { key: "Candidate", label: "Candidate", hint: "Not reviewed yet" },
  { key: "Pre-approved", label: "Pre-approved", hint: "Waiting for the clinician" },
  { key: "Approved", label: "Approved", hint: "Named clinician approved it" },
  { key: "Legacy", label: "Legacy approval", hint: "Approved in the workbook; needs re-attestation" },
  { key: "Rejected", label: "Rejected" },
  { key: "Retired", label: "Retired" },
] as const;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [{ snacks, products }, settings, rules] = await Promise.all([loadCatalog(), loadSettings(), loadBoxRules()]);
  const productBy = new Map(products.map((p) => [p.id, p]));
  const q = sp.q?.trim().toLowerCase() ?? "";
  const stage = (s: (typeof snacks)[number]) => (s.status === "Approved" && !isClinicianApproved(s) ? "Legacy" : s.status);

  // Everything except the status tab, so each tab can show how many products it would hold.
  const base = snacks
    .map((s) => ({ s, p: productBy.get(s.id)!, fits: eligibleBoxes(s, rules, settings.policy, s.rejectReason) }))
    .filter(({ s, p, fits }) => {
      if (q && !`${s.code} ${s.name} ${s.brand ?? ""} ${p.upc ?? ""}`.toLowerCase().includes(q)) return false;
      if (sp.box && isBoxSlug(sp.box) && !fits[sp.box].fits) return false;
      if (sp.cat && !s.categories.includes(sp.cat)) return false;
      if (sp.issue === "nutrition" && nutritionComplete(s)) return false;
      if (sp.issue === "cost" && s.unitCostCents !== null) return false;
      if (sp.issue === "ships" && shipsUnderPolicy(s, settings.policy).ok) return false;
      if (sp.issue === "none" && BOX_SLUGS.some((b) => fits[b].fits)) return false;
      return true;
    });
  const count = (key: string) => base.filter(({ s }) => (key === "" ? s.status !== "Retired" : stage(s) === key)).length;
  const activeTab = TABS.some((t) => t.key === (sp.status ?? "")) ? (sp.status ?? "") : "";
  const rows = base.filter(({ s }) => (activeTab === "" ? s.status !== "Retired" : stage(s) === activeTab));
  const tabHref = (key: string) => {
    const qs = new URLSearchParams(Object.entries({ q: sp.q, box: sp.box, cat: sp.cat, issue: sp.issue, status: key || undefined }).filter(([, v]) => v) as [string, string][]);
    return `/admin/products${qs.size ? `?${qs}` : ""}`;
  };
  const activeFilters = [sp.box, sp.cat, sp.issue].filter(Boolean).length;
  const eligibleChips = (fits: Record<BoxSlug, { fits: boolean }>) => BOX_SLUGS.filter((b) => fits[b].fits);

  return (
    <>
      <PageHeader
        title="Products"
        description={`${snacks.length} snacks. A ✓ box means eligible: nutrition rules, hard limits, shipping policy and status all pass. Tap or hover it for the reason.`}
        actions={
          <>
            <Button asChild variant="outline" title="Excel review queue with decision fields, instructions and full label evidence. Includes every product on Details. No costs.">
              <a href="/admin/reports/export?table=clinical_review" download>
                <Download /> Export for clinician
              </a>
            </Button>
            <Button asChild>
              <Link href="/admin/products/new">
                <Plus /> Add product
              </Link>
            </Button>
          </>
        }
      />

      {/* Review stage: one tap, with counts. Scrolls sideways on a phone. */}
      <nav aria-label="Review stage" className="-mx-4 mb-3 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {TABS.filter((t) => !["Rejected", "Retired"].includes(t.key) || count(t.key) > 0 || t.key === activeTab).map((t) => {
            const on = t.key === activeTab;
            return (
              <li key={t.key}>
                <Link
                  href={tabHref(t.key)}
                  aria-current={on ? "page" : undefined}
                  title={"hint" in t ? t.hint : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap transition-colors sm:min-h-9 sm:px-3",
                    on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                  )}
                >
                  {t.label}
                  <span className={cn("text-xs tabular-nums", on ? "text-primary-foreground/80" : "text-muted-foreground")}>{count(t.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form className="mb-4 space-y-2">
        {activeTab && <input type="hidden" name="status" value={activeTab} />}
        <div className="flex gap-2">
          <input name="q" defaultValue={sp.q} placeholder="Search name, brand, code, UPC" className={cn(fieldClass, "max-sm:h-11")} aria-label="Search" type="search" enterKeyHint="search" />
          <Button type="submit" variant="secondary" className="max-sm:h-11">
            Search
          </Button>
        </div>
        <details className="group rounded-xl border bg-card" open={activeFilters > 0}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal className="size-4" />
            More filters
            {activeFilters > 0 && <Badge tone="info">{activeFilters} on</Badge>}
          </summary>
          <div className="grid gap-2 border-t p-3 sm:grid-cols-4">
            <select name="box" defaultValue={sp.box ?? ""} className={cn(fieldClass, "max-sm:h-11")} aria-label="Eligible for box">
              <option value="">Any box</option>
              {BOX_SLUGS.map((b) => (
                <option key={b} value={b}>
                  Eligible for {BOX_LABEL[b]}
                </option>
              ))}
            </select>
            <select name="cat" defaultValue={sp.cat ?? ""} className={cn(fieldClass, "max-sm:h-11")} aria-label="Category">
              <option value="">Any category</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select name="issue" defaultValue={sp.issue ?? ""} className={cn(fieldClass, "max-sm:h-11")} aria-label="Needs attention">
              <option value="">Anything</option>
              <option value="nutrition">Missing nutrition</option>
              <option value="cost">No cost yet</option>
              <option value="ships">Doesn&apos;t ship</option>
              <option value="none">Eligible for no box</option>
            </select>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" className="flex-1 max-sm:h-11">
                Apply
              </Button>
              {activeFilters > 0 && (
                <Button asChild variant="ghost" className="max-sm:h-11">
                  <Link href={tabHref(activeTab).split("?")[0] + (activeTab ? `?status=${activeTab}` : "")}>Clear</Link>
                </Button>
              )}
            </div>
          </div>
        </details>
      </form>

      {rows.length === 0 ? (
        <Empty action={<Button asChild variant="outline"><Link href="/admin/products">Show all products</Link></Button>}>
          No products match.
        </Empty>
      ) : (
        <>
          {/* Phones: one card per product. */}
          <ul className="space-y-2 sm:hidden">
            {rows.map(({ s, fits }) => (
              <li key={s.id}>
                <Link href={`/admin/products/${s.id}`} className="block rounded-xl border bg-card p-3 active:bg-muted/50">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-balance">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{s.code}</span> · {s.brand ?? "—"} · {s.type}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    {eligibleChips(fits).map((b) => (
                      <Badge key={b} tone="good">{`✓ ${SHORT[b]}`}</Badge>
                    ))}
                    {eligibleChips(fits).length === 0 && <Badge tone="muted">No box</Badge>}
                    {stage(s) === "Legacy" && <Badge tone="warn">Legacy approval</Badge>}
                    {!nutritionComplete(s) && <Badge tone="bad">no nutrition</Badge>}
                    {!shipsUnderPolicy(s, settings.policy).ok && <Badge tone="warn">doesn&apos;t ship</Badge>}
                    <span className="ml-auto text-muted-foreground tabular-nums">
                      {s.onHand ? `${s.onHand} in stock · ` : ""}
                      {fmt$(s.unitCostCents)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <Card className="hidden sm:block">
            <Table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Product</th>
                  <th>Boxes</th>
                  <th>Status</th>
                  <th>Categories</th>
                  <th className="num">On hand</th>
                  <th className="num">Unit cost</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, fits }) => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs text-muted-foreground">{s.code}</td>
                    <td className="max-w-80">
                      <Link href={`/admin/products/${s.id}`} className="font-medium hover:underline">
                        {s.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {s.brand ?? "—"} · {s.type} · {s.form}
                        {!nutritionComplete(s) && (
                          <Badge tone="bad" className="ml-1">
                            no nutrition
                          </Badge>
                        )}
                        {!shipsUnderPolicy(s, settings.policy).ok && (
                          <Badge tone="warn" className="ml-1" title={shipsUnderPolicy(s, settings.policy).reason}>
                            doesn&apos;t ship
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td>
                      <FitBadges fits={fits} />
                    </td>
                    <td>
                      <StatusBadge status={s.status} />
                      {stage(s) === "Legacy" && <div className="mt-1 text-xs text-amber-700">needs re-attestation</div>}
                    </td>
                    <td className="text-xs text-muted-foreground">{s.categories.join(", ") || "—"}</td>
                    <td className="num">{s.onHand || "—"}</td>
                    <td className="num">{fmt$(s.unitCostCents)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
