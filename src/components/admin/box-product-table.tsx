"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Minus, Plus, X } from "lucide-react";
import { Badge, fieldClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { fmt$ } from "@/lib/admin/costing";
import { daysUntil } from "@/lib/admin/optimizer";
import { eligibleFor, isClinicianApproved, type BoxFit } from "@/lib/admin/rules";
import { BOX_LABEL, BOX_SLUGS, type BoxRules, type BoxSlug, type Settings, type Snack } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

const SHORT: Record<BoxSlug, string> = { pregnancy_comfort: "Preg", blood_sugar: "Carb", heart: "Heart" };
/** Columns shown from the sm breakpoint up; on phones they fold into the product cell. */
const WIDE = "hidden sm:table-cell";

type Props = {
  slug: BoxSlug;
  snacks: Snack[];
  inBox: Set<string>;
  full: boolean;
  /** Rules for every box; this box's entry already includes any one-off mix. */
  rules: Record<BoxSlug, BoxRules>;
  settings: Settings;
  /** Allergen "leave out" conflicts from the builder. */
  conflict: Map<string, string>;
  categories: string[];
  photos: Record<string, string>;
  findings: Record<string, string>;
  onAdd: (s: Snack) => void;
  onRemove: (id: string) => void;
};

/**
 * The everyday view for building a box: one row per product with only what matters
 * (stock, box fit, approval, package check, expiry) and the evidence one click away.
 */
export function BoxProductTable({ slug, snacks, inBox, full, rules, settings, conflict, categories, photos, findings, onAdd, onRemove }: Props) {
  const [query, setQuery] = useState("");
  const [onlyEligible, setOnlyEligible] = useState(true);
  const [cat, setCat] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return snacks
      .filter((s) => s.status !== "Retired" && s.status !== "Rejected")
      .map((s) => {
        const fits = Object.fromEntries(BOX_SLUGS.map((b) => [b, eligibleFor(b, s, rules[b], settings.policy, s.rejectReason)])) as Record<BoxSlug, BoxFit>;
        const blocked = conflict.get(s.id) ?? (s.status === "Candidate" ? "Candidate: not reviewed yet" : null);
        return { s, fits, here: fits[slug].fits && !blocked, blocked };
      })
      .filter(({ s, here }) => (!onlyEligible || here || inBox.has(s.id)) && (!cat || s.categories.includes(cat)))
      .filter(({ s }) => !q || `${s.code} ${s.name} ${s.brand ?? ""}`.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          Number(inBox.has(b.s.id)) - Number(inBox.has(a.s.id)) ||
          Number(b.here) - Number(a.here) ||
          Number(isClinicianApproved(b.s)) - Number(isClinicianApproved(a.s)) ||
          a.s.name.localeCompare(b.s.name),
      );
  }, [snacks, rules, settings.policy, conflict, slug, onlyEligible, cat, query, inBox]);

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <p className="font-semibold">Products</p>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className={cn(fieldClass, "h-8 w-40")} aria-label="Search products" />
        <div className="flex flex-wrap gap-1">
          {[null, ...categories].map((c) => (
            <Button key={c ?? "all"} size="xs" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)}>
              {c ?? "All"}
            </Button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs">
          <input type="checkbox" checked={onlyEligible} onChange={(e) => setOnlyEligible(e.target.checked)} />
          Only eligible for {BOX_LABEL[slug]}
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="p-2 font-medium">Product</th>
              <th className={cn(WIDE, "p-2 font-medium")}>Stock</th>
              {BOX_SLUGS.map((b) => (
                <th key={b} className={cn(WIDE, "p-2 text-center font-medium", b === slug && "text-foreground")}>
                  {SHORT[b]}
                </th>
              ))}
              <th className={cn(WIDE, "p-2 font-medium")}>Approval</th>
              <th className={cn(WIDE, "p-2 font-medium")}>Package</th>
              <th className={cn(WIDE, "p-2 font-medium")}>Expires</th>
              <th className={cn(WIDE, "p-2")} />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, fits, here, blocked }) => {
              const added = inBox.has(s.id);
              const d = daysUntil(s.earliestExpiry);
              const approval = isClinicianApproved(s) ? "Clinician" : s.status === "Approved" ? "Legacy" : s.status;
              const action = added ? (
                <Button size="xs" variant="outline" onClick={() => onRemove(s.id)}>
                  <X /> Remove
                </Button>
              ) : (
                <Button size="xs" disabled={!here || full} title={!here ? (blocked ?? fits[slug].reasons[0]) : full ? "The box is full: remove a pick first" : undefined} onClick={() => onAdd(s)}>
                  <Plus /> Add
                </Button>
              );
              return (
                <Fragment key={s.id}>
                  <tr
                    className={cn("cursor-pointer border-b hover:bg-muted/40", added && "bg-emerald-50/60", !here && !added && "text-muted-foreground")}
                    onClick={() => setOpen(open === s.id ? null : s.id)}
                    aria-expanded={open === s.id}
                  >
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {photos[s.id] ? (
                          // eslint-disable-next-line @next/next/no-img-element -- signed private URL, not optimizable
                          <img src={photos[s.id]} alt="" className="h-9 w-9 shrink-0 rounded border object-cover" />
                        ) : (
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded border text-[10px] text-muted-foreground">{s.code}</span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block max-w-[13rem] truncate sm:max-w-72">{s.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {s.categories.join(", ")} · {fmt$(s.unitCostCents)}
                          </span>
                          {/* Phones: the wide columns collapse into one line under the name. */}
                          <span className="mt-1 flex flex-wrap items-center gap-1 text-xs sm:hidden">
                            {BOX_SLUGS.filter((b) => fits[b].fits).map((b) => (
                              <Badge key={b} tone="good">{`✓ ${SHORT[b]}`}</Badge>
                            ))}
                            <Badge tone={approval === "Clinician" ? "good" : approval === "Candidate" ? "info" : "warn"}>{approval}</Badge>
                            <Badge tone={s.packageVerified ? "good" : "muted"}>{s.packageVerified ? "Verified" : "Not verified"}</Badge>
                            <span className="text-muted-foreground">{s.onHand} in stock</span>
                            <span className="ml-auto" onClick={(e) => e.stopPropagation()}>
                              {action}
                            </span>
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className={cn(WIDE, "p-2 tabular-nums")}>{s.onHand}</td>
                    {BOX_SLUGS.map((b) => (
                      <td key={b} className={cn(WIDE, "p-2 text-center")} title={fits[b].fits ? fits[b].via.join("; ") : fits[b].reasons[0]}>
                        {fits[b].fits ? <Check className="mx-auto size-4 text-emerald-700" aria-label="eligible" /> : <Minus className="mx-auto size-4 text-muted-foreground" aria-label="not eligible" />}
                      </td>
                    ))}
                    <td className={cn(WIDE, "p-2")}>
                      <Badge tone={approval === "Clinician" ? "good" : approval === "Candidate" ? "info" : "warn"}>{approval}</Badge>
                    </td>
                    <td className={cn(WIDE, "p-2")}>
                      <Badge tone={s.packageVerified ? "good" : "muted"}>{s.packageVerified ? "Verified" : "Not yet"}</Badge>
                    </td>
                    <td className={cn(WIDE, "p-2 text-xs whitespace-nowrap")}>
                      {s.earliestExpiry ? <span className={cn(d !== null && d < settings.expiryTiersDays[2] && "font-medium text-orange-700")}>{s.earliestExpiry}</span> : "—"}
                    </td>
                    <td className={cn(WIDE, "p-2 text-right")} onClick={(e) => e.stopPropagation()}>
                      {action}
                    </td>
                  </tr>
                  {open === s.id && (
                    <tr className="border-b bg-muted/30">
                      <td colSpan={9} className="max-w-[calc(100vw-2rem)] p-3">
                        <Evidence s={s} fits={fits} blocked={blocked} finding={findings[s.id]} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No products match. Untick &quot;Only eligible&quot; to see everything.</p>}
      </div>
    </div>
  );
}

function Evidence({ s, fits, blocked, finding }: { s: Snack; fits: Record<BoxSlug, BoxFit>; blocked: string | null; finding?: string }) {
  const n = [
    ["Cal", s.calories],
    ["Protein", s.protein_g, "g"],
    ["Fiber", s.fiber_g, "g"],
    ["Carbs", s.carbs_g, "g"],
    ["Added sugar", s.added_sugar_g, "g"],
    ["Sodium", s.sodium_mg, "mg"],
    ["Sat fat", s.sat_fat_g, "g"],
    ["Caffeine", s.caffeine_mg, "mg"],
  ] as const;
  return (
    <div className="grid gap-3 text-sm md:grid-cols-2">
      <div className="space-y-2">
        {blocked && <p className="font-medium text-amber-800">{blocked}</p>}
        {BOX_SLUGS.map((b) => (
          <p key={b}>
            <span className="font-medium">{BOX_LABEL[b]}:</span>{" "}
            {fits[b].fits ? <span className="text-emerald-800">eligible ({fits[b].via.join(", ")})</span> : <span className="text-muted-foreground">{fits[b].reasons.join("; ")}</span>}
          </p>
        ))}
        <p className="text-xs text-muted-foreground">{n.map(([k, v, u]) => `${k} ${v ?? "—"}${v !== null && u ? ` ${u}` : ""}`).join(" · ")}</p>
        {s.allergens && <p className="text-xs">Allergens: {s.allergens}</p>}
      </div>
      <div className="space-y-2">
        {finding && (
          <p className="text-xs">
            <span className="font-medium">Pre-screen:</span> {finding}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild size="xs" variant="outline">
            <Link href={`/admin/products/${s.id}`}>Product page</Link>
          </Button>
          {!s.packageVerified && (
            <Button asChild size="xs" variant="outline">
              <Link href="/admin/verify">Verify package</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
