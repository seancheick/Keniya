import { ChevronDownIcon } from "lucide-react";
import { site } from "@/lib/site";

export const faqs = [
  {
    q: "What's in the box?",
    a: `${site.snackCount} snacks picked for your box: a mix of comfort, crunchy and salty, sweet, protein and sips, with the counts shown on each box's Snack Facts. Picks rotate with the season, so photos show an example box and yours may differ. At least 8 are full single servings, a pack of chews or two tea bags counts as one snack, and small extras are free and never counted. Every box includes a Packed for You card on how we choose.`,
  },
  {
    q: "How do you choose the snacks?",
    a: "Every box has its own written standards, shown on its page. We read each label against them, and a snack has to pass before it can go in. Laurie Pham, PharmD, reviewed each box's criteria, and every pack's label is checked in hand before it ships. The snacks change; the standards don't.",
  },
  {
    q: "Is this a subscription?",
    a: "Buying a box is a one-time purchase with no renewal, and gifts are always one-time. If you choose the optional Monthly Snack Club, it renews monthly and you can skip, pause or cancel online anytime.",
  },
  {
    q: "When does it ship?",
    a: `Founding boxes ship ${site.shipDate}, free, to US addresses. If anything changes, we email you first.`,
  },
  {
    q: "Can I cancel?",
    a: `Yes. Email ${site.email} any time before your box ships for a full refund.`,
  },
  {
    q: "How do I send it as a gift?",
    a: "Choose \"It's a gift\" when you pick your box, then enter their address at checkout and write a message. We print it on a note inside the box, and the receipt comes to you. Any box can be a gift.",
  },
  {
    q: "What about allergies?",
    a: "Every snack ships sealed with its full label. Your box's standards decide which snacks are eligible; your preferences help us choose among them. Tell us about allergies or foods to avoid, and whether you lean sweet or salty, at checkout, and we'll pack around them where we can. We aren't an allergen-free facility and can't rule out cross-contact at the maker, so with a severe allergy, please check every label.",
  },
  {
    q: "Is this medical advice?",
    a: "No. We screen and select packaged snacks to each box's standards, but we don't diagnose, treat or give personal medical advice. Your doctor is the right person to ask about what's best for you.",
  },
];

export function Faq() {
  return (
    <section id="faq">
      <div className="mx-auto max-w-3xl px-5 py-16 lg:py-24">
        <h2 className="font-display text-headline text-ink">
          Questions, answered.
        </h2>
        {/* Native <details>: answers stay in the server HTML, so search and AI crawlers
            that never click (or run JS) still read them. name="faq" = one open at a time. */}
        <div className="mt-8 divide-y-2 divide-ink/10 border-y-2 border-ink">
          {faqs.map((item) => (
            <details key={item.q} name="faq" className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-4 text-left text-base font-semibold text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDownIcon
                  aria-hidden
                  className="size-4 shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="max-w-[62ch] pb-5 leading-relaxed text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
