import Link from "next/link";
import type { Metadata } from "next";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, Empty, FitBadges, PageHeader, StatusBadge, Table, fieldClass } from "@/components/admin/ui";
import { fmt$ } from "@/lib/admin/costing";
import { loadCatalog, loadSettings } from "@/lib/admin/db";
import { fitsBoxes, nutritionComplete, shipsUnderPolicy } from "@/lib/admin/rules";
import { BOX_LABEL, BOX_SLUGS, CATEGORIES, STATUSES, isBoxSlug } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Products" };

type SP = { q?: string; status?: string; box?: string; cat?: string; issue?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [{ snacks, products }, settings] = await Promise.all([loadCatalog(), loadSettings()]);
  const productBy = new Map(products.map((p) => [p.id, p]));
  const q = sp.q?.trim().toLowerCase() ?? "";

  const rows = snacks
    .map((s) => ({ s, p: productBy.get(s.id)!, fits: fitsBoxes(s, s.rejectReason) }))
    .filter(({ s, p, fits }) => {
      if (q && !`${s.code} ${s.name} ${s.brand ?? ""} ${p.upc ?? ""}`.toLowerCase().includes(q)) return false;
      if (sp.status && s.status !== sp.status) return false;
      if (sp.status === undefined && s.status === "Retired") return false;
      if (sp.box && isBoxSlug(sp.box) && !fits[sp.box].fits) return false;
      if (sp.cat && !s.categories.includes(sp.cat)) return false;
      if (sp.issue === "nutrition" && nutritionComplete(s)) return false;
      if (sp.issue === "cost" && s.unitCostCents !== null) return false;
      if (sp.issue === "ships" && shipsUnderPolicy(s, settings.policy).ok) return false;
      if (sp.issue === "none" && BOX_SLUGS.some((b) => fits[b].fits)) return false;
      return true;
    });

  return (
    <>
      <PageHeader
        title="Products"
        description={`${snacks.length} snacks in the library. Box fit is computed from nutrition and the pregnancy checks; hover a box chip for the reason.`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" title="Excel file of every snack: status, pre-screen finding, box fit, P1–P9 checks, nutrition and allergens, columns for the clinician's verdict, and a Legend sheet. No costs.">
              <a href="/admin/reports/export?table=clinical_review" download>
                <Download /> Export for clinician
              </a>
            </Button>
            <Button asChild>
              <Link href="/admin/products/new">
                <Plus /> Add product
              </Link>
            </Button>
          </div>
        }
      />
      <Card className="mb-4">
        <form className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
          <input name="q" defaultValue={sp.q} placeholder="Search name, brand, code, UPC" className={fieldClass} aria-label="Search" />
          <select name="status" defaultValue={sp.status ?? ""} className={fieldClass} aria-label="Status">
            <option value="">Active (not retired)</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select name="box" defaultValue={sp.box ?? ""} className={fieldClass} aria-label="Fits box">
            <option value="">Any box</option>
            {BOX_SLUGS.map((b) => (
              <option key={b} value={b}>
                Fits {BOX_LABEL[b]}
              </option>
            ))}
          </select>
          <select name="cat" defaultValue={sp.cat ?? ""} className={fieldClass} aria-label="Category">
            <option value="">Any category</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select name="issue" defaultValue={sp.issue ?? ""} className={fieldClass} aria-label="Needs attention">
            <option value="">Any</option>
            <option value="nutrition">Missing nutrition</option>
            <option value="cost">No cost yet</option>
            <option value="ships">Doesn&apos;t ship</option>
            <option value="none">Fits no box</option>
          </select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </Card>

      {rows.length === 0 ? (
        <Empty action={<Button asChild variant="outline"><Link href="/admin/products/new">Add a product</Link></Button>}>
          No products match.
        </Empty>
      ) : (
        <Card>
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
                  </td>
                  <td className="text-xs text-muted-foreground">{s.categories.join(", ") || "—"}</td>
                  <td className="num">{s.onHand || "—"}</td>
                  <td className="num">{fmt$(s.unitCostCents)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
