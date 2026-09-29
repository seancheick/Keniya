import { site } from "@/lib/site";

const items = [
  { label: `Ships ${site.shipDate.replace(/, \d{4}$/, "")}`, detail: "Free US shipping" },
  { label: "No subscription", detail: "One-time purchase" },
  { label: "Refundable before ship", detail: "One email, full refund" },
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
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-4 px-6 py-5 lg:grid-cols-4">
        {items.map((item) => {
          const inner = (
            <>
              <p className="text-sm font-medium text-ink">{item.label}</p>
              <p className="text-xs text-ink-soft">{item.detail}</p>
            </>
          );
          const className =
            "lg:border-l lg:border-border lg:pl-4 lg:first:border-l-0 lg:first:pl-0";
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
