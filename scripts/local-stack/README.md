# Local Supabase stand-in for testing the admin end to end

Use this when Docker and the Supabase CLI aren't available. You need Postgres 16 and the PostgREST v12 static binary.

1. **Database and roles.**
   - Create a database `k`.
   - Run `stubs.sql` once. It creates stub roles (anon, authenticated, service_role) and a stub `storage.buckets`.
   - Run every file in `supabase/migrations` in order.
   - Run:
     ```sql
     create role authenticator login password 'auth' noinherit;
     grant anon, authenticated, service_role to authenticator;
     grant usage, select on all sequences in schema public to service_role;
     grant usage on schema storage to service_role;
     ```
2. **PostgREST.**
   - Config: `db-uri = "postgres://authenticator:auth@localhost:<port>/k"`, `db-schemas = "public"`, `db-anon-role = "anon"`, `jwt-secret = "<32+ chars>"`, `server-port = 54322`.
3. **Proxy.**
   - Run `node scripts/local-stack/proxy.mjs`.
   - It serves `/rest/v1` (forwarding to PostgREST) and a file-backed `/storage/v1` on port 54321.
4. **Keys.**
   - Mint HS256 JWTs signed with the PostgREST secret, with payload `{role: "service_role" | "anon", exp: 2000000000}`.
   - Put them in `.env.local` along with:
     - `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `ADMIN_PASSWORD`
5. **Data.**
   - Run `pnpm import:workbook <xlsx>`.
   - Seed stock for one box and add a paid `preorders` row (see HANDOFF.md).
6. **Run the test.**
   ```bash
   pnpm dev
   ADMIN_PASSWORD=... SHOTS_DIR=/tmp PLAYWRIGHT_PATH=$(npm root -g)/playwright node scripts/local-stack/e2e.cjs
   ```

`supabase/tests/fefo.sql` tests packing, stock shortages and the anon lockdown directly in SQL.
