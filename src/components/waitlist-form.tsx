"use client";

import { useState, useTransition } from "react";
import { joinWaitlist, type WaitlistInput } from "@/actions/waitlist";
import { Button } from "@/components/ui/button";

export function WaitlistForm({
  boxInterest = "pregnancy_comfort",
  source = "site",
  cta = "Get launch-day access",
  quiz,
  compact = false,
  variant = "default",
  onJoined,
}: {
  boxInterest?: string;
  source?: string;
  cta?: string;
  quiz?: Pick<WaitlistInput, "quizWho" | "quizAllergies" | "quizCraving">;
  compact?: boolean;
  /** "outline" when a stronger primary action (Preorder) sits nearby. */
  variant?: "default" | "outline";
  onJoined?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <p className={`font-medium text-sage-deep ${compact ? "text-sm" : ""}`}>
        ✓ {message}
      </p>
    );
  }

  return (
    <form
      className="w-full max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await joinWaitlist({ email, boxInterest, source, ...quiz });
          setMessage(res.message);
          if (res.ok) {
            setDone(true);
            onJoined?.();
          }
        });
      }}
    >
      <div className="flex w-full flex-wrap items-center gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          aria-label="Email address"
          className={`min-w-0 flex-1 rounded-full border border-border bg-cream-card px-5 text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-sage-deep focus-visible:ring-[3px] focus-visible:ring-ring/40 ${
            compact ? "h-11 text-sm" : "h-12"
          }`}
        />
        <Button
          type="submit"
          disabled={pending}
          size={compact ? "default" : "lg"}
          variant={variant}
          className={`rounded-full px-6 ${compact ? "h-11" : ""}`}
        >
          {pending ? "One sec…" : cta}
        </Button>
      </div>
      {message && !done && <p className="mt-2 text-sm text-terracotta-deep">{message}</p>}
    </form>
  );
}
