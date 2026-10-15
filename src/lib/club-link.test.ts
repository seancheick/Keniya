import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { signClubLink, verifyClubLink } from "./club-link";

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = "a-test-secret-that-is-long-enough";
  delete process.env.CLUB_LINK_SECRET;
});
describe("Snack Club manage links", () => {
  it("round-trips the subscriptions it opens, with nothing personal in it", () => {
    const t = signClubLink(["sub_1", "sub_2"])!;
    expect(verifyClubLink(t)).toEqual(["sub_1", "sub_2"]);
    expect(Buffer.from(t.split(".")[0], "base64url").toString()).not.toContain("@");
  });
  it("expires after 24 hours", () => {
    const t = signClubLink(["sub_1"], 0)!;
    expect(verifyClubLink(t, 24 * 3_600_000 - 1)).toEqual(["sub_1"]);
    expect(verifyClubLink(t, 24 * 3_600_000 + 1)).toBeNull();
  });
  it("rejects a tampered list or signature", () => {
    const [, sig] = signClubLink(["sub_1"])!.split(".");
    const forged = Buffer.from(JSON.stringify({ s: ["sub_other"], exp: Date.now() + 1e6 })).toString("base64url");
    expect(verifyClubLink(`${forged}.${sig}`)).toBeNull();
    expect(verifyClubLink("garbage")).toBeNull();
    expect(verifyClubLink(`${signClubLink(["sub_1"])}.extra`)).toBeNull();
  });
  it("is off when no secret is configured or nothing to open", () => {
    expect(signClubLink([])).toBeNull();
    delete process.env.ADMIN_SESSION_SECRET;
    expect(signClubLink(["sub_1"])).toBeNull();
  });
});
