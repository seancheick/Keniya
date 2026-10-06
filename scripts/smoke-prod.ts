/**
 * Production smoke test: every canonical public URL (home, each box's landing page, gifts,
 * llms.txt) returns 200, and every retired URL redirects (308) to its replacement.
 *
 *   pnpm smoke:prod                          # against https://keniyahealth.com
 *   pnpm smoke:prod https://preview.vercel.app
 */
import { giftLanding, landings } from "../src/lib/landing";

async function main() {
const base = (process.argv[2] ?? "https://keniyahealth.com").replace(/\/$/, "");
const pages = ["/", ...landings.map((l) => l.path), giftLanding.path, "/llms.txt", "/about", "/privacy", "/terms"];
const redirects = [...landings, giftLanding].flatMap((p) => (p.redirectFrom ?? []).map((from) => [from, p.path] as const));

let bad = 0;
for (const path of pages) {
  const res = await fetch(base + path, { redirect: "manual" });
  const ok = res.status === 200;
  if (!ok) bad++;
  console.log(`${ok ? "✓" : "✕"} ${res.status} ${path}`);
}
for (const [from, to] of redirects) {
  const res = await fetch(base + from, { redirect: "manual" });
  const loc = res.headers.get("location") ?? "";
  const ok = res.status === 308 && new URL(loc, base).pathname === to;
  if (!ok) bad++;
  console.log(`${ok ? "✓" : "✕"} ${res.status} ${from} → ${loc || "(no location)"}`);
}
console.log(bad ? `${bad} problem(s)` : `all ${pages.length + redirects.length} checks passed on ${base}`);
process.exit(bad ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
