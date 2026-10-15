import { Heading, Text } from "@react-email/components";
import { Button, EmailShell, Panel, c, siteUrl, t } from "@/emails/layout";

export type ClubEmailProps =
  | { kind: "link"; url: string }
  | { kind: "upcoming"; boxName: string; amountLabel: string; dateLabel: string }
  | { kind: "renewed"; boxName: string; amountLabel: string }
  | { kind: "held"; boxName: string }
  | { kind: "cancelled"; boxName: string; endsLabel: string | null };

export function clubSubject(p: ClubEmailProps): string {
  switch (p.kind) {
    case "link": return "Your Snack Club link";
    case "upcoming": return `Your next ${p.boxName} renews ${p.dateLabel}`;
    case "renewed": return `This month's ${p.boxName} is on its way to being packed`;
    case "held": return `We held this month's ${p.boxName}, and you weren't charged`;
    case "cancelled": return "Your Snack Club is cancelled";
  }
}

const manage = `${siteUrl}/club`;

/** One template for the Snack Club's lifecycle: plain, short, and always a way to manage it. */
export function ClubEmail(p: ClubEmailProps) {
  return (
    <EmailShell
      preview={clubSubject(p)}
      image="/images/hero-box.jpg"
      imageAlt="An example Keniya snack box"
      footerNote="You're getting this because you're in the Keniya Monthly Snack Club."
    >
      <Text style={t.eyebrow}>Monthly Snack Club</Text>
      {p.kind === "link" && (
        <>
          <Heading style={t.h1}>Manage your Snack Club.</Heading>
          <Text style={t.body}>Skip a month, pause, change your address or cancel. This link works for 24 hours.</Text>
          <Button href={p.url}>Open my Snack Club</Button>
          <Text style={t.small}>Didn&apos;t ask for this? You can ignore it; nothing changes.</Text>
        </>
      )}
      {p.kind === "upcoming" && (
        <>
          <Heading style={t.h1}>Your next box renews {p.dateLabel}.</Heading>
          <Text style={t.body}>
            We&apos;ll charge <strong style={{ color: c.ink }}>{p.amountLabel}</strong> for your {p.boxName} on {p.dateLabel} and pack a
            fresh mix that month. Want to skip this one, pause or cancel? You can do it online before then.
          </Text>
          <Button href={manage}>Skip, pause or cancel</Button>
        </>
      )}
      {p.kind === "renewed" && (
        <>
          <Heading style={t.h1}>This month&apos;s box is coming.</Heading>
          <Text style={t.body}>
            Your {p.boxName} renewed for <strong style={{ color: c.ink }}>{p.amountLabel}</strong>. We&apos;ll pack a fresh mix by hand
            and email tracking when it ships.
          </Text>
          <Button href={manage}>Manage my Snack Club</Button>
        </>
      )}
      {p.kind === "held" && (
        <>
          <Heading style={t.h1}>We held this month&apos;s box.</Heading>
          <Panel>
            <Text style={{ ...t.body, margin: 0 }}>
              We couldn&apos;t fill your {p.boxName} to its standards this month, so we didn&apos;t send it and you
              weren&apos;t charged. Your Snack Club carries on next month as usual.
            </Text>
          </Panel>
          <Button href={manage}>Manage my Snack Club</Button>
        </>
      )}
      {p.kind === "cancelled" && (
        <>
          <Heading style={t.h1}>Your Snack Club is cancelled.</Heading>
          <Text style={t.body}>
            {p.endsLabel
              ? `There are no more charges after ${p.endsLabel}. Any box you've already paid for still ships.`
              : "There are no more charges. Any box you've already paid for still ships."}{" "}
            Thanks for snacking with us; you can rejoin anytime.
          </Text>
          <Button href={`${siteUrl}/#boxes`}>See the boxes</Button>
        </>
      )}
    </EmailShell>
  );
}
