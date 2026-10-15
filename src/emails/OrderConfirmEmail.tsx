import { Heading, Text } from "@react-email/components";
import type { PublicBox as Box } from "@/lib/box";
import { site } from "@/lib/site";
import { Button, EmailShell, Panel, CategoryList, c, siteUrl, t } from "@/emails/layout";

export type OrderEmailProps = {
  box: Box;
  firstName?: string;
  amountCents: number;
  orderRef: string;
  gift: boolean;
  giftNote?: string;
  /** Checkout's "Allergies or foods to avoid": steers selection within the eligible pool. */
  avoid?: string;
  /** Checkout's sweet-or-salty answer, as its label. */
  craving?: string;
  shipTo?: { name?: string; lines: string[] };
  /** Monthly Snack Club: the recurring price (the first box is part of this order). */
  club?: { priceCents: number };
};

/** Sent after a paid Stripe Checkout session. */
export function OrderConfirmEmail({
  box,
  firstName,
  amountCents,
  orderRef,
  gift,
  giftNote,
  avoid,
  shipTo,
  club,
}: OrderEmailProps) {
  const amount = `$${(amountCents / 100).toFixed(2).replace(/\.00$/, "")}`;

  return (
    <EmailShell
      preview={club ? `Welcome to the Snack Club. Your first ${box.name} ships ${site.shipDate}.` : `Your ${box.name} is confirmed. First boxes ship ${site.shipDate}.`}
      image={box.image}
      imageAlt={box.imageAlt}
      footerNote={club ? `Order ${orderRef}. Skip, pause or cancel anytime at ${siteUrl}/club.` : `Order ${orderRef}. Changed your mind? Reply before your box ships for a full refund.`}
    >
      <Text style={t.eyebrow}>Order confirmed</Text>
      <Heading style={t.h1}>
        {firstName ? `Thank you, ${firstName}.` : "Thank you."} {club ? "Welcome to the Snack Club." : "Your order is confirmed."}
      </Heading>
      <Text style={t.body}>
        {club
          ? `Your first ${box.name} ships with our first boxes, then a fresh mix arrives every month. ${`$${(club.priceCents / 100).toFixed(2).replace(/\.00$/, "")}`} renews on the same date each month until you cancel; skip, pause or cancel online anytime.`
          : gift
            ? "We'll pack it by hand and send it straight to them."
            : "We'll pack it by hand and email you when it's on the way."}
      </Text>

      <Panel>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            {[
              ["Box", box.name],
              ["Paid", `${amount} · free shipping`],
              ...(club ? [["Renews", `Monthly, ${`$${(club.priceCents / 100).toFixed(2).replace(/\.00$/, "")}`}`]] : []),
              ["Ships", club ? `First box ${site.shipDate}` : site.shipDate],
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
        <Panel tint={c.butter}>
          <Text style={{ ...t.eyebrow, color: c.butterInk, margin: "0 0 6px" }}>
            Your gift note, printed in the box
          </Text>
          <Text style={{ ...t.body, margin: 0, color: c.butterInk, fontStyle: "italic" }}>
            &ldquo;{giftNote}&rdquo;
          </Text>
        </Panel>
      )}

      {avoid && (
        <Panel>
          <Text style={{ ...t.eyebrow, margin: "0 0 6px" }}>You asked us to avoid</Text>
          <Text style={{ ...t.small, color: c.ink }}>{avoid}</Text>
          <Text style={{ ...t.small, marginTop: "6px" }}>
            We&apos;ll steer around it where we can. Snacks ship sealed with their full labels, and
            we can&apos;t rule out cross-contact at the maker, so please check each one.
          </Text>
        </Panel>
      )}

      <Text style={{ ...t.eyebrow, marginTop: "26px" }}>What goes in</Text>
      <Text style={{ ...t.small, marginBottom: "12px" }}>
        {site.snackCount} snacks across these categories. Each one has to pass Keniya&apos;s
        screening for this box, picks rotate with the season, and a Packed for You card
        explains how we choose.
      </Text>
      <CategoryList categories={box.categories} />

      <Text style={{ ...t.eyebrow, marginTop: "26px" }}>What happens next</Text>
      <Text style={t.small}>
        1. We check every label for your box and pack it by hand.
        <br />
        2. You get a shipping email with tracking around {site.shipDate}.
        <br />
        {club ? (
          <>
            3. Each month we email you before your renewal, so you can skip or pause in time.
          </>
        ) : (
          <>3. Want to cancel? Reply to this email any time before it ships for a full refund.</>
        )}
      </Text>

      {club ? <Button href={`${siteUrl}/club`}>Manage my Snack Club</Button> : <Button href={`${siteUrl}/#gift`}>Send one as a gift</Button>}
    </EmailShell>
  );
}
