import { ProductDelete } from "@/components/admin/product-delete";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProductPhoto } from "@/actions/admin/products";
import { PhotoUpload, PriceSightingForm, StatusControls } from "@/components/admin/product-widgets";
import { Badge, Card, FitBadges, FitReasons, PageHeader, StatusBadge, Table, TextLink, expiryTone } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { fmt$ } from "@/lib/admin/costing";
import {
  db,
  loadBoxRules,
  loadSettings,
  loadVendors,
  must,
  signedUrls,
  toSnack,
  type LotRow,
  type ProductRow,
  type PurchasePackRow,
  type VendorPriceRow,
  type VersionRow,
} from "@/lib/admin/db";
import { daysUntil } from "@/lib/admin/optimizer";
import { eligibleBoxes, shipsUnderPolicy } from "@/lib/admin/rules";
import { BOX_LABEL, NUTRIENT_KEYS, PREGNANCY_CHECK_KEYS, ROLE_KEYS, ROLE_LABEL, type BoxSlug } from "@/lib/admin/types";

import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Product" };

const NUTRIENT_LABEL: Record<(typeof NUTRIENT_KEYS)[number], string> = {
  calories: "Calories",
  protein_g: "Protein g",
  fiber_g: "Fiber g",
  carbs_g: "Carbs g",
  added_sugar_g: "Added sugar g",
  sodium_mg: "Sodium mg",
  caffeine_mg: "Caffeine mg",
  sat_fat_g: "Sat fat g",
  sugar_alcohols_g: "Sugar alcohols g",
};

