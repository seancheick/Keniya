// Small presentational building blocks shared by admin pages (server-safe, no hooks).
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { BoxFit } from "@/lib/admin/rules";
import { BOX_LABEL, BOX_SLUGS, type BoxSlug, type Status } from "@/lib/admin/types";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  action,
  className,
  children,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-4 sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center gap-2">
          {title && <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>}
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: Tone }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-xl font-semibold tabular-nums", tone && TONE_TEXT[tone])}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export type Tone = "good" | "warn" | "bad" | "info" | "muted" | "orange";
const TONE_BADGE: Record<Tone, string> = {
  good: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warn: "bg-amber-50 text-amber-900 border-amber-200",
  orange: "bg-orange-50 text-orange-900 border-orange-200",
  bad: "bg-red-50 text-red-800 border-red-200",
  info: "bg-sky-50 text-sky-800 border-sky-200",
  muted: "bg-muted text-muted-foreground border-border",
};
const TONE_TEXT: Record<Tone, string> = {
  good: "text-emerald-700",
  warn: "text-amber-700",
  orange: "text-orange-700",
  bad: "text-red-700",
  info: "text-sky-700",
  muted: "text-muted-foreground",
};

export function Badge({ tone = "muted", title, className, children }: { tone?: Tone; title?: string; className?: string; children: React.ReactNode }) {
  return (
    <span
      title={title}
      className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONE_BADGE[tone], className)}
    >
      {children}
    </span>
  );
}

export const STATUS_TONE: Record<Status, Tone> = { Approved: "good", Candidate: "info", Rejected: "bad", Retired: "muted" };

export function StatusBadge({ status }: { status: Status }) {
  return <Badge tone={STATUS_TONE[status]}>{status}</Badge>;
}

const SHORT: Record<BoxSlug, string> = { pregnancy_comfort: "Preg", blood_sugar: "Carb", heart: "Heart" };

/** "Fits 2 boxes" + one chip per box; hover a chip for the reason. */
export function FitBadges({ fits, compact }: { fits: Record<BoxSlug, BoxFit>; compact?: boolean }) {
  const count = BOX_SLUGS.filter((s) => fits[s].fits).length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {!compact && (
        <Badge tone={count === 0 ? "bad" : count === 3 ? "good" : "info"}>
          {count === 0 ? "Fits no box" : `Fits ${count} box${count > 1 ? "es" : ""}`}
        </Badge>
      )}
      {BOX_SLUGS.map((s) => (
        <Badge
          key={s}
          tone={fits[s].fits ? "good" : "muted"}
          title={`${BOX_LABEL[s]}: ${fits[s].fits ? `✓ ${fits[s].via.join(", ")}` : fits[s].reasons.join("; ")}`}
          className={fits[s].fits ? "" : "line-through decoration-1"}
        >
          {fits[s].fits ? "✓" : "✕"} {SHORT[s]}
        </Badge>
      ))}
    </div>
  );
}

/** Reasons a product doesn't fit, one line per box (for detail pages and the purchase form). */
export function FitReasons({ fits }: { fits: Record<BoxSlug, BoxFit> }) {
  return (
    <ul className="space-y-1 text-sm">
      {BOX_SLUGS.map((s) => (
        <li key={s} className="flex gap-2">
          <span className={cn("w-28 shrink-0 font-medium", fits[s].fits ? "text-emerald-700" : "text-muted-foreground")}>
            {fits[s].fits ? "✓" : "✕"} {BOX_LABEL[s]}
          </span>
          <span className="text-muted-foreground">
            {fits[s].fits ? fits[s].via.join(" · ") : `Not recommended: ${fits[s].reasons.join("; ")}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("-mx-4 overflow-x-auto sm:mx-0", className)}>
      <table className="w-full min-w-max border-collapse text-sm [&_td]:border-t [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_td.num]:text-right [&_td.num]:tabular-nums [&_th.num]:text-right">
        {children}
      </table>
    </div>
  );
}

export function Empty({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      <p>{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-primary underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

/** Expiry tier per Settings (default 30/60/90 days). */
export function expiryTone(days: number | null, tiers: [number, number, number]): Tone | null {
  if (days === null) return null;
  if (days < tiers[0]) return "bad";
  if (days < tiers[1]) return "orange";
  if (days < tiers[2]) return "warn";
  return null;
}

export const fieldClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm";

export function Field({ label, hint, children, className }: { label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
