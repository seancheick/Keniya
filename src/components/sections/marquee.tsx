const words = [
  "The why in every box",
  "Three boxes, one standard",
  "Only 50 of each box",
  "No sample-count tricks",
  "Packed by hand",
  "kɛnɛya · health",
];

export function Marquee() {
  return (
    <div className="overflow-hidden border-y border-border bg-cream-deep/50 py-4">
      <p className="sr-only">
        Pregnancy-conscious, protein-smart, gift-ready snack boxes, packed by hand, with
        the why in every box.
      </p>
      <div className="marquee-track flex w-max items-center gap-10" aria-hidden>
        {[...words, ...words].map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="flex items-center gap-10 whitespace-nowrap text-xs font-medium uppercase tracking-[0.22em] text-sage-deep"
          >
            {word}
            <span className="size-1 rounded-full bg-terracotta/60" />
          </span>
        ))}
      </div>
    </div>
  );
}
