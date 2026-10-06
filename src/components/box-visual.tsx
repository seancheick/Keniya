import Image from "next/image";
import type { Box } from "@/lib/box";
import { cn } from "@/lib/utils";

const TINT: Record<Box["tint"], string> = { blush: "bg-blush", sage: "bg-sage/30", cream: "bg-cream-deep" };

/** The box photo, or a tinted panel with the name until the box has been photographed. */
export function BoxVisual({ box, sizes, priority, className }: { box: Box; sizes: string; priority?: boolean; className?: string }) {
  if (box.image) {
    return <Image src={box.image} alt={box.imageAlt} fill priority={priority} sizes={sizes} className={cn("object-cover", className)} />;
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
