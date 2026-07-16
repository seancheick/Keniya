import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { site } from "@/lib/site";

export const faqs = [
  {
    q: "Is Kaniya medical or nutritional advice?",
    a: "No. We curate packaged snacks for comfort and enjoyment — we don't diagnose, treat, or manage any condition. Every item ships sealed in its original packaging with the manufacturer's full label, and your healthcare provider is always the right call for what's best for you.",
  },
  {
    q: "How do you handle allergies?",
    a: "The quiz asks about nuts, gluten, and dairy, and we use your answers to guide selection and steer around stated ingredients where possible. Kaniya isn't an allergen-free facility and we can't guarantee against manufacturer cross-contact — so please always check each item's sealed label. If you live with a severe allergy, we'd honestly rather you wait for our dedicated lines than risk a bad box.",
  },
  {
    q: "When and where do boxes ship?",
    a: `The first release ships in an estimated window of ${site.shipWindow}, to US addresses. In serious summer heat we may hold chocolate-containing boxes a few days or pack accordingly — we'll email you either way. If timing slips, you'll hear from us before you have to ask.`,
  },
  {
    q: "What's the refund and substitution policy?",
    a: "Preorders are fully refundable any time before your box ships — one email to hello@kaniyahealth.com does it. If an item goes out of stock, we substitute within the same category and the same standards, and the card in your box notes the swap.",
  },
  {
    q: "What's actually in a box — and how do you count?",
    a: "Fourteen distinct snacks across five categories — at least eight of them substantial single servings, with smaller discovery items for variety. We count honestly: a pouch of ginger chews or a pair of tea bags is one snack, never four, and little extras aren't counted toward the total at all. Contents rotate based on availability, your preferences, and our category standards — deliberately composed, never random.",
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
        <div className="mt-8" data-reveal>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((item, i) => (
              <AccordionItem key={item.q} value={`item-${i}`}>
                <AccordionTrigger className="text-left font-medium text-ink hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="leading-relaxed text-ink-soft">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
