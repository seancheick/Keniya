-- One barcode, one meaning: a code is either a product's own (single-pack) barcode or an
-- outer purchase pack's, never both, however it is written (UPC-A vs zero-padded GTIN-14).
--
-- Runs as a single DO block that always ends by raising BARCODE_TESTS_PASSED, so every row it
-- writes is rolled back even against a live database:
--   pnpm db:test            (Supabase Management API; needs SUPABASE_ACCESS_TOKEN)
--   psql -d <db> -f supabase/tests/barcode_one_meaning.sql   (expects the sentinel error)
do $$
declare
  a uuid;
  b uuid;
  rejected boolean;
begin
  insert into public.products (name, upc) values ('Barcode test A', '036000291452') returning id into a;

  -- 1. Product barcode X, then a purchase pack X: rejected.
  rejected := false;
  begin insert into public.purchase_packs (product_id, gtin, units_per_pack) values (a, '036000291452', 6);
  exception when raise_exception or unique_violation then rejected := true; end;
  assert rejected, 'pack with an existing product barcode was accepted';

  -- 2. Same code written as a padded GTIN-14: still the same item, rejected.
  rejected := false;
  begin insert into public.purchase_packs (product_id, gtin, units_per_pack) values (a, '00036000291452', 6);
  exception when raise_exception or unique_violation then rejected := true; end;
  assert rejected, 'pack with the zero-padded form of a product barcode was accepted';

  -- 3. A distinct outer-pack code succeeds.
  insert into public.purchase_packs (product_id, gtin, units_per_pack) values (a, '012345678905', 10);

  -- 4. Purchase pack Y, then a product barcode Y (both spellings, insert and update): rejected.
  rejected := false;
  begin insert into public.products (name, upc) values ('Barcode test B', '012345678905');
  exception when raise_exception or unique_violation then rejected := true; end;
  assert rejected, 'product with an existing pack barcode was accepted';

  rejected := false;
  begin insert into public.products (name, upc) values ('Barcode test B', '0012345678905');
  exception when raise_exception or unique_violation then rejected := true; end;
  assert rejected, 'product with the EAN-13 form of a pack barcode was accepted';

  rejected := false;
  begin update public.products set upc = '012345678905' where id = a;
  exception when raise_exception or unique_violation then rejected := true; end;
  assert rejected, 'changing a product barcode to a pack barcode was accepted';

  -- 5. Distinct unit codes succeed, and a product with no barcode is fine.
  insert into public.products (name, upc) values ('Barcode test B', '042100005264') returning id into b;
  insert into public.products (name) values ('Barcode test C (no barcode)');
  update public.purchase_packs set units_per_pack = 12 where product_id = a;

  raise exception 'BARCODE_TESTS_PASSED';
end $$;
