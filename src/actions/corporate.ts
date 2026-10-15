"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { getSupabaseAdminStrict } from "@/lib/supabase";
import { sendCorporateInquiry } from "@/lib/resend";
import { site } from "@/lib/site";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(255),
  company: z.string().trim().min(1).max(160),
  quantity: z.coerce.number().int().min(site.corporateMinBoxes).max(5000),
  needBy: z.string().trim().max(60).optional(),
  message: z.string().trim().max(1500).optional(),
});

export type CorporateInput = z.input<typeof schema>;

export async function requestCorporateGifts(input: CorporateInput): Promise<{ ok: boolean; message: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0].path[0]);
    const messages: Record<string, string> = {
      quantity: `Team orders start at ${site.corporateMinBoxes} boxes (up to 5,000). For fewer, order on the site.`,
      name: "Please add your name (up to 120 characters).",
      email: "Please add a valid work email.",
      company: "Please add your company (up to 160 characters).",
      needBy: "Keep \"Needed by\" to 60 characters, e.g. \"first week of December\".",
      message: "Keep the note to 1,500 characters.",
    };
    return { ok: false, message: messages[field] ?? "Please check the form and try again." };
  }
  const d = parsed.data;
  try {
    const db = getSupabaseAdminStrict();
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    const key = createHash("sha256").update(ip).digest("hex");
    const limited = await db.rpc("allow_public_attempt", { p_key: `corporate:ip:${key}`, p_limit: 3, p_window_seconds: 3600 });
    if (limited.error) throw new Error(limited.error.message);
    if (!limited.data) return { ok: false, message: "Too many requests. Please try again later." };
  } catch (error) {
    console.error("corporate inquiry limiter unavailable", error);
    return { ok: false, message: `We couldn't send that. Please email ${site.email}.` };
  }
  // The email is the only record, so a failed send is reported, never confirmed.
  const sent = await sendCorporateInquiry({ ...d, email: d.email.trim().toLowerCase() });
  return sent.ok
    ? { ok: true, message: "Thanks! We'll reply within two business days with a quote." }
    : { ok: false, message: `We couldn't send that. Please email ${site.email}.` };
}
