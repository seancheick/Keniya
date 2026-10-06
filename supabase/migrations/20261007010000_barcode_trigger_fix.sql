-- Fix barcode_one_meaning(): it read NEW.gtin14, a stored generated column, which PostgreSQL
-- computes only after BEFORE triggers run (it is NULL there), so the cross-table guard never
-- matched and a product barcode could be registered again as an outer pack (reproduced on the
-- live database 2026-10-06). Normalize from the raw field instead, exactly as the generated
-- columns do, and compare against the other table's stored gtin14.
-- Regression test: supabase/tests/barcode_one_meaning.sql (pnpm db:test).
create or replace function public.barcode_one_meaning() returns trigger
language plpgsql set search_path = pg_catalog, public, pg_temp as $$
declare
  normalized text;
begin
  if tg_table_name = 'products' then
    if new.upc is null then return new; end if;
    normalized := lpad(regexp_replace(new.upc, '\D', '', 'g'), 14, '0');
    if exists (select 1 from public.purchase_packs where gtin14 = normalized) then
      raise exception 'Barcode % is registered as an outer pack, not a single pack', new.upc;
    end if;
  else
    normalized := lpad(new.gtin, 14, '0');
    if exists (select 1 from public.products where gtin14 = normalized) then
      raise exception 'Barcode % is already a product''s own barcode', new.gtin;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.barcode_one_meaning() from public, anon, authenticated;
