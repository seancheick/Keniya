"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { allowLoginAttempt } from "@/lib/admin/ratelimit";
import { adminConfigured, passwordMatches, SESSION_COOKIE, SESSION_DAYS, signSession } from "@/lib/admin/session";

export type LoginState = { error?: string; name?: string };

const schema = z.object({
  role: z.enum(["admin", "clinician"]).default("admin"),
  name: z.string().trim().min(1, "Add your name (it's recorded on what you change)").max(40),
  password: z.string().min(1, "Enter the admin password").max(200),
  next: z.string().optional(),
});

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!adminConfigured()) return { error: "Admin isn't set up: add ADMIN_PASSWORD to the environment." };
  const parsed = schema.safeParse(Object.fromEntries(form));
  // React resets the form after an action; hand the name back so it stays filled in.
  const name = String(form.get("name") ?? "").slice(0, 40);
  if (!parsed.success) return { error: parsed.error.issues[0].message, name };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  if (!(await allowLoginAttempt(ip))) return { error: "Too many attempts. Wait 10 minutes and try again.", name };
  if (!passwordMatches(parsed.data.password, parsed.data.role)) return { error: "Wrong password.", name };

  const token = signSession(parsed.data.name, Date.now(), parsed.data.role)!;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  const next = parsed.data.next;
  redirect(next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}
