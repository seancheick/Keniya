import { site } from "@/lib/site";

const items = [
  { label: "Free US shipping", detail: "On every founding box" },
  { label: "Refundable before ship", detail: "One email, full refund" },
  {
    label: `Only ${site.firstRunPerBox} of each box`,
    detail: "Founding release, hand-packed",
  },
  {
    label: "PharmD-reviewed lineups",
    detail: "Box criteria, not personal advice",
    href: "/#how",
  },
];

export function TrustStrip() {
  return (
    <section
      aria-label="Trust highlights"
      className="border-y border-border bg-cream-deep/50"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-stretch justify-between gap-4 px-6 py-5">
        {items.map((item) => {
          const inner = (
            <>
              <p className="text-sm font-medium text-ink">{item.label}</p>
              <p className="text-xs text-ink-soft">{item.detail}</p>
            </>
          );
          const className =
            "min-w-[9.5rem] flex-1 border-l border-border pl-4 first:border-l-0 first:pl-0";
          if ("href" in item && item.href) {
            return (
              <a
                key={item.label}
                href={item.href}
                className={`${className} transition-colors hover:text-ink`}
              >
                {inner}
              </a>
            );
          }
          return (
            <div key={item.label} className={className}>
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
