import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/admin/session";

// Gate for the admin area. Pages and actions check again with requireAdmin() (defense in
// depth); this keeps signed-out visitors from ever rendering an admin route.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  const session = verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session?.role === "clinician") {
    if (pathname === "/admin/review") return NextResponse.next();
    if (pathname === "/admin/reports/export") {
      return request.nextUrl.searchParams.get("table") === "clinician_packet"
        ? NextResponse.next() : new NextResponse("Operator access required", { status: 403 });
    }
    return NextResponse.redirect(new URL("/admin/review", request.url));
  }
  if (session) return NextResponse.next();
  const login = new URL("/admin/login", request.url);
  if (pathname !== "/admin") login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
