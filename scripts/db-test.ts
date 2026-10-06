/**
 * Run the self-rolling-back database tests against the live project through the Supabase
 * Management API (no psql needed). Each test is one DO block that ends by raising
 * `<NAME>_PASSED`, so nothing it writes persists; any other error is a failure.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_… pnpm db:test
 *
 * The psql-style tests in supabase/tests (\gset) still need a scratch Postgres.
 */
import { existsSync, readFileSync } from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const TESTS: { file: string; sentinel: string }[] = [{ file: "supabase/tests/barcode_one_meaning.sql", sentinel: "BARCODE_TESTS_PASSED" }];

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF ?? process.env.SUPABASE_PROJECT_ID ?? "issfvpyewzlnxxdqrzqc";
  if (!token) throw new Error("Set SUPABASE_ACCESS_TOKEN (supabase.com → Account → Access Tokens).");
  let failed = 0;
  for (const t of TESTS) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: readFileSync(t.file, "utf8") }),
    });
    const body = await res.text();
    const passed = !res.ok && body.includes(t.sentinel);
    if (!passed) failed++;
    console.log(`${passed ? "✓" : "✕"} ${t.file}${passed ? "" : `\n    ${res.ok ? "finished without the sentinel (did it commit?)" : body.slice(0, 400)}`}`);
  }
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
