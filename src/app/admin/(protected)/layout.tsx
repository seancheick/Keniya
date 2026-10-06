import Link from "next/link";
import { Plus } from "lucide-react";
import { logout } from "@/actions/admin/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";

export default async function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireAdmin();
  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 pt-3 sm:px-6">
          <Link href="/admin" className="font-display inline-flex min-h-11 items-center text-lg">
            Keniya <span className="text-muted-foreground">Admin</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild size="sm" className="max-sm:h-11">
              <Link href="/admin/inventory/log">
                <Plus /> Log purchase
              </Link>
            </Button>
            <form action={logout} className="hidden sm:block">
              <Button variant="ghost" size="sm" type="submit" title={`Signed in as ${admin.name}`}>
                Sign out
              </Button>
            </form>
          </div>
        </div>
        <AdminNav />
      </header>
      {/* [&_.grid>*]:min-w-0: a grid track otherwise grows to its widest child (a wide table, a long badge) and pushes the page past a phone's width. */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 [&_.grid>*]:min-w-0">{children}</main>
      <footer className="px-4 pb-6 text-xs text-muted-foreground sm:px-6">
        Signed in as {admin.name} ·{" "}
        <form action={logout} className="inline">
          <button type="submit" className="inline-flex min-h-11 items-center underline sm:min-h-0">
            sign out
          </button>
        </form>{" "}
        · Curation aid only, not medical advice: final lineups need clinical sign-off.
      </footer>
    </>
  );
}
