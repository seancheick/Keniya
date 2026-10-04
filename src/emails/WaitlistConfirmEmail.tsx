import { Heading, Text } from "@react-email/components";
import { boxes, comingSoon, UPDATES_INTEREST } from "@/lib/box";
import { site } from "@/lib/site";
import { Button, EmailShell, Panel, c, siteUrl, t } from "@/emails/layout";


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
  // General updates list: nothing is reserved, so no "spot saved" language.
  const updates = boxInterest === UPDATES_INTEREST;
  // GLP-1 / menopause / postpartum are waitlist-only; don't tell them to preorder.
  const boxName = box?.name ?? comingSoon.find((c) => c.slug === boxInterest)?.name ?? "Keniya snack box";

  return (
    <EmailShell
      preview={
        updates
          ? "You're subscribed to updates on new boxes and shipping."
          : box
            ? `Your spot for the ${box.name} is saved.`
            : `You're on the ${boxName} list.`
      }
      image={box?.image ?? "/images/hero-guide.jpg"}
      imageAlt={box?.imageAlt ?? "An open Keniya snack box"}
      footerNote={
        updates
          ? "You're getting this because you signed up for Keniya updates. We only email when there's news."
          : "You're getting this because you joined the Keniya list. We only email when there's news about your box."
      }
    >
      <Text style={t.eyebrow}>Welcome to Keniya</Text>
      <Heading style={t.h1}>{updates ? "You're subscribed." : "You're on the list."}</Heading>
      {updates ? (
        <Text style={t.body}>
          You&apos;re subscribed to updates on new boxes and shipping. Founding boxes ship{" "}
          {site.shipDate}, and there are only {site.firstRunPerBox} of each.
        </Text>
      ) : (
        <Text style={t.body}>
          We saved your spot for the <strong style={{ color: c.ink }}>{boxName}</strong>.{" "}
          {box
            ? `Preorders are open now, and there are only ${site.firstRunPerBox} of each box. Founding boxes ship ${site.shipDate}.`
            : "This box is still in development. You'll be the first to know when it opens."}
        </Text>
      )}

      {(quizWho || quizCraving) && (
        <Panel>
          <Text style={{ ...t.eyebrow, margin: "0 0 6px" }}>What we noted</Text>
          {quizWho && <Text style={{ ...t.small, color: c.ink }}>For: {quizWho}</Text>}
          {quizCraving && <Text style={{ ...t.small, color: c.ink }}>Cravings: {quizCraving}</Text>}
        </Panel>
      )}

      <Text style={t.body}>
        Your condition shapes the box: every snack has to pass Keniya&apos;s screening for it
        before it goes in. You get {site.snackCount} snacks and a{" "}
        <strong style={{ color: c.ink }}>Packed for You</strong> card explaining how we choose.
      </Text>

      <Button href={box ? `${siteUrl}/#box-${box.slug}` : `${siteUrl}/#boxes`}>
        {box ? `Preorder the ${box.shortName} box` : "See the boxes"}
      </Button>
    </EmailShell>
  );
}
