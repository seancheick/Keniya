import { socialMetadata } from "@/lib/social";
import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  ...socialMetadata("Terms of service", "Keniya's terms in plain words: $47 boxes, the optional Monthly Snack Club, free US shipping, full refunds before your box ships, and honest substitution rules.", "/terms", "default"),
  title: "Terms of service",
  description:
    "Keniya's terms in plain words: $47 boxes, the optional Monthly Snack Club, free US shipping, full refunds before your box ships, and honest substitution rules.",
  alternates: { canonical: "/terms" },
};

const EFFECTIVE = "October 15, 2026";

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20 text-ink-soft [&_h2]:font-display [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:text-ink [&_p]:mt-4 [&_p]:leading-relaxed">
      <h1 className="font-display text-headline text-ink">Terms of service</h1>
      <p className="text-sm">Effective {EFFECTIVE}</p>

      <h2>Orders and pricing</h2>
      <p>
        A box is ${site.preorderPriceUSD} in US dollars, with {site.freeShippingLabel.toLowerCase()}{" "}
        to US addresses. Buying a box is a one-time purchase: nothing renews unless you join the
        Monthly Snack Club below. Gifts are always one-time.
      </p>

      <h2>First-box offer</h2>
      <p>
        When a first-box offer is running, it applies to one one-time box (gifts included) for
        an email address with no earlier Keniya order, at the price shown before checkout. It
        can&rsquo;t be combined with another code, doesn&rsquo;t apply to the Snack Club, and may end
        or reach its limit at any time; an offer already applied at checkout is honored.
      </p>

      <h2>Monthly Snack Club</h2>
      <p>
        If you choose the Snack Club, you authorize us to charge the monthly price shown at
        checkout when you subscribe and again on the same date each month until you cancel.
        There&rsquo;s no minimum term. You can skip a month, pause, change your address or cancel
        anytime online at{" "}
        <a className="text-mint-deep underline-offset-2 hover:underline" href="/club">keniyahealth.com/club</a>
        , before your renewal date to stop that month&rsquo;s charge. We email you before each
        renewal. If we can&rsquo;t fill your box to its standards in a given month, we hold that month
        and don&rsquo;t charge you. If we ever change the monthly price, we&rsquo;ll tell you before it
        applies, and you can cancel first.
      </p>

      <h2>Shipping and cancellation</h2>
      <p>
        Boxes are packed by hand. Our first boxes ship {site.shipDate}; after that, orders ship
        as they&rsquo;re packed, and Snack Club boxes ship each month after renewal. You can cancel
        a box for a full refund any time before it ships: just email{" "}
        <a className="text-mint-deep underline-offset-2 hover:underline" href={`mailto:${site.email}`}>
          {site.email}
        </a>
        . If we can&rsquo;t ship your box, we refund you in full.
      </p>

      <h2>What&rsquo;s inside, and substitutions</h2>
      <p>
        Each box holds {site.snackCount} distinct snacks. Product photos show an example
        box, not a promise of specific snacks. Contents rotate with the
        seasons, availability, and your preferences, and specific brands may vary batch
        to batch. If an item runs out, we substitute within the same category and the
        same selection standards.
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
        <a className="text-mint-deep underline-offset-2 hover:underline" href={`mailto:${site.email}`}>
          {site.email}
        </a>{" "}
        — a person answers.
      </p>
    </article>
  );
}
