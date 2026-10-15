import { site } from "@/lib/site";

const items: { label: string; href?: string }[] = [
  { label: "No subscription needed" },
  { label: "Free US shipping" },
  { label: "Full refund until it ships" },
  { label: `First boxes ship ${site.shipDate.replace(/, \d{4}$/, "")}` },
  { label: "Criteria reviewed by a pharmacist", href: "/#reviewer" },
];

/** The ribbon across the box: the facts a buyer checks before anything else. */
export function TrustStrip() {
  return (
    <section aria-label="Good to know" className="relative overflow-x-clip py-3">
      <div className="paper -mx-4 -rotate-[1.2deg] bg-coral shadow-[0_10px_20px_-14px_rgb(37_37_37/0.6)]">
        <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-1.5 px-8 py-3.5 text-sm font-semibold text-ink sm:gap-x-7">
          {items.map((item, i) => (
            <li key={item.label} className="flex items-center gap-x-5 sm:gap-x-7">
              {i > 0 && <span aria-hidden className="hidden size-1.5 rounded-full bg-ink/70 lg:block" />}
              {item.href ? (
                <a href={item.href} className="underline decoration-ink/40 underline-offset-4 hover:decoration-ink">
                  {item.label}
                </a>
              ) : (
                item.label
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
