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
      <header className="sticky top-0 z-30 border-b print:hidden bg-card/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 pt-3 sm:px-6">
          <Link href={admin.role === "clinician" ? "/admin/review" : "/admin"} className="font-display inline-flex min-h-11 items-center text-lg">
            Keniya <span className="text-muted-foreground">Admin</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {admin.role === "admin" && <Button asChild size="sm" className="max-sm:h-11">
              <Link href="/admin/inventory/log">
                <Plus /> Log purchase
              </Link>
            </Button>}
            <form action={logout} className="hidden sm:block">
              <Button variant="ghost" size="sm" type="submit" title={`Signed in as ${admin.name}`}>
                Sign out
              </Button>
            </form>
          </div>
        </div>
        {admin.role === "admin" ? <AdminNav /> : <nav className="px-4 py-3 text-sm">Finished PharmaGuide Team review</nav>}
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 [&_.grid>*]:min-w-0 max-sm:[&_[data-slot=button]]:min-h-11">{children}</main>
      <footer className="print:hidden px-4 pb-6 text-xs text-muted-foreground sm:px-6">
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
