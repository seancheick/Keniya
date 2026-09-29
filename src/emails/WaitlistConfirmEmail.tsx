import { Heading, Text } from "@react-email/components";
import { boxes } from "@/lib/box";
import { site } from "@/lib/site";
import { Button, EmailShell, Panel, c, siteUrl, t } from "@/emails/layout";

const LATER_BOXES: Record<string, string> = {
  glp1: "GLP-1 Companion Box",
  menopause: "Menopause Comfort Box",
  postpartum: "Postpartum Recovery Box",
};

/** Welcome email after joining the list (site form or quiz). */
export function WaitlistConfirmEmail({
  boxInterest,
  quizWho,
  quizCraving,
}: {
  boxInterest: string;
  quizWho?: string;
  quizCraving?: string;
}) {
  const box = boxes.find((b) => b.slug === boxInterest);
  // GLP-1 / menopause / postpartum are waitlist-only; don't tell them to preorder.
  const boxName = box?.name ?? LATER_BOXES[boxInterest] ?? "Keniya snack box";

  return (
    <EmailShell
      preview={box ? `Your spot for the ${box.name} is saved.` : `You're on the ${boxName} list.`}
      image={box?.image ?? "/images/hero-unboxing.jpg"}
      imageAlt={box?.imageAlt ?? "An open Keniya snack box"}
      footerNote="You're getting this because you joined the Keniya list. We only email when there's news about your box."
    >
      <Text style={t.eyebrow}>Welcome to Keniya</Text>
      <Heading style={t.h1}>You&apos;re on the list.</Heading>
      <Text style={t.body}>
        We saved your spot for the <strong style={{ color: c.ink }}>{boxName}</strong>.{" "}
        {box
          ? `Preorders are open now, and there are only ${site.firstRunPerBox} of each box. Founding boxes ship ${site.shipDate}.`
          : "This box is still in development. You'll be the first to know when it opens."}
      </Text>

      {(quizWho || quizCraving) && (
        <Panel>
          <Text style={{ ...t.eyebrow, margin: "0 0 6px" }}>What we noted</Text>
          {quizWho && <Text style={{ ...t.small, color: c.ink }}>For: {quizWho}</Text>}
          {quizCraving && <Text style={{ ...t.small, color: c.ink }}>Cravings: {quizCraving}</Text>}
        </Panel>
      )}

      <Text style={t.body}>
        Every box has {site.snackCount} real snacks, picked for what you&apos;re going through, plus
        a <strong style={{ color: c.ink }}>Packed for You</strong> card that says why each one is
        there.
      </Text>

      <Button href={box ? `${siteUrl}/#box-${box.slug}` : `${siteUrl}/#boxes`}>
        {box ? `Preorder the ${box.shortName} box` : "See the boxes"}
      </Button>
    </EmailShell>
  );
}
