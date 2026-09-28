import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What Keniya collects, why, and who helps us handle it — plain-language privacy for our snack boxes, waitlists, and quiz.",
  alternates: { canonical: "/privacy" },
};

const EFFECTIVE = "September 28, 2026";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20 text-ink-soft [&_h2]:font-display [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:text-ink [&_li]:mt-2 [&_p]:mt-4 [&_p]:leading-relaxed [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="font-display text-headline text-ink">Privacy policy</h1>
      <p className="text-sm">Effective {EFFECTIVE}</p>
      <p>
        We collect only what it takes to pack your box and keep you posted. We never sell
        your information, and we don&rsquo;t use it for advertising.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong className="text-ink">When you join a list or take the quiz:</strong> your
          email address, which box you&rsquo;re interested in, and any answers you choose
          to give — who the box is for, allergies to pack around, and what you&rsquo;re
          craving.
        </li>
        <li>
          <strong className="text-ink">When you preorder:</strong> our payment processor,
          Stripe, collects your name, email, shipping and billing address, and payment
          details. We receive your order and shipping details and any gift note — never
          your full card number.
        </li>
        <li>
          <strong className="text-ink">When you browse:</strong> privacy-friendly page
          analytics (Vercel Web Analytics) that count visits without cookies and without
          following you across other sites.
        </li>
      </ul>

      <h2>Health-related answers</h2>
      <p>
        Some quiz answers — like pregnancy, a blood-sugar or heart-health focus, or
        allergies — are sensitive. We use them only to decide what goes in your box. We
        never sell them or share them for advertising. The quiz is optional: you can
        preorder without answering anything.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To pack and ship your box, including swaps around allergies you flag.</li>
        <li>To email you about your order, your ship date, and lists you joined.</li>
        <li>To answer your questions and improve future boxes.</li>
      </ul>

      <h2>Who helps us</h2>
      <p>
        We share information only with the service providers that run the store, and
        only for that purpose: Stripe (payments), Resend (email delivery), Supabase
        (database), and Vercel (website hosting and analytics).
      </p>

      <h2>Your choices</h2>
      <p>
        Email{" "}
        <a className="text-sage-deep underline-offset-2 hover:underline" href={`mailto:${site.email}`}>
          {site.email}
        </a>{" "}
        to see, correct, or delete what we hold about you, or to leave a list. We delete
        on request, except records we must keep for tax and accounting.
      </p>

      <h2>Children</h2>
      <p>Keniya isn&rsquo;t directed at children under 13, and we don&rsquo;t knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>
        If this policy changes, we&rsquo;ll update the date above — and email you first if
        the change affects how we use information you&rsquo;ve already given us.
      </p>
    </article>
  );
}
