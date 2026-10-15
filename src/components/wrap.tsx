import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The Wrapped & Sealed vocabulary: the round kiss-cut sticker that seals every box, and the
 * tissue sheets fanned under it. Both are the real packaging (mailer, stickers, tissue)
 * translated to the page, so they stay cheap to reproduce in the box itself.
 */

/** Round sticker seal. `tone` is a fill token; text stays charcoal on every tone. */
export function Sticker({
  children,
  className,
  tone = "butter",
  style,
}: {
  children: ReactNode;
  className?: string;
  tone?: "butter" | "coral" | "tissue" | "cream";
  style?: CSSProperties;
}) {
  const fill = { butter: "bg-butter", coral: "bg-coral", tissue: "bg-tissue", cream: "bg-cream-card" }[tone];
  return (
    <span
      style={style}
      className={cn(
        "paper grid aspect-square shrink-0 self-start place-items-center rounded-full p-1.5 text-center text-ink shadow-[0_10px_18px_-10px_rgb(37_37_37/0.55),0_2px_4px_-2px_rgb(37_37_37/0.25)]",
        fill,
        className,
      )}
    >
      {/* The kiss-cut ring printed just inside the edge. */}
      <span className="grid size-full place-items-center rounded-full border-[1.5px] border-dashed border-ink/30">
        {children}
      </span>
    </span>
  );
}

// [x %, y %, deg] per sheet, scaled by --fan (1 = fanned out; animate it from 0 to unfold) and
// by --fan-scale (a static size knob, e.g. a gentler fan on small screens).
const SHEETS = [
  [-7, 5, -8],
  [6, -6, 6],
  [2, 8, -2],
];

/**
 * Tissue sheets fanned behind a photo or panel, each peeking out at its own angle. They're
 * translucent and multiply where they overlap, so two colorways print a third, like spot inks
 * on a riso. Place inside a `relative` parent.
 */
export function Tissue({ colors, className }: { colors: string[]; className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)} style={{ "--fan": 1 } as CSSProperties}>
      {colors.slice(0, SHEETS.length).map((color, i) => (
        <span
          key={i}
          className="paper absolute inset-0 rounded-[3px] opacity-90 mix-blend-multiply"
          style={{
            backgroundColor: color,
            transform: `translate(calc(var(--fan, 1) * var(--fan-scale, 1) * ${SHEETS[i][0]}%), calc(var(--fan, 1) * var(--fan-scale, 1) * ${SHEETS[i][1]}%)) rotate(calc(var(--fan, 1) * var(--fan-scale, 1) * ${SHEETS[i][2]}deg))`,
          }}
        />
      ))}
    </div>
  );
}

/** Qualifying label for rendered example photos (FTC: next to the image, not only in the FAQ). */
export function ExampleChip({ className, label = "Example box" }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute bottom-2 left-2 rounded-full bg-cream-card/95 px-2.5 py-1 text-[11px] font-semibold leading-none text-ink shadow-sm",
        className,
      )}
    >
      {label}
    </span>
  );
}
