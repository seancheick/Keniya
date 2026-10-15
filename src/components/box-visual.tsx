import Image from "next/image";
import { ExampleChip } from "@/components/wrap";
import type { Box } from "@/lib/box";
import { cn } from "@/lib/utils";

/** The box photo, or its tissue colorway with the name until the box has been photographed. */
export function BoxVisual({ box, sizes, priority, className }: { box: Box; sizes: string; priority?: boolean; className?: string }) {
  if (box.image) {
    // The photo shows one example lineup; picks rotate. Say so on the photo itself.
    return (
      <>
        <Image src={box.image} alt={box.imageAlt} fill priority={priority} sizes={sizes} className={cn("object-cover", className)} />
        <ExampleChip className="bottom-1.5 left-1.5 px-2 py-0.5 text-[10px]" />
      </>
    );
  }
  return (
    <div
      data-colorway={box.colorway}
      className={cn("paper absolute inset-0 grid place-items-center bg-tissue p-4 text-center", className)}
      aria-label={box.imageAlt}
    >
      <span className="font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
        {box.name}
        <span className="text-coral-deep">.</span>
      </span>
    </div>
  );
}
