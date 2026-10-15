import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { socialCards, type SocialCard } from "@/lib/social";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(socialCards).map((card) => ({ card }));
}

/** Build once: social crawlers never depend on the catalog or remote image hosts. */
export async function GET(_request: Request, { params }: { params: Promise<{ card: string }> }) {
  const { card } = await params;
  if (!Object.hasOwn(socialCards, card)) return new Response("Not found", { status: 404 });
  const design = socialCards[card as SocialCard];
  const photo = await readFile(join(process.cwd(), "public/images", design.photo));
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#fff8ef", color: "#252525", padding: 32 }}>
      <div style={{ display: "flex", flexDirection: "column", width: 480, flexShrink: 0, padding: "18px 26px 16px 14px" }}>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: -4, color: "#b23a2c" }}>Keniya.</div>
        <div style={{ width: 440, flexShrink: 0, marginTop: 48, fontSize: card === "gestational_diabetes" ? 52 : 64, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>{design.headline}</div>
        <div style={{ width: 440, flexShrink: 0, marginTop: 26, fontSize: 24, lineHeight: 1.4, color: "#5b554d" }}>{design.subtitle}</div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 20, color: "#5b554d" }}>keniyahealth.com</div>
      </div>
      <div style={{ display: "flex", position: "relative", width: 656, height: 566, flexShrink: 0, borderRadius: 20, overflow: "hidden", background: "#f7b8cc", border: "2px solid #252525" }}>
        {/* ImageResponse embeds the bytes in the PNG; next/image is not supported here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/jpeg;base64,${photo.toString("base64")}`} alt="" width={656} height={566} style={{ position: "absolute", top: 0, left: 0, width: 656, height: 566, objectFit: "cover", objectPosition: "65% center" }} />
        <div style={{ display: "flex", position: "absolute", top: 22, left: 22, background: design.color, border: "2px solid #252525", borderRadius: 40, padding: "12px 22px", fontSize: 22, fontWeight: 700, transform: "rotate(-5deg)" }}>Packed for you.</div>
        <div style={{ display: "flex", position: "absolute", bottom: 14, right: 14, background: "#fff8ef", borderRadius: 20, padding: "6px 12px", color: "#5b554d", fontSize: 14 }}>Illustrative box · contents vary</div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