const date = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const pr = await db().from("products").select("*").eq("id", id).maybeSingle();
  if (!pr.data) notFound();
  const p = pr.data as ProductRow;

  const packs = must(await db().from("purchase_packs").select("*").eq("product_id", id), "purchase packs") as PurchasePackRow[];
  const [versionsRes, lotsRes, pricesRes, photosRes, usageRes, shippedRes, vendors, settings, rules] = await Promise.all([
    db().from("product_versions").select("*").eq("product_id", id).order("version", { ascending: false }),
    db().from("purchase_lots").select("*").eq("product_id", id).order("purchased_at", { ascending: false }),
    db().from("vendor_prices").select("*").eq("product_id", id).order("seen_at", { ascending: false }).limit(50),
    db().from("product_photos").select("*").eq("product_id", id).order("created_at", { ascending: false }),
    db().from("lineup_items").select("lineup_id, box_lineups!inner(box_slug, status, version)").eq("product_id", id),
    db().from("shipment_items").select("qty").eq("product_id", id),
    loadVendors(),
    loadSettings(),
    loadBoxRules(),
  ]);
  const versions = must(versionsRes, "versions") as VersionRow[];
  const lots = (must(lotsRes, "lots") as LotRow[]).map((l) => ({ ...l, unit_cost_cents: Number(l.unit_cost_cents) }));
  const prices = (must(pricesRes, "prices") as VendorPriceRow[]).map((x) => ({ ...x, unit_cost_cents: Number(x.unit_cost_cents) }));
  const photos = must(photosRes, "photos") as { id: string; kind: string; path: string; created_at: string }[];
  const usage = (must(usageRes, "usage") as unknown as { box_lineups: { box_slug: BoxSlug; status: string; version: number } }[]).filter(
    (u) => u.box_lineups.status !== "archived",
  );
  const shippedUnits = (must(shippedRes, "shipped") as { qty: number }[]).reduce((s, r) => s + r.qty, 0);
  const current = versions.find((v) => v.is_current);
  const snack = toSnack(p, current, lots, prices[0]?.unit_cost_cents ?? null, packs);
  const fits = eligibleBoxes(snack, rules, settings.policy, p.reject_reason);
  const ships = shipsUnderPolicy(snack, settings.policy);
  const urls = await signedUrls(photos.map((x) => x.path));
  const vendorName = (vid: string | null) => vendors.find((v) => v.id === vid)?.name ?? "—";

  return (
    <>
      <PageHeader
        title={p.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{p.code}</span>
            {p.brand && <span>· {p.brand}</span>}
            <span title="Barcode identity (who says this code is this exact pack), separate from the label check">
              · {p.upc ? `UPC ${p.upc}` : "No barcode of its own"} ({p.barcode_status ?? "unverified"})
            </span>
            {packs.map((x) => (
              <span key={x.id} title={x.description ?? undefined}>
                · Box {x.gtin} = {x.units_per_pack} units ({x.barcode_status})
              </span>
            ))}
            <span>
              · {p.type} · {p.form}
            </span>
            <StatusBadge status={p.status} />
          </span>
        }
        actions={
          <>
            {admin.role === "admin" && <ProductDelete id={id} name={p.name} detail />}
            <Button asChild variant="outline">
              <Link href={`/admin/products/${id}/edit`}>Edit / new version</Link>
            </Button>
            <Button asChild>
              <Link href={`/admin/inventory/log?product=${id}`}>Log purchase</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Box fit" action={<FitBadges fits={fits} compact />}>
            <FitReasons fits={fits} />
            {!ships.ok && <p className="mt-2 text-sm text-amber-700">Doesn&apos;t ship under your policy: {ships.reason}</p>}
            {p.status === "Rejected" && <p className="mt-2 text-sm text-red-700">Rejected: {p.reject_reason}</p>}
            <div className="mt-4 border-t pt-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Review
                {p.prescreened_by ? ` · pre-screened by ${p.prescreened_by} on ${date(p.prescreened_at)}` : ""}
                {p.reviewed_by ? ` · clinician decision by ${p.reviewed_by} on ${date(p.reviewed_at)}` : p.status === "Approved" ? " · imported status: needs clinician review" : ""}
              </p>
              <StatusControls clinician={admin.role === "clinician"} id={id} status={p.status} legacyApproval={p.status === "Approved" && !p.reviewed_by} />
            </div>
          </Card>

          <Card
            title={`Nutrition · formula v${current?.version ?? "—"}`}
            action={
              current?.verified_at ? (
                <Badge tone="good" className="max-w-full text-left whitespace-normal">
                  Verified {date(current.verified_at)} · {current.nutrition_source ?? "source?"}
                  {current.verified_by ? ` · ${current.verified_by}` : ""}
                </Badge>
              ) : (
                <Badge tone="warn" className="max-w-full text-left whitespace-normal">Not verified{current?.nutrition_source ? ` · ${current.nutrition_source}` : ""}</Badge>
              )
            }
          >
            <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm sm:grid-cols-5">
              {NUTRIENT_KEYS.map((k) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{NUTRIENT_LABEL[k]}</dt>
                  <dd className={snack[k] === null ? "text-red-700" : "tabular-nums"}>{snack[k] ?? "missing"}</dd>
                </div>
              ))}
              <div>
                <dt className="text-xs text-muted-foreground">Unit weight</dt>
                <dd>{snack.unit_wt_oz ?? "—"} oz</dd>
              </div>
            </dl>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Pregnancy checks</dt>
                <dd className="flex flex-wrap gap-1">
                  {PREGNANCY_CHECK_KEYS.map((k) => {
                    const val = current?.pregnancy_checks?.[k];
                    return (
                      <Badge key={k} tone={val === "PASS" ? "good" : val === "FAIL" ? "bad" : "muted"}>
                        {k} {val ?? "—"}
                      </Badge>
                    );
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Judged roles</dt>
                <dd>{ROLE_KEYS.filter((k) => current?.roles?.[k]).map((k) => ROLE_LABEL[k]).join(", ") || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Allergens</dt>
                <dd>{current?.allergens ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Ingredients</dt>
                <dd className="whitespace-pre-wrap">{current?.ingredients ?? "—"}</dd>
              </div>
            </dl>
            {versions.length > 1 && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-muted-foreground">Formula history ({versions.length} versions)</summary>
                <ul className="mt-2 space-y-1">
                  {versions.map((v) => (
                    <li key={v.id}>
                      v{v.version} · {date(v.effective_from)} → {v.effective_to ? date(v.effective_to) : "current"} · {v.calories ?? "?"} cal,{" "}
                      {v.protein_g ?? "?"} g protein, {v.added_sugar_g ?? "?"} g added sugar, {v.sodium_mg ?? "?"} mg sodium
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>

          <Card title="Stock (lots, FEFO order)">
            {lots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No purchases yet.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Bought</th>
                    <th>Vendor</th>
                    <th className="num">Qty</th>
                    <th className="num">Left</th>
                    <th className="num">Unit</th>
                    <th>Expires</th>
                    <th>Lot</th>
                  </tr>
                </thead>
                <tbody>
                  {[...lots]
                    .sort((a, b) => (a.expires_on ?? "9999").localeCompare(b.expires_on ?? "9999") || a.purchased_at.localeCompare(b.purchased_at))
                    .map((l) => {
                      const days = daysUntil(l.expires_on);
                      const tone = l.qty_remaining > 0 ? expiryTone(days, settings.expiryTiersDays) : null;
                      return (
                        <tr key={l.id} className={l.qty_remaining === 0 ? "text-muted-foreground" : ""}>
                          <td>{date(l.purchased_at)}</td>
                          <td>{vendorName(l.vendor_id)}</td>
                          <td className="num">{l.qty}</td>
                          <td className="num">{l.qty_remaining}</td>
                          <td className="num">{fmt$(l.unit_cost_cents)}</td>
                          <td>
                            {date(l.expires_on)} {tone && <Badge tone={tone}>{days} d</Badge>}
                          </td>
                          <td className="font-mono text-xs">
                            <TextLink href={`/admin/inventory/recall?lot=${l.id}`}>{l.lot_code ?? "trace"}</TextLink>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </Table>
            )}
          </Card>

          <Card title="Prices seen">
            {prices.length > 0 && (
              <Table className="mb-4">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Vendor</th>
                    <th className="num">Unit</th>
                    <th className="num">Pack</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((x) => (
                    <tr key={x.id}>
                      <td>{date(x.seen_at)}</td>
                      <td>{vendorName(x.vendor_id)}</td>
                      <td className="num">{fmt$(x.unit_cost_cents)}</td>
                      <td className="num">{x.pack_qty ?? "—"}</td>
                      <td>{x.source}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            <PriceSightingForm productId={id} vendors={vendors.map((v) => v.name)} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="At a glance">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">On hand</dt>
                <dd className="text-lg font-semibold">{snack.onHand}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Unit cost now</dt>
                <dd className="text-lg font-semibold">{fmt$(snack.unitCostCents)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Retail</dt>
                <dd>{fmt$(p.retail_cents)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Units shipped</dt>
                <dd>{shippedUnits}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Used in</dt>
                <dd>
                  {usage.length
                    ? usage.map((u) => `${BOX_LABEL[u.box_lineups.box_slug]} v${u.box_lineups.version}${u.box_lineups.status === "draft" ? " (draft)" : ""}`).join(", ")
                    : "No lineup yet"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Categories</dt>
                <dd>{p.categories.join(", ") || "—"}</dd>
              </div>
              {p.sensory && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Sensory</dt>
                  <dd>{p.sensory}</dd>
                </div>
              )}
              {p.notes && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Operator notes and history — not approval</dt>
                  <dd className="whitespace-pre-wrap">{p.notes}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card title="Photos">
            {photos.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {photos.map((ph) => (
                  <figure key={ph.id} className="relative">
                    {urls.get(ph.path) ? (
                      <a href={urls.get(ph.path)} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL, not optimizable */}
                        <img src={urls.get(ph.path)} alt={`${ph.kind} of ${p.name}`} className="aspect-square w-full rounded-md border object-cover" />
                      </a>
                    ) : (
                      <div className="aspect-square rounded-md border bg-muted" />
                    )}
                    <figcaption className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      {ph.kind}
                      <form action={deleteProductPhoto}>
                        <input type="hidden" name="id" value={ph.id} />
                        <button className="underline">remove</button>
                      </form>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
            <PhotoUpload productId={id} />
          </Card>
        </div>
      </div>
    </>
  );
}
