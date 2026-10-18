import { ORDER_STEPS, type NextStep } from "@/lib/admin/order-steps";
import { cn } from "@/lib/utils";

const TONE = {
  good: "border-emerald-700 bg-emerald-50 text-emerald-950",
  warn: "border-amber-500 bg-amber-50 text-amber-950",
  bad: "border-red-700 bg-red-50 text-red-950",
} as const;

/** Where this order is (Planned → … → Delivered) and the one thing to do next. */
export function OrderSteps({ next }: { next: NextStep }) {
  return (
    <div className="mb-4 space-y-3 print:hidden">
      <ol className="flex flex-wrap gap-x-1 gap-y-2 text-xs" aria-label="Order progress">
        {ORDER_STEPS.map((label, i) => {
          const done = i < next.step;
          const current = i === next.step;
          return (
            <li key={label} className="flex items-center gap-1" aria-current={current ? "step" : undefined}>
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border font-semibold tabular-nums",
                  done ? "border-emerald-700 bg-emerald-700 text-white" : current ? "border-ink bg-ink text-cream-card" : "border-border text-muted-foreground",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={cn(current ? "font-semibold" : "text-muted-foreground")}>{label}</span>
              {i < ORDER_STEPS.length - 1 && <span className="mx-1 text-muted-foreground" aria-hidden>→</span>}
            </li>
          );
        })}
      </ol>
      <div role="status" className={cn("rounded-xl border-l-4 p-3", TONE[next.tone])}>
        <p className="font-semibold">Next: {next.title}</p>
        <p className="text-sm">{next.body}</p>
      </div>
    </div>
  );
}
