import { Heading, Text } from "@react-email/components";
import type { Box } from "@/lib/box";
import { site } from "@/lib/site";
import { Button, EmailShell, Panel, CategoryList, c, siteUrl, t } from "@/emails/layout";

export type OrderEmailProps = {
  box: Box;
  firstName?: string;
  amountCents: number;
  orderRef: string;
  gift: boolean;
  giftNote?: string;
  shipTo?: { name?: string; lines: string[] };
};

/** Sent after a paid Stripe Checkout session. */
export function OrderConfirmEmail({
  box,
  firstName,
  amountCents,
  orderRef,
  gift,
  giftNote,
  shipTo,
}: OrderEmailProps) {
  const amount = `$${(amountCents / 100).toFixed(2).replace(/\.00$/, "")}`;

  return (
    <EmailShell
      preview={`Your ${box.name} is reserved. It ships ${site.shipDate}.`}
      image={box.image}
      imageAlt={box.imageAlt}
      footerNote={`Order ${orderRef}. Changed your mind? Reply before your box ships for a full refund.`}
    >
      <Text style={t.eyebrow}>Order confirmed</Text>
      <Heading style={t.h1}>
        {firstName ? `Thank you, ${firstName}.` : "Thank you."} Your box is reserved.
      </Heading>
      <Text style={t.body}>
        {gift
          ? `Your gift is one of only ${site.firstRunPerBox} founding ${box.name}es. We'll pack it by hand and send it straight to them.`
          : `You got one of only ${site.firstRunPerBox} founding ${box.name}es. We'll pack it by hand and email you when it's on the way.`}
      </Text>

      <Panel>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            {[
              ["Box", box.name],
              ["Paid", `${amount} · free shipping`],
              ["Ships", site.shipDate],
              ...(shipTo ? [["Ship to", [shipTo.name, ...shipTo.lines].filter(Boolean).join(", ")]] : []),
            ].map(([k, v]) => (
              <tr key={k}>
                <td
                  valign="top"
                  style={{ padding: "5px 12px 5px 0", width: "72px", fontSize: "13px", color: c.inkSoft }}
                >
                  {k}
                </td>
                <td valign="top" style={{ padding: "5px 0", fontSize: "14px", color: c.ink, fontWeight: 500 }}>
                  {v}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {gift && giftNote && (
        <Panel tint={c.blush}>
          <Text style={{ ...t.eyebrow, color: c.blushInk, margin: "0 0 6px" }}>
            Your note for their card
          </Text>
          <Text style={{ ...t.body, margin: 0, color: c.blushInk, fontStyle: "italic" }}>
            &ldquo;{giftNote}&rdquo;
          </Text>
        </Panel>
      )}

      <Text style={{ ...t.eyebrow, marginTop: "26px" }}>What goes in</Text>
      <Text style={{ ...t.small, marginBottom: "12px" }}>
        {site.snackCount} snacks across these categories, chosen for {gift ? "them" : "you"}. The
        picks rotate with the season, and your Packed for You card names each one and why.
      </Text>
      <CategoryList categories={box.categories} />

      <Text style={{ ...t.eyebrow, marginTop: "26px" }}>What happens next</Text>
      <Text style={t.small}>
        1. We check every label for your box and pack it by hand.
        <br />
        2. You get a shipping email with tracking around {site.shipDate}.
        <br />
        3. Want to cancel? Reply to this email any time before it ships for a full refund.
      </Text>

      <Button href={`${siteUrl}/#gift`}>Send one as a gift</Button>
    </EmailShell>
  );
}
