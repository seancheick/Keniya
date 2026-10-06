import { afterEach, describe, expect, it, vi } from "vitest";
import { passwordMatches, signSession, verifySession } from "./session";
afterEach(() => vi.unstubAllEnvs());
describe("role authenticated sessions", () => {
  it("typing Laurie with the shared admin password grants no clinician role", () => {
    vi.stubEnv("ADMIN_PASSWORD", "admin-test"); vi.stubEnv("CLINICIAN_PASSWORD", "clinician-test");
    expect(verifySession(signSession("Laurie Pham"))).toEqual({ name: "Laurie Pham", role: "admin" });
    expect(passwordMatches("admin-test", "clinician")).toBe(false);
    expect(passwordMatches("clinician-test", "clinician")).toBe(true);
    expect(verifySession(signSession("Anything", Date.now(), "clinician"))).toEqual({ name: "Laurie Pham", role: "clinician" });
  });
  it("equal passwords disable clinical login and rotated credentials invalidate sessions", () => {
    vi.stubEnv("ADMIN_PASSWORD", "admin-test"); vi.stubEnv("CLINICIAN_PASSWORD", "admin-test");
    expect(passwordMatches("admin-test", "clinician")).toBe(false);
    vi.stubEnv("CLINICIAN_PASSWORD", "unique-test");
    const token = signSession("Laurie", Date.now(), "clinician");
    vi.stubEnv("CLINICIAN_PASSWORD", "rotated-test");
    expect(verifySession(token)).toBeNull();
  });
});
