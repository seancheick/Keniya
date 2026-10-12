import Image from "next/image";
import type { Box } from "@/lib/box";
import { cn } from "@/lib/utils";

const TINT: Record<Box["tint"], string> = { blush: "bg-blush", sage: "bg-sage/30", cream: "bg-cream-deep" };

/** The box photo, or a tinted panel with the name until the box has been photographed. */
export function BoxVisual({ box, sizes, priority, className }: { box: Box; sizes: string; priority?: boolean; className?: string }) {
  if (box.image) {
    // The photo shows one example lineup; picks rotate. Say so on the photo itself (FTC:
    // qualifying info belongs next to the claim, not only in the FAQ).
    return (
      <>
        <Image src={box.image} alt={box.imageAlt} fill priority={priority} sizes={sizes} className={cn("object-cover", className)} />
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-full bg-cream/90 px-2 py-0.5 text-[10px] font-medium leading-tight text-ink-soft shadow-sm">
          Example box
        </span>
      </>
    );
  }
  return (
    <div className={cn("absolute inset-0 grid place-items-center p-4 text-center", TINT[box.tint], className)} aria-label={box.imageAlt}>
      <span className="font-display text-2xl leading-tight text-ink sm:text-3xl">
        {box.name}
        <span className="text-terracotta">.</span>
      </span>
    </div>
  );
}
