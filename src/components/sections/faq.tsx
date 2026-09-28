import { ChevronDownIcon } from "lucide-react";
import { site } from "@/lib/site";

export const faqs = [
  {
    q: "Is Keniya medical or nutritional advice?",
    a: "No. We curate packaged snacks for comfort and enjoyment — we don't diagnose, treat, or manage any condition. Every item ships sealed in its original packaging with the manufacturer's full label, and your healthcare provider is always the right call for what's best for you.",
  },
  {
    q: "How do you handle allergies?",
    a: "The quiz asks about nuts, gluten, and dairy, and we use your answers to guide selection and steer around stated ingredients where possible. Keniya isn't an allergen-free facility and we can't guarantee against manufacturer cross-contact — so please always check each item's sealed label. If you live with a severe allergy, we'd honestly rather you wait for our dedicated lines than risk a bad box.",
  },
  {
    q: "When and where do boxes ship?",
    a: `Founding boxes ship to US addresses in small, hand-packed batches. Founding boxes ship ${site.shipDate}. ${site.freeShippingLabel} on every founding preorder. In hot weather we may hold chocolate-containing boxes a few days or pack them accordingly — we'll email you either way. If timing slips, you'll hear from us before you have to ask, and you can cancel for a full refund any time before your box ships.`,
  },
  {
    q: "Which boxes can I preorder?",
    a: "All three founding boxes are open for preorder: Pregnancy Comfort, Balanced Blood Sugar, and Heart Wellness — $47 each, fifty of each box, free shipping, refundable before ship. Later lines (GLP-1, menopause, postpartum) start as waitlists until demand is clear.",
  },
  {
    q: "What's the refund and substitution policy?",
    a: "Preorders are fully refundable any time before your box ships — one email to hello@keniyahealth.com does it. If an item goes out of stock, we substitute within the same category and the same standards, and the card in your box notes the swap.",
  },
  {
    q: "What's actually in a box — and how do you count?",
    a: "Fourteen distinct snacks across five categories — at least eight of them substantial single servings, with smaller discovery items for variety. We count honestly: a pouch of ginger chews or a pair of tea bags is one snack, never four, and little extras aren't counted toward the total at all. And no two seasons are identical — boxes evolve winter through fall as your feedback and new clean-ingredient finds come in. Same categories, same standards, fresh picks.",
  },
  {
    q: "Is it a subscription?",
    a: "No — founding-release boxes are one-time purchases. No subscription, no hidden renewal, no cancellation maze. If enough early customers ask for a monthly option, we'll build a subscribe-and-save tier that adapts as your needs change.",
  },
  {
    q: "Can I send it as a gift?",
    a: "Absolutely — the quiz has a gift path that asks what the recipient is navigating, and you'll be able to add a gift note at checkout. It's the care package that does the reading for you.",
  },
];

export function Faq() {
  return (
    <section id="faq">
      <div className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
        <p className="eyebrow" data-reveal>
          Questions, answered
        </p>
        <h2 className="font-display text-headline mt-4 text-ink" data-reveal>
          The fine print, in plain words.
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
