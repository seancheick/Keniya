"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowLeftIcon, CheckIcon, XIcon } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WaitlistForm } from "@/components/waitlist-form";
import { BuyButton } from "@/components/buy-button";
import { boxes, requestable, cravings, UPDATES_INTEREST, type Box } from "@/lib/box";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const NO_ALLERGIES = "None of these";
const ALLERGY_OPTIONS = ["Tree nuts", "Peanuts", "Gluten", "Dairy"];
const SOMETHING_ELSE = "other";
const cravingLabel = (value: string | null) => cravings.find((c) => c.value === value)?.label;

// Category-level only: exact snacks rotate, so the quiz never promises a specific one.
function leanFor(slug: Box["slug"], craving: string | null): string {
  const sweet: Record<Box["slug"], string> = {
    blood_sugar: "more of the smarter sweets",
    heart: "extra fruit and a dark chocolate treat",
    pregnancy_comfort: "extra sweet treats",
    gestational_diabetes: "more of the smarter sweets",
    glp1: "a couple of small, portioned sweets",
    postpartum: "extra sweet treats",
  };
  if (craving === "sweet") return sweet[slug];
  if (craving === "salty") return "more of the salty, crunchy picks";
  return "a balance of sweet and salty";
}

/** A full-width answer row. Single-choice rows advance the quiz on tap. */
function Option({
  selected,
  onClick,
  children,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border-2 px-5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        selected ? "border-sage-deep bg-sage/15" : "border-border bg-cream-card hover:border-sage",
      )}
    >
      <span>
        <span className="block text-base font-semibold text-ink">{children}</span>
        {hint && <span className="mt-0.5 block text-sm leading-snug text-ink-soft">{hint}</span>}
      </span>
      <CheckIcon
        className={cn("size-5 shrink-0 text-sage-deep", selected ? "opacity-100" : "opacity-0")}
        strokeWidth={2.5}
        aria-hidden
      />
    </button>
  );
}

const check = <CheckIcon className="mt-0.5 size-4 shrink-0 text-sage-deep" strokeWidth={2.5} aria-hidden />;

type StepId = "who" | "box" | "avoid" | "craving" | "result" | "soon" | "email";

