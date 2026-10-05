import "server-only";
import { db } from "./db";

/** Find a vendor by name (case-insensitive) or create it. */
export async function ensureVendor(name: string | null | undefined, actor: string): Promise<string | null> {
  const clean = name?.trim();
  if (!clean) return null;
  const found = await db().from("vendors").select("id").ilike("name", clean.replace(/[%_]/g, "\\$&")).maybeSingle();
  if (found.data) return found.data.id;
  const created = await db().from("vendors").insert({ name: clean, created_by: actor }).select("id").single();
  if (created.error) {
    // Lost a race with another insert of the same name.
    const again = await db().from("vendors").select("id").eq("name", clean).maybeSingle();
    if (again.data) return again.data.id;
    throw new Error(created.error.message);
  }
  return created.data.id;
}
