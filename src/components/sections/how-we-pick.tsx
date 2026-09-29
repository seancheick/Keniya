import Image from "next/image";
import { site } from "@/lib/site";

const points = [
  {
    title: "14 real snacks",
    body: "A pack of chews counts as one, never four. At least 8 are full single servings. Small extras are free and don't count.",
  },
  {
    title: "A written checklist, every snack",
    body: "Each box has its own rules. The pregnancy box alone has nine, from fully cooked and sealed to caffeine, sugar and sodium on every card. Screened the way our sister app PharmaGuide screens supplements.",
  },
  {
    title: "A card that explains it",
    body: "Your Packed for You card says in one line why each snack made the cut, and lists any swaps.",
  },
];

export function HowWePick() {
  return (
    <section id="how" className="scroll-mt-20 border-b border-border bg-cream-deep/50">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:py-16">
        <h2 className="text-center font-display text-3xl text-ink" data-reveal>
          How we pick every snack
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3" data-reveal-group>
          {points.map((p) => (
            <div key={p.title} data-reveal-item>
              <p className="font-semibold text-ink">{p.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{p.body}</p>
            </div>
          ))}
        </div>
        <div
          className="mx-auto mt-10 flex max-w-2xl items-center gap-4 rounded-2xl border border-border bg-cream-card p-4"
          data-reveal
        >
          <Image
            src="/images/laurie-pham.webp"
            alt="Laurie Pham, PharmD, Keniya's clinical reviewer"
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-full object-cover"
          />
          <p className="text-sm leading-relaxed text-ink-soft">
            <strong className="text-ink">Reviewed by Laurie Pham, PharmD.</strong>{" "}
            Every box
            lineup gets a clinical check from PharmaGuide&rsquo;s reviewer, a Doctor of Pharmacy
            with 15+ years in drug safety.
          </p>
        </div>
        <p
          className="mx-auto mt-8 max-w-2xl text-center text-base leading-relaxed text-ink-soft"
          data-reveal
        >
          It started with years of reading labels for our own family. Now we do that work for
          everyone: whatever you&rsquo;re living with, you get a box that already did the reading,
          so you can just enjoy the snack. Pregnancy, blood sugar and heart health today, with
          more conditions on the way. Every snack is screened with the same care as{" "}
          <a
            href={site.pharmaguide.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sage-deep underline underline-offset-4 hover:text-ink"
          >
            PharmaGuide
          </a>
          , our sister platform.
        </p>
        <p className="mt-4 text-center text-xs text-ink-soft/70" data-reveal>
          Keniya picks packaged snacks. It isn&rsquo;t medical advice. Follow your
          doctor&rsquo;s guidance and check each label for allergens.
        </p>
      </div>
    </section>
  );
}