export function MatchQuiz({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(0);
  const [isGift, setIsGift] = useState<boolean | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [craving, setCraving] = useState<string | null>(null);
  const [wanted, setWanted] = useState<string[]>([]);
  const [request, setRequest] = useState("");
  const advancing = useRef(false);

  const box = boxes.find((b) => b.slug === pick);
  // Two paths: a box we sell (checkout), or "something else" (request a box → email).
  const flow: StepId[] =
    pick === SOMETHING_ELSE
      ? ["who", "box", "soon", "email"]
      : ["who", "box", "avoid", "craving", "result"];
  const current = flow[Math.min(step, flow.length - 1)];
  const questions = flow.length - 1;
  const done = current === "result" || current === "email";
  const realAllergies = allergies.filter((a) => a !== NO_ALLERGIES);
  const hasNutAllergy = realAllergies.some((a) => /nut/i.test(a));
  const they = isGift ? "they" : "you";

  // Short pause so the tap registers visually before the next question slides in.
  const next = () => {
    if (advancing.current) return;
    advancing.current = true;
    window.setTimeout(() => {
      setStep((s) => s + 1);
      advancing.current = false;
    }, 180);
  };

  const reset = () => {
    setStep(0);
    setIsGift(null);
    setPick(null);
    setAllergies([]);
    setCraving(null);
    setWanted([]);
    setRequest("");
  };

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const titles: Record<Exclude<StepId, "result" | "email">, string> = {
    who: "Who's this box for?",
    box: isGift ? "Lucky them. What are they navigating?" : "What are you navigating?",
    avoid: `Anything ${they} avoid?`,
    craving: isGift ? "What do they reach for?" : "What sounds good lately?",
    soon: "Which box should we make next?",
  };

  const wantedNames = requestable.filter((c) => wanted.includes(c.slug)).map((c) => c.name);
  const requestNote = [
    wantedNames.length ? `Wants: ${wantedNames.join(", ")}` : "",
    request.trim() ? `Asked for: ${request.trim()}` : "",
    isGift ? "(gift)" : "",
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 300);

  return (
    <Dialog onOpenChange={(open) => !open && reset()}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-h-[90dvh] gap-0 overflow-y-auto rounded-3xl border-border bg-cream p-0 sm:max-w-lg",
          // Phones: a bottom sheet instead of a centered card.
          "max-sm:top-auto max-sm:bottom-0 max-sm:max-w-none max-sm:translate-y-0 max-sm:rounded-b-none max-sm:data-[state=open]:slide-in-from-bottom-8",
        )}
      >
        {/* Header: back arrow, progress, close. Sticky so they stay reachable while scrolling. */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-cream px-5 py-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            aria-label="Back"
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-cream-deep",
              step === 0 && "invisible",
            )}
          >
            <ArrowLeftIcon className="size-5" />
          </button>
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-deep"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={questions}
            aria-valuenow={done ? questions : step}
          >
            <div
              className="h-full rounded-full bg-sage-deep transition-[width] duration-300"
              style={{ width: `${((done ? questions : step + 1) / questions) * 100}%` }}
            />
          </div>
          <DialogClose
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-cream-deep text-ink transition-colors hover:bg-border"
          >
            <XIcon className="size-4" />
          </DialogClose>
        </div>

        <div key={current} className="px-6 pb-8 pt-6 animate-in fade-in slide-in-from-right-4 duration-300">
          {!done && (
            <DialogHeader className="text-left">
              <p className="eyebrow">
                Step {step + 1} of {questions}
              </p>
              <DialogTitle className="font-display pt-2 text-3xl font-normal leading-tight text-ink">
                {titles[current as keyof typeof titles]}
              </DialogTitle>
              <DialogDescription className="sr-only">
                A few quick questions to match you with a Keniya box.
              </DialogDescription>
            </DialogHeader>
          )}

          {current === "who" && (
            <div className="mt-6 grid gap-3">
              {[
                { value: false, label: "Me" },
                { value: true, label: "It's a gift" },
              ].map((o) => (
                <Option
                  key={o.label}
                  selected={isGift === o.value}
                  onClick={() => {
                    setIsGift(o.value);
                    next();
                  }}
                >
                  {o.label}
                </Option>
              ))}
            </div>
          )}

          {current === "box" && (
            <div className="mt-6 grid gap-3">
              {boxes.map((b) => (
                <Option
                  key={b.slug}
                  selected={pick === b.slug}
                  hint={b.why}
                  onClick={() => {
                    setPick(b.slug);
                    next();
                  }}
                >
                  {b.name}
                </Option>
              ))}
              <Option
                selected={pick === SOMETHING_ELSE}
                hint="Menopause, kidney-conscious or your idea."
                onClick={() => {
                  setPick(SOMETHING_ELSE);
                  next();
                }}
              >
                Something else
              </Option>
            </div>
          )}

          {current === "avoid" && (
            <div className="mt-6 grid gap-3">
              <p className="-mt-2 text-sm text-ink-soft">Select all that apply.</p>
              {ALLERGY_OPTIONS.map((a) => (
                <Option
                  key={a}
                  selected={allergies.includes(a)}
                  onClick={() => setAllergies((prev) => toggle(prev.filter((x) => x !== NO_ALLERGIES), a))}
                >
                  {a}
                </Option>
              ))}
              <Option
                selected={allergies.includes(NO_ALLERGIES)}
                onClick={() => {
                  setAllergies([NO_ALLERGIES]);
                  next();
                }}
              >
                {NO_ALLERGIES}
              </Option>
              {realAllergies.length > 0 && (
                <Button onClick={next} className="mt-2 h-14 w-full rounded-full text-base font-semibold">
                  Continue
                </Button>
              )}
              <p className="text-xs text-ink-soft">
                Keniya isn&rsquo;t an allergen-free facility. Always check each sealed label.
              </p>
            </div>
          )}

          {current === "craving" && (
            <div className="mt-6 grid gap-3">
              {cravings.map((c) => (
                <Option
                  key={c.value}
                  selected={craving === c.value}
                  onClick={() => {
                    setCraving(c.value);
                    next();
                  }}
                >
                  {c.label}
                </Option>
              ))}
            </div>
          )}

          {current === "soon" && (
            <div className="mt-6 grid gap-3">
              <p className="-mt-2 text-sm text-ink-soft">
                We don&rsquo;t make these yet. Tap one, or tell us your idea.
              </p>
              {requestable.map((c) => (
                <Option
                  key={c.slug}
                  selected={wanted.includes(c.slug)}
                  hint={c.note}
                  onClick={() => {
                    setWanted([c.slug]);
                    next();
                  }}
                >
                  {c.name}
                </Option>
              ))}
              <label className="mt-1 block">
                <span className="text-sm font-semibold text-ink">Something we don&rsquo;t have yet?</span>
                <input
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && request.trim() && next()}
                  enterKeyHint="next"
                  maxLength={120}
                  placeholder="e.g. a kidney-friendly box"
                  className="mt-2 h-12 w-full rounded-2xl border-2 border-border bg-cream-card px-4 text-base text-ink placeholder:text-ink-soft/70 focus:border-sage-deep focus:outline-none"
                />
              </label>
              <Button
                onClick={next}
                disabled={!request.trim()}
                className="mt-2 h-14 w-full rounded-full text-base font-semibold"
              >
                Continue
              </Button>
            </div>
          )}

          {current === "email" && (
            <>
              <DialogHeader className="text-left">
                <p className="eyebrow">Request a box</p>
                <DialogTitle className="font-display pt-2 text-3xl font-normal leading-tight text-ink">
                  Tell us where to reach you.
                </DialogTitle>
                <DialogDescription className="pt-2 text-ink-soft">
                  {wantedNames.length > 0 ? `${wantedNames.join(", ")}. ` : ""}
                  {request.trim() ? `Your idea: ${request.trim()}. ` : ""}
                  Requests decide what we build next, and we&rsquo;ll email you if we make it. No spam.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-5">
                <WaitlistForm
                  // One confirmation email: the first box they picked, or the general list.
                  boxInterest={wanted[0] ?? UPDATES_INTEREST}
                  source="quiz_request"
                  cta="Send my request"
                  quiz={{ quizWho: requestNote || undefined }}
                />
              </div>

              <div className="mt-8 border-t border-border pt-6">
                <p className="font-display text-xl text-ink">
                  {isGift ? "Want to send something now?" : "Or order one of ours today"}
                </p>
                <ul className="mt-4 grid gap-3">
                  {boxes.map((b) => (
                    <li
                      key={b.slug}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-cream-card p-4"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{b.name}</span>
                        <span className="block text-sm text-ink-soft">
                          ${site.preorderPriceUSD} · {site.snackCount} snacks
                        </span>
                      </span>
                      <BuyButton
                        box={b}
                        gift={isGift === true}
                        showNote={false}
                        size="sm"
                        className="w-auto max-w-none shrink-0 [&>button]:h-10 [&>button]:w-auto [&>button]:px-5 [&>button]:text-sm"
                        label={isGift ? "Send" : "Preorder"}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {current === "result" && box && (
            <>
              <DialogHeader className="text-left">
                <p className="eyebrow">Your match</p>
                <DialogDescription className="sr-only">Your recommended Keniya box.</DialogDescription>
              </DialogHeader>
              <div className="mt-4 rounded-3xl bg-sage/15 p-6">
                <DialogTitle className="font-display text-3xl font-normal leading-tight text-ink">
                  We&rsquo;d pick the {box.name}.
                </DialogTitle>
                <p className="mt-4 text-sm font-semibold text-ink">Why it fits:</p>
                <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                  {box.categories
                    // Don't headline nuts to someone who just told us to avoid them.
                    .filter((c) => !(hasNutAllergy && /nut/i.test(c.name)))
                    .slice(0, 3)
                    .map((c) => (
                      <li key={c.name} className="flex gap-2">
                        {check}
                        <span>
                          <strong className="text-ink">
                            {c.count} {c.name.toLowerCase()}
                          </strong>
                          : {c.note}
                        </span>
                      </li>
                    ))}
                  <li className="flex gap-2">
                    {check}
                    <span>We&rsquo;ll lean toward {leanFor(box.slug, craving)}.</span>
                  </li>
                  {realAllergies.length > 0 && (
                    <li className="flex gap-2">
                      {check}
                      <span>Packed around {realAllergies.join(" and ").toLowerCase()} where we can.</span>
                    </li>
                  )}
                </ul>
                {box.caution && <p className="mt-3 text-sm font-semibold text-blush-ink">{box.caution}</p>}
                <p className="mt-5 text-base font-semibold text-ink">
                  ${site.preorderPriceUSD} · {site.snackCount} snacks · free shipping
                </p>
                <div className="mt-4">
                  <BuyButton
                    box={box}
                    gift={isGift === true}
                    showNote={false}
                    className="max-w-none [&>button]:h-14 [&>button]:w-full"
                    prefill={{
                      craving: craving ?? undefined,
                      avoid: realAllergies.join(", ") || undefined,
                    }}
                    label="Continue to secure checkout"
                  />
                </div>
                <p className="mt-3 text-center text-xs text-ink-soft">
                  Your answers are filled in at checkout{isGift ? ", where you add their address and note" : ""}.
                </p>
              </div>

              <details className="mt-5 text-sm">
                <summary className="cursor-pointer font-medium text-ink underline underline-offset-4">
                  Not ready yet? Save your answers
                </summary>
                <div className="mt-3">
                  <WaitlistForm
                    boxInterest={box.slug}
                    source="quiz"
                    cta="Save my answers"
                    quiz={{
                      quizWho: `${box.shortName}${isGift ? " (gift)" : ""}`,
                      quizAllergies: allergies,
                      quizCraving: cravingLabel(craving),
                    }}
                    compact
                  />
                </div>
              </details>
            </>
          )}

          {done && (
            <button
              type="button"
              onClick={reset}
              className="mt-6 block w-full text-center text-sm font-semibold text-ink hover:text-terracotta-deep"
            >
              Start over
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
