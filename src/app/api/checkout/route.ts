import { NextResponse } from "next/server";
import { startCheckout, type CheckoutInput } from "@/actions/checkout";

/** POST { boxSlug, gift?, craving?, avoid? } → { ok, url } | { ok:false, message } — backup to server actions. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<CheckoutInput>;
    const result = await startCheckout({
      boxSlug: body.boxSlug ?? "",
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
