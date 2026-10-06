import { Heading, Text } from "@react-email/components";
import { boxes, requestable, UPDATES_INTEREST } from "@/lib/box";
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
  const boxName = box?.name ?? requestable.find((c) => c.slug === boxInterest)?.name ?? "Keniya snack box";

  return (
    <EmailShell
      preview={
        updates
          ? "You're subscribed to updates on new boxes and shipping."
          : box
            ? `You're on the ${box.name} list.`
            : `You're on the ${boxName} list.`
      }
      image={box?.image ?? "/images/hero-box.jpg"}
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
          {site.shipDate}, in small founding runs.
        </Text>
      ) : (
        <Text style={t.body}>
          You joined the updates list for the <strong style={{ color: c.ink }}>{boxName}</strong>.{" "}
          {box
            ? "We'll email you when availability changes. Joining this list does not reserve a box."
            : "Thanks for the request. Requests decide what we build next, and if we make it, you'll be the first to know."}
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
        {box ? `View the ${box.shortName} box` : "See the boxes"}
      </Button>
    </EmailShell>
  );
}
