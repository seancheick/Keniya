import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Precise on purpose: Dr. Pham reviewed Keniya's box criteria (the screening standards every
 * snack is checked against). She does not review individual customers or give medical advice.
 */
export function ReviewerCard({ className }: { className?: string }) {
  return (
    <div
      id="reviewer"
      className={cn(
        "flex max-w-lg scroll-mt-28 items-center gap-4 rounded-[6px] border-2 border-ink bg-cream-card p-4 shadow-[0_18px_30px_-24px_rgb(37_37_37/0.6)] sm:p-5",
        className,
      )}
    >
      <Image
        src="/images/laurie-pham.webp"
        alt="Laurie Pham, PharmD, Keniya's clinical reviewer"
        width={64}
        height={64}
        className="size-16 shrink-0 rounded-full object-cover ring-4 ring-butter"
      />
      <p className="text-sm leading-relaxed text-ink-soft">
        <strong className="text-ink">Reviewed by Laurie Pham, PharmD.</strong>{" "}
        A Doctor of Pharmacy with 15+ years in drug safety reviewed the screening standards every
        snack in our boxes is checked against. It&rsquo;s a review of
        the box, not of you, and not personal medical advice.
      </p>
    </div>
  );
}
