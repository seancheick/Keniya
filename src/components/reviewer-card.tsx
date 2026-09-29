import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Precise on purpose: Dr. Pham reviews Keniya's box criteria and seasonal lineups against
 * our screening standards. She does not review individual customers or give medical advice.
 */
export function ReviewerCard({ className }: { className?: string }) {
  return (
    <div
      id="reviewer"
      className={cn(
        "flex max-w-lg scroll-mt-28 items-center gap-4 rounded-2xl border border-border bg-cream-card p-4",
        className,
      )}
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
        A Doctor of Pharmacy with 15+ years in drug safety reviews our box criteria and each
        season&rsquo;s lineup against Keniya&rsquo;s screening standards. It&rsquo;s a review of
        the box, not of you, and not personal medical advice.
      </p>
    </div>
  );
}
