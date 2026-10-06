import { NextResponse } from "next/server";
import { startCheckout, type CheckoutInput } from "@/actions/checkout";

/** POST { boxSlug, gift?, craving?, avoid? } → { ok, url } | { ok:false, message } — backup to server actions. */
export async function POST(req: Request) {
  try {
    if (Number(req.headers.get("content-length") ?? 0) > 4096) return NextResponse.json({ ok: false }, { status: 413 });
    const text = await req.text();
    if (text.length > 4096) return NextResponse.json({ ok: false }, { status: 413 });
    const body = JSON.parse(text) as Partial<CheckoutInput>;
    const result = await startCheckout({
      boxSlug: body.boxSlug ?? "",
      requestKey: body.requestKey ?? "",
      gift: body.gift === true,
      craving: body.craving,
      avoid: body.avoid,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    console.error("api/checkout", err);
    return NextResponse.json(
      {
        ok: false,
        needsEmail: true,
        message: "Checkout failed — hold your spot with email.",
        code: "api_crash",
      },
      { status: 500 },
    );
  }
}
