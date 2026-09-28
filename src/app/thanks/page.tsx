import Link from "next/link";
import { site } from "@/lib/site";

export const metadata = {
  title: "Thank you",
  description: "Your Keniya founding preorder is confirmed.",
  robots: { index: false, follow: false },
};

export default async function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ box?: string; session_id?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 lg:py-28">
      <p className="eyebrow">You&rsquo;re in</p>
      <h1 className="font-display text-display mt-5 text-ink">
        Thank you — someone is packing this{" "}
        <em className="text-terracotta-deep">for you</em>.
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-ink-soft">
        Your founding preorder is confirmed
        {sp.box ? ` (${sp.box.replaceAll("_", " ")})` : ""}. Your box ships{" "}
        {site.shipDate} — we&rsquo;ll email packing notes and anything we need for allergy swaps.{" "}
        {site.freeShippingLabel} is included.
      </p>
      <p className="mt-4 text-sm text-ink-soft">
        Questions anytime:{" "}
        <a className="text-sage-deep underline-offset-2 hover:underline" href={`mailto:${site.email}`}>
          {site.email}
        </a>
      </p>
      <Link
        href="/#boxes"
        className="mt-10 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
      >
        Back to the boxes
      </Link>
    </div>
  );
}
