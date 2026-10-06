import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import { SESSION_COOKIE, signSession } from "./lib/admin/session";

afterEach(() => vi.unstubAllEnvs());
describe("clinician review routes", () => {
  const request = (path: string, role: "admin" | "clinician" = "clinician") => {
    vi.stubEnv("ADMIN_PASSWORD", "operator-test");
    vi.stubEnv("CLINICIAN_PASSWORD", "clinician-test");
    const r = new NextRequest(`https://keniyahealth.com${path}`);
    r.cookies.set(SESSION_COOKIE, signSession("Laurie Pham", Date.now(), role)!);
    return r;
  };
  it("sends Laurie to finished review instead of unfinished catalog and operations", () => {
    for (const path of ["/admin", "/admin/products", "/admin/products/new", "/admin/inventory", "/admin/products/unfinished"]) {
      expect(proxy(request(path)).headers.get("location")).toBe("https://keniyahealth.com/admin/review");
    }
  });
  it("allows the review page and finished packet, but blocks internal exports", () => {
    expect(proxy(request("/admin/review")).status).toBe(200);
    expect(proxy(request("/admin/reports/export?table=clinician_packet")).status).toBe(200);
    expect(proxy(request("/admin/reports/export?table=clinical_review")).status).toBe(403);
    expect(proxy(request("/admin/reports/export?table=products")).status).toBe(403);
  });
  it("preserves operator access to the entire catalog", () => {
    expect(proxy(request("/admin/products", "admin")).status).toBe(200);
  });
});
