import { Heading, Link, Section, Text } from "@react-email/components";
import { site } from "@/lib/site";
import { Button, CategoryList, EmailShell, Panel, c, t } from "@/emails/layout";
import type { OrderEmailProps } from "@/emails/OrderConfirmEmail";

export type OrderAlertProps = OrderEmailProps & {
  customerEmail: string;
  customerName?: string;
  /** Paid orders for this box so far, including this one (null if the DB count failed). */
  soldCount: number | null;
  paymentIntentId?: string;
  sessionId: string;
};

const row = (k: string, v: React.ReactNode) => (
  <tr key={k}>
    <td valign="top" style={{ padding: "5px 12px 5px 0", width: "84px", fontSize: "13px", color: c.inkSoft }}>
      {k}
    </td>
    <td valign="top" style={{ padding: "5px 0", fontSize: "14px", color: c.ink, fontWeight: 500 }}>
      {v}
    </td>
  </tr>
);

/** Founder packing slip: sent to hello@ for every paid order. */
export function OrderAlertEmail(p: OrderAlertProps) {
  const left = p.soldCount == null ? null : Math.max(site.firstRunPerBox - p.soldCount, 0);
  const stripeUrl = p.paymentIntentId
    ? `https://dashboard.stripe.com/payments/${p.paymentIntentId}`
    : "https://dashboard.stripe.com/payments";

  return (
    <EmailShell
      internal
      preview={`${p.box.shortName}${p.gift ? " gift" : ""} for ${p.shipTo?.name ?? p.customerEmail}${
        left != null ? ` · ${left} left` : ""
      }`}
    >
      <Text style={t.eyebrow}>New order{p.gift ? " · gift" : ""}</Text>
      <Heading style={t.h1}>{p.box.name}</Heading>

      {/* Scoreboard: order number and stock left, the two numbers that matter at a glance. */}
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ margin: "4px 0 8px" }}>
        <tbody>
          <tr>
            {[
              [p.soldCount != null ? `#${p.soldCount}` : "—", `of ${site.firstRunPerBox}`],
              [left != null ? String(left) : "—", "left"],
              [`$${(p.amountCents / 100).toFixed(0)}`, "paid"],
            ].map(([big, small], i) => (
              <td
                key={small}
                width="33%"
                style={{
                  padding: "14px 8px",
                  textAlign: "center",
                  backgroundColor: i === 1 && left != null && left <= 10 ? c.blush : c.creamDeep,
                  borderRadius: "14px",
                  border: `4px solid ${c.card}`,
                }}
              >
                <Text style={{ margin: 0, fontSize: "26px", color: c.ink, fontFamily: "Georgia, serif" }}>{big}</Text>
                <Text style={{ ...t.small, margin: 0, fontSize: "12px" }}>{small}</Text>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {p.gift && (
        <Panel tint={c.blush}>
          <Text style={{ ...t.eyebrow, color: c.blushInk, margin: "0 0 6px" }}>
            🎁 Gift: print this on their card
          </Text>
          <Text
            style={{ margin: 0, fontSize: "18px", lineHeight: 1.5, color: c.blushInk, fontFamily: "Georgia, serif", fontStyle: "italic" }}
          >
            {p.giftNote ? `“${p.giftNote}”` : "(No message written. Use a simple “A gift for you.”)"}
          </Text>
          <Text style={{ ...t.small, marginTop: "8px", color: c.blushInk }}>
            From {p.customerName ?? p.customerEmail}. No prices or receipt in the box.
          </Text>
        </Panel>
      )}

      <Text style={{ ...t.eyebrow, marginTop: "22px" }}>Ship to</Text>
      <Section
        style={{ padding: "14px 18px", border: `1px dashed ${c.line}`, borderRadius: "12px", backgroundColor: "#FFFFFF" }}
      >
        {p.shipTo ? (
          <Text style={{ margin: 0, fontSize: "16px", lineHeight: 1.55, color: c.ink }}>
            <strong>{p.shipTo.name}</strong>
            {p.shipTo.lines.map((l) => (
              <span key={l}>
                <br />
                {l}
              </span>
            ))}
          </Text>
        ) : (
          <Text style={{ margin: 0, color: c.terracottaDeep }}>
            No address came through. Check the payment in Stripe before packing.
          </Text>
        )}
      </Section>

      <Panel>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            {row("Buyer", p.customerName ?? "—")}
            {row(
              "Email",
              <Link href={`mailto:${p.customerEmail}`} style={{ color: c.sage }}>
                {p.customerEmail}
              </Link>,
            )}
            {row("Order", p.orderRef)}
            {row("Ships", site.shipDate)}
          </tbody>
        </table>
      </Panel>

      <Text style={{ ...t.eyebrow, marginTop: "22px" }}>Packing checklist</Text>
      <CategoryList categories={p.box.categories} />
      <Text style={{ ...t.small, marginTop: "10px" }}>
        ☐ Check every label against the box rules and expiry dates
        <br />☐ Fill in the Packed for You card: each snack and why
        {p.gift ? (
          <>
            <br />☐ Hand-write or print the gift message above
          </>
        ) : null}
        <br />☐ Seal, label, and email tracking when it ships
      </Text>

      <Button href={stripeUrl}>Open payment in Stripe</Button>
      <Text style={{ ...t.small, textAlign: "center", fontSize: "12px" }}>
        Reply to this email to write to the buyer directly.
      </Text>
      <Text style={{ ...t.small, textAlign: "center", fontSize: "11px", color: "#9A938A", marginTop: "6px" }}>
        {p.sessionId}
      </Text>
    </EmailShell>
  );
}
