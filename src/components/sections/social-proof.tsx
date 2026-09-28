import { site } from "@/lib/site";

const softProof = [
  {
    title: "Small batches",
    value: `${site.firstRunPerBox}`,
    body: "Of each box in the founding release — hand-packed at our kitchen table, one order at a time.",
  },
  {
    title: "One standard",
    value: "3 boxes",
    body: "Pregnancy Comfort, Balanced Blood Sugar, and Heart Wellness — same care, different life moments.",
  },
  {
    title: "Honest counting",
    value: "14",
    body: "Real snacks per box, multi-piece packs count as one, with a Packed for You guide in every order.",
  },
];

export function SocialProof() {
  return (
    <section id="proof" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-14 lg:py-18">
        <p className="eyebrow" data-reveal>
          Before the reviews
        </p>
        <h2 className="font-display text-headline mt-4 max-w-[22ch] text-ink" data-reveal>
          Promises we can <em className="text-terracotta-deep">actually keep</em>.
        </h2>
        <p className="mt-4 max-w-[54ch] text-ink-soft" data-reveal>
          We’re a kitchen-table company, so there’s no wall of five-star reviews here yet —
          and we won’t fake one. Once the first boxes ship, real notes from real customers
          go in this spot.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3" data-reveal-group>
          {softProof.map((item) => (
            <div
              key={item.title}
              data-reveal-item
              className="rounded-2xl border border-border bg-cream-card p-6"
            >
              <p className="font-display text-3xl text-ink">{item.value}</p>
              <p className="mt-2 text-sm font-medium text-sage-deep">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
