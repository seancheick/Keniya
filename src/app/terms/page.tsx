import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "Keniya's terms in plain words: one-time $47 boxes, free US shipping, full refunds any time before your box ships, and honest substitution rules.",
  alternates: { canonical: "/terms" },
};

const EFFECTIVE = "September 28, 2026";

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20 text-ink-soft [&_h2]:font-display [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:text-ink [&_p]:mt-4 [&_p]:leading-relaxed">
      <h1 className="font-display text-headline text-ink">Terms of service</h1>
      <p className="text-sm">Effective {EFFECTIVE}</p>

      <h2>Orders and pricing</h2>
      <p>
        Every box is a one-time purchase at ${site.preorderPriceUSD} in US dollars, with{" "}
        {site.freeShippingLabel.toLowerCase()}{" "}to US addresses. There&rsquo;s no
        subscription and nothing renews automatically.
      </p>

      <h2>Preorders, shipping, and cancellation</h2>
      <p>
        Founding boxes are preorders, packed by hand in small batches — only{" "}
        {site.firstRunPerBox} of each box in the founding release. Founding boxes ship {site.shipDate}. You can cancel for a full refund any time before your box ships:
        just email{" "}
        <a className="text-sage-deep underline-offset-2 hover:underline" href={`mailto:${site.email}`}>
          {site.email}
        </a>
        . If we can&rsquo;t ship your box, we refund you in full.
      </p>

      <h2>What&rsquo;s inside, and substitutions</h2>
      <p>
        Each box holds {site.snackCount} distinct snacks. Contents rotate with the
        seasons, availability, and your preferences, and specific brands may vary batch
        to batch. If an item runs out, we substitute within the same category and the
        same selection standards, and your guide notes the swap.
      </p>

      <h2>Not medical advice</h2>
      <p>
        Keniya curates packaged snacks for comfort and enjoyment. We don&rsquo;t diagnose,
        treat, or manage any condition, and nothing we say is medical or nutritional
        advice — always follow your healthcare provider&rsquo;s guidance.
      </p>

      <h2>Allergens</h2>
      <p>
        Every item ships sealed in its original packaging with the manufacturer&rsquo;s
        full label. We use your answers to steer around ingredients you flag, but Keniya
        isn&rsquo;t an allergen-free facility and can&rsquo;t guarantee against
        manufacturer cross-contact. Please check each label before eating.
      </p>

      <h2>Questions</h2>
      <p>
        Write to{" "}
        <a className="text-sage-deep underline-offset-2 hover:underline" href={`mailto:${site.email}`}>
          {site.email}
        </a>{" "}
        — a person answers.
      </p>
    </article>
  );
}
