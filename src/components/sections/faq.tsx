import { ChevronDownIcon } from "lucide-react";
import { site } from "@/lib/site";

export const faqs = [
  {
    q: "What exactly is in the box?",
    a: `${site.snackCount} snacks, listed above for each box. At least 8 are full single servings. A pack of chews or two tea bags counts as one snack, and small extras are free and don't count. The exact snacks rotate with the season, but every box fills the same 14 spots for your condition, and your card names each one.`,
  },
  {
    q: "When does it ship?",
    a: `Founding boxes ship ${site.shipDate}, free, to US addresses. If anything changes, we email you first.`,
  },
  {
    q: "Can I cancel?",
    a: `Yes. Email ${site.email} any time before your box ships for a full refund. It's a one-time purchase, not a subscription.`,
  },
  {
    q: "How do I send it as a gift?",
    a: "Choose \"It's a gift\" when you pick your box, then enter their address at checkout and write a message. We print it on their card.",
  },
  {
    q: "What about allergies?",
    a: "Every snack ships sealed with its full label. Tell us about nuts, gluten or dairy in the quiz and we'll steer around them where we can. We aren't an allergen-free facility and can't rule out cross-contact at the maker, so with a severe allergy, please check every label.",
  },
  {
    q: "Is this medical advice?",
    a: "No. We pick packaged snacks with care, but we don't diagnose or treat anything. Your doctor is the right person to ask about what's best for you.",
  },
];

export function Faq() {
  return (
    <section id="faq">
      <div className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
        <p className="eyebrow" data-reveal>
          Questions
        </p>
        <h2 className="font-display text-headline mt-4 text-ink" data-reveal>
          Good to know.
        </h2>
        {/* Native <details>: answers stay in the server HTML, so search and AI crawlers
            that never click (or run JS) still read them. name="faq" = one open at a time. */}
        <div className="mt-8 divide-y divide-border border-b border-border" data-reveal>
          {faqs.map((item) => (
            <details key={item.q} name="faq" className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-4 text-left text-sm font-medium text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDownIcon
                  aria-hidden
                  className="size-4 shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
