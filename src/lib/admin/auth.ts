import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession, type AdminSession } from "./session";

/** The signed-in admin, or null. */
export async function getAdmin(): Promise<AdminSession | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Pages: redirect to login. Server actions: same (a redirect aborts the action). */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
