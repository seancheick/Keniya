-- One unique index arbitrates identities across both tables, including concurrent writes.
create table public.barcode_identities (
  gtin14 text primary key,
  product_id uuid unique references public.products(id) on delete cascade,
  purchase_pack_id uuid unique references public.purchase_packs(id) on delete cascade,
  check (num_nonnulls(product_id, purchase_pack_id) = 1)
);
alter table public.barcode_identities enable row level security;
revoke all on public.barcode_identities from public, anon, authenticated;
grant all on public.barcode_identities to service_role;
insert into public.barcode_identities(gtin14, product_id) select gtin14,id from public.products where gtin14 is not null;
insert into public.barcode_identities(gtin14, purchase_pack_id) select gtin14,id from public.purchase_packs;
-- Abort on existing collisions: conflicting identities require human correction, never merging.
drop trigger products_barcode_one_meaning on public.products;
drop trigger purchase_packs_barcode_one_meaning on public.purchase_packs;
create function public.sync_barcode_identity() returns trigger language plpgsql
set search_path = pg_catalog, public, pg_temp as $$
begin
  if tg_table_name = 'products' then
    if tg_op = 'UPDATE' then delete from public.barcode_identities where product_id = new.id; end if;
    if new.gtin14 is not null then insert into public.barcode_identities(gtin14,product_id) values(new.gtin14,new.id); end if;
  else
    if tg_op = 'UPDATE' then delete from public.barcode_identities where purchase_pack_id = new.id; end if;
    insert into public.barcode_identities(gtin14,purchase_pack_id) values(new.gtin14,new.id);
  end if;
  return new;
end $$;
revoke all on function public.sync_barcode_identity() from public, anon, authenticated;
create trigger products_global_identity after insert or update of upc on public.products for each row execute function public.sync_barcode_identity();
create trigger purchase_packs_global_identity after insert or update of gtin on public.purchase_packs for each row execute function public.sync_barcode_identity();

create function public.valid_gs1(code text) returns boolean language plpgsql immutable
set search_path = pg_catalog as $$
declare total integer := 0; i integer;
begin
  if code is null or code !~ '^([0-9]{8}|[0-9]{12,14})$' then return false; end if;
  for i in 1..length(code)-1 loop
    total := total + substring(code, length(code)-i, 1)::integer * case when i % 2 = 1 then 3 else 1 end;
  end loop;
  return ((10 - total % 10) % 10) = right(code,1)::integer;
end $$;
create function public.guard_barcode_provenance() returns trigger language plpgsql
set search_path = pg_catalog, public, pg_temp as $$
begin
  if tg_table_name = 'products' then
    if tg_op = 'UPDATE' and new.upc is distinct from old.upc then
      new.barcode_status := 'unverified'; new.barcode_sources := '[]'; new.barcode_checked_at := null;
    end if;
    if new.barcode_status = 'verified' and not public.valid_gs1(new.upc) then raise exception 'Verified unit barcode needs a valid GS1 check digit'; end if;
  else
    if tg_op = 'UPDATE' and (new.gtin,new.product_id,new.units_per_pack) is distinct from (old.gtin,old.product_id,old.units_per_pack) then
      new.barcode_status := 'candidate'; new.barcode_sources := '[]';
    end if;
    if new.barcode_status = 'verified' and not public.valid_gs1(new.gtin) then
      raise exception 'Verified pack barcode needs a valid GS1 check digit';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_barcode_provenance() from public, anon, authenticated;
create trigger products_provenance before insert or update on public.products for each row execute function public.guard_barcode_provenance();
create trigger purchase_packs_provenance before insert or update on public.purchase_packs for each row execute function public.guard_barcode_provenance();
-- Revoke stale provenance/attestations for legacy invalid identities before adding
-- stronger verification. Keep the raw identifier visible for human correction.
do $$
declare unsafe uuid[];
begin
  select array_agg(distinct id) into unsafe from (
    select id from public.products where upc is not null and not public.valid_gs1(upc)
    union select product_id from public.purchase_packs where barcode_status='verified' and not public.valid_gs1(gtin)
  ) ids;
  update public.products set barcode_status='unverified',barcode_sources='[]',barcode_checked_at=null
    where upc is not null and not public.valid_gs1(upc);
  update public.purchase_packs set barcode_status='candidate',barcode_sources='[]'
    where barcode_status='verified' and not public.valid_gs1(gtin);
  update public.product_versions set verified_at=null,verified_by=null where product_id=any(unsafe) and is_current;
  update public.products set status='Candidate',diligence_status='candidate',prescreened_by=null,prescreened_at=null,
    clinical_decision='pending',approval_role=null,reviewed_by=null,reviewed_at=null,updated_at=clock_timestamp()
    where id=any(unsafe);
end $$;

-- Historical expiry attestations cannot assert shelf life for future lots.
update public.product_versions set pregnancy_checks = pregnancy_checks - 'P9' where pregnancy_checks ? 'P9';

-- Metadata and formula changes commit together. The caller authenticates the admin;
-- only the server service role can execute this primitive.
create function public.save_product(p_id uuid, p_product jsonb, p_version jsonb, p_actor text,
  p_new_version boolean, p_expected_updated_at timestamptz, p_outer_gtin text, p_outer_units integer)
returns uuid language plpgsql set search_path = pg_catalog, public, pg_temp as $$
declare
  p public.products; v public.product_versions; previous public.products; current_v public.product_versions;
  target uuid; changed boolean; next_version integer;
begin
  p := jsonb_populate_record(null::public.products, p_product);
  v := jsonb_populate_record(null::public.product_versions, p_version);
  v.pregnancy_checks := coalesce(v.pregnancy_checks,'{}') - 'P9';
  if p_id is null then
    -- Existing code allocator reads max(code); serialize creation to protect it too.
    perform pg_advisory_xact_lock(182701, 1);
    insert into public.products (code,created_by,name,brand,upc,type,form,categories,url,retail_cents,estimate_cost_cents,quote_cost_cents,price_checked_on,sensory,notes,default_vendor_id) values (coalesce(p.code,''),p_actor,p.name,p.brand,p.upc,p.type,p.form,p.categories,p.url,p.retail_cents,p.estimate_cost_cents,p.quote_cost_cents,p.price_checked_on,p.sensory,p.notes,p.default_vendor_id) returning id into target;
    insert into public.product_versions(product_id,version,created_by,calories,protein_g,fiber_g,carbs_g,added_sugar_g,sodium_mg,caffeine_mg,sat_fat_g,sugar_alcohols_g,unit_wt_oz,ingredients,allergens,free_from,shelf_life,pregnancy_checks,roles,nutrition_source) values(target,1,p_actor,v.calories,v.protein_g,v.fiber_g,v.carbs_g,v.added_sugar_g,v.sodium_mg,v.caffeine_mg,v.sat_fat_g,v.sugar_alcohols_g,v.unit_wt_oz,v.ingredients,v.allergens,v.free_from,v.shelf_life,v.pregnancy_checks,v.roles,v.nutrition_source);
    if p_outer_gtin is not null then
      if p.upc is not null or not public.valid_gs1(p_outer_gtin) then raise exception 'Outer barcode must be separate and valid'; end if;
      insert into public.purchase_packs(product_id,gtin,units_per_pack,barcode_status,created_by)
      values(target,p_outer_gtin,p_outer_units,'candidate',p_actor);
    end if;
    return target;
  end if;
  select * into previous from public.products where id = p_id for update;
  if not found then raise exception 'Product not found'; end if;
  if previous.updated_at is distinct from p_expected_updated_at then raise exception 'Product changed; reload before saving'; end if;
  select * into current_v from public.product_versions where product_id=p_id and is_current for update;
  changed := p_new_version or current_v.id is null or previous.upc is distinct from p.upc
    or previous.name is distinct from p.name or previous.brand is distinct from p.brand
    or previous.categories is distinct from p.categories
    or previous.type is distinct from p.type or previous.form is distinct from p.form
    or (to_jsonb(current_v) - array['id','created_at','product_id','version','is_current','effective_from','effective_to','verified_at','verified_by','created_by'])
       is distinct from (to_jsonb(v) - array['id','created_at','product_id','version','is_current','effective_from','effective_to','verified_at','verified_by','created_by']);
  update public.products set name=p.name,brand=p.brand,upc=p.upc,type=p.type,form=p.form,categories=p.categories,url=p.url,retail_cents=p.retail_cents,estimate_cost_cents=p.estimate_cost_cents,quote_cost_cents=p.quote_cost_cents,price_checked_on=p.price_checked_on,sensory=p.sensory,notes=p.notes,default_vendor_id=p.default_vendor_id, updated_at=clock_timestamp(),
    status=case when changed then 'Candidate' else status end,
    reviewed_by=case when changed then null else reviewed_by end, reviewed_at=case when changed then null else reviewed_at end,
    clinical_decision=case when changed then 'pending' else clinical_decision end,
    approval_role=case when changed then null else approval_role end,
    diligence_status=case when changed then 'candidate' else diligence_status end,
    prescreened_by=case when changed then null else prescreened_by end,
    prescreened_at=case when changed then null else prescreened_at end
  where id=p_id;
  if p_new_version or current_v.id is null then
    select coalesce(max(version),0)+1 into next_version from public.product_versions where product_id=p_id;
    update public.product_versions set is_current=false,effective_to=current_date where id=current_v.id;
    insert into public.product_versions(product_id,version,created_by,calories,protein_g,fiber_g,carbs_g,added_sugar_g,sodium_mg,caffeine_mg,sat_fat_g,sugar_alcohols_g,unit_wt_oz,ingredients,allergens,free_from,shelf_life,pregnancy_checks,roles,nutrition_source) values(p_id,next_version,p_actor,v.calories,v.protein_g,v.fiber_g,v.carbs_g,v.added_sugar_g,v.sodium_mg,v.caffeine_mg,v.sat_fat_g,v.sugar_alcohols_g,v.unit_wt_oz,v.ingredients,v.allergens,v.free_from,v.shelf_life,v.pregnancy_checks,v.roles,v.nutrition_source);
  else
    update public.product_versions set calories=v.calories,protein_g=v.protein_g,fiber_g=v.fiber_g,carbs_g=v.carbs_g,added_sugar_g=v.added_sugar_g,sodium_mg=v.sodium_mg,caffeine_mg=v.caffeine_mg,sat_fat_g=v.sat_fat_g,sugar_alcohols_g=v.sugar_alcohols_g,unit_wt_oz=v.unit_wt_oz,ingredients=v.ingredients,allergens=v.allergens,free_from=v.free_from,shelf_life=v.shelf_life,pregnancy_checks=v.pregnancy_checks,roles=v.roles,nutrition_source=v.nutrition_source,
      verified_at=case when changed then null else current_v.verified_at end,
      verified_by=case when changed then null else current_v.verified_by end
    where id=current_v.id;
  end if;
  return p_id;
end $$;
revoke all on function public.save_product(uuid,jsonb,jsonb,text,boolean,timestamptz,text,integer) from public, anon, authenticated;
grant execute on function public.save_product(uuid,jsonb,jsonb,text,boolean,timestamptz,text,integer) to service_role;

-- A package check is one transaction: identity registration, audit and formula verification.
create function public.verify_product_package(p_id uuid, p_expected_updated_at timestamptz,
  p_expected_version jsonb, p_gtin text, p_barcode_on text, p_units integer, p_actor text, p_expiry date)
returns void language plpgsql set search_path = pg_catalog, public, pg_temp as $$
declare p public.products; v public.product_versions; pack public.purchase_packs; scan jsonb; line text;
begin
  select * into p from public.products where id=p_id for update;
  select * into v from public.product_versions where product_id=p_id and is_current for update;
  if p.id is null or v.id is null then raise exception 'Product or current version missing'; end if;
  if p.updated_at is distinct from p_expected_updated_at or to_jsonb(v) is distinct from p_expected_version then
    raise exception 'Product changed during verification; reload and check the current label';
  end if;
  if not public.valid_gs1(p_gtin) then raise exception 'Invalid GS1 barcode'; end if;
  if p_expiry is null or p_expiry < (now() at time zone 'UTC')::date + 90 then raise exception 'Package needs at least 90 days of shelf life'; end if;
  select * into pack from public.purchase_packs where gtin14=lpad(p_gtin,14,'0') for update;
  scan := jsonb_build_object('source','package','gtin',p_gtin,'exact_variant',true,'checked_at',now(),'note','Package checked by ' || p_actor);
  if pack.id is not null then
    if pack.product_id <> p_id then raise exception 'Barcode belongs to another product outer pack'; end if;
    update public.purchase_packs set barcode_status='verified',barcode_sources=barcode_sources || jsonb_build_array(scan) where id=pack.id;
    line := 'verified outer pack ' || p_gtin;
  elsif p_barcode_on = 'box' then
    if p.upc is not null then raise exception 'Register the outer pack separately when a unit UPC is already on file'; end if;
    insert into public.purchase_packs(product_id,gtin,units_per_pack,barcode_status,barcode_sources,created_by)
    values(p_id,p_gtin,p_units,'verified',jsonb_build_array(scan),p_actor);
    line := 'verified outer pack ' || p_gtin;
  else
    if p.upc is null and p_barcode_on is distinct from 'unit' then raise exception 'Choose single pack or outer box'; end if;
    if p.upc is not null and lpad(p.upc,14,'0') <> lpad(p_gtin,14,'0') then raise exception 'Barcode does not match unit on file'; end if;
    if p.upc is null then update public.products set upc=p_gtin where id=p_id; end if;
    update public.products set barcode_status='verified',barcode_sources=barcode_sources || jsonb_build_array(scan),barcode_checked_at=now() where id=p_id;
    line := 'verified unit ' || p_gtin;
  end if;
  update public.products set notes=coalesce(notes || E'\n','') || 'Package verified by ' || p_actor || ': ' || line || ', label and serving match; checked package expiry ' || p_expiry::text, updated_at=clock_timestamp() where id=p_id;
  update public.product_versions set pregnancy_checks=(pregnancy_checks - 'P9') || '{"P8":"PASS"}'::jsonb where id=v.id;
  update public.product_versions set verified_at=current_date,verified_by=p_actor where id=v.id;
end $$;
revoke all on function public.verify_product_package(uuid,timestamptz,jsonb,text,text,integer,text,date) from public,anon,authenticated;
grant execute on function public.verify_product_package(uuid,timestamptz,jsonb,text,text,integer,text,date) to service_role;


-- An observed label mismatch revokes the diligence and clinical conclusion too,
-- even when the only formula fields changing are verification timestamps.
create function public.invalidate_package_check(p_id uuid, p_expected_updated_at timestamptz,
  p_expected_version jsonb, p_single_serve_failed boolean, p_actor text, p_reason text)
returns void language plpgsql set search_path = pg_catalog, public, pg_temp as $$
declare p public.products; v public.product_versions;
begin
  select * into p from public.products where id=p_id for update;
  select * into v from public.product_versions where product_id=p_id and is_current for update;
  if p.id is null or v.id is null then raise exception 'Product or current version missing'; end if;
  if p.updated_at is distinct from p_expected_updated_at or to_jsonb(v) is distinct from p_expected_version then
    raise exception 'Product changed during package check; reload and check the current label';
  end if;
  update public.product_versions set verified_at=null,verified_by=null,
    pregnancy_checks=case when p_single_serve_failed then (pregnancy_checks - 'P9') || '{"P8":"FAIL"}'::jsonb else pregnancy_checks - 'P9' end
    where id=v.id;
  update public.products set status='Candidate',diligence_status='candidate',prescreened_by=null,prescreened_at=null,
    clinical_decision='pending',approval_role=null,reviewed_by=null,reviewed_at=null,
    notes=coalesce(notes || E'\n','') || 'Package mismatch ' || current_date::text || ' by ' || p_actor || ': ' || p_reason,
    updated_at=clock_timestamp() where id=p_id;
end $$;
revoke all on function public.invalidate_package_check(uuid,timestamptz,jsonb,boolean,text,text) from public,anon,authenticated;
grant execute on function public.invalidate_package_check(uuid,timestamptz,jsonb,boolean,text,text) to service_role;

-- Package identity is verified provenance plus a valid GS1 identifier, never mere presence.
create function public.product_package_verified(p_id uuid) returns boolean
language sql stable set search_path=pg_catalog,public,pg_temp as $$
 select coalesce((select v.verified_at is not null and nullif(trim(v.verified_by),'') is not null
   and ((p.barcode_status='verified' and public.valid_gs1(p.upc)) or exists
     (select 1 from public.purchase_packs pp where pp.product_id=p.id
       and pp.barcode_status='verified' and public.valid_gs1(pp.gtin)))
   from public.products p join public.product_versions v on v.product_id=p.id and v.is_current where p.id=p_id),false)
$$;
revoke all on function public.product_package_verified(uuid) from public,anon,authenticated;
grant execute on function public.product_package_verified(uuid) to service_role;

-- Direct metadata writes (imports/backfills) must revoke the same evidence as save_product.
create function public.invalidate_product_identity() returns trigger language plpgsql
set search_path=pg_catalog,public,pg_temp as $$
begin
 if (new.upc,new.name,new.brand,new.type,new.form,new.categories) is distinct from
    (old.upc,old.name,old.brand,old.type,old.form,old.categories) then
  update public.product_versions set verified_at=null,verified_by=null where product_id=new.id and is_current;
  update public.products set status='Candidate',diligence_status='candidate',prescreened_by=null,prescreened_at=null,
    clinical_decision='pending',approval_role=null,reviewed_by=null,reviewed_at=null,updated_at=clock_timestamp() where id=new.id;
 end if;
 return new;
end $$;
revoke all on function public.invalidate_product_identity() from public,anon,authenticated;
create trigger invalidate_product_identity after update of upc,name,brand,type,form,categories on public.products
 for each row execute function public.invalidate_product_identity();

-- Formula changes erase physical label verification, including non-UI writes.
create function public.guard_formula_verification() returns trigger language plpgsql
set search_path=pg_catalog,public,pg_temp as $$
begin
 new.pregnancy_checks := coalesce(new.pregnancy_checks,'{}') - 'P9';
 if tg_op='UPDATE' and
   (to_jsonb(new)-array['verified_at','verified_by','created_at']) is distinct from
   (to_jsonb(old)-array['verified_at','verified_by','created_at']) then
  new.verified_at := null; new.verified_by := null;
 end if;
 return new;
end $$;
revoke all on function public.guard_formula_verification() from public,anon,authenticated;
create trigger guard_formula_verification before insert or update on public.product_versions
 for each row execute function public.guard_formula_verification();

create or replace function public.pack_shipment(
  p_shipment uuid,
  p_actor text,
  p_packaging_cents integer,
  p_overhead_cents integer,
  p_weight_oz numeric,
  p_est_postage_cents integer
) returns jsonb
language plpgsql set search_path=pg_catalog,public,pg_temp as $$
declare
  s public.shipments;
  need record;
  l record;
  remaining integer;
  take integer;
  snack numeric := 0;
  shortages jsonb := '[]'::jsonb;
begin
  select * into s from public.shipments where id = p_shipment for update;
  if not found then
    raise exception 'shipment not found';
  end if;
  if s.status <> 'planned' then
    raise exception 'shipment % is %, not planned', s.code, s.status;
  end if;
  if coalesce(array_length(s.planned_items, 1), 0) = 0 then
    raise exception 'shipment % has nothing planned', s.code;
  end if;

  -- Freeze approval/formula rows and lock products in a consistent order.
  perform id from public.products where id = any(s.planned_items) order by id for share;
  perform id from public.product_versions where product_id = any(s.planned_items) and is_current order by product_id for share;
  if exists (
    select 1 from unnest(s.planned_items) as ids(product_id)
    left join public.products p on p.id = ids.product_id
    left join public.product_versions v on v.product_id = p.id and v.is_current
    where p.id is null or p.status <> 'Approved' or nullif(trim(p.reviewed_by), '') is null
      or not public.product_package_verified(p.id)
  ) then raise exception 'Products must be clinician-approved and current packages verified'; end if;
  if s.preorder_id is not null then
    perform id from public.preorders where id = s.preorder_id and status = 'paid' for share;
    if not found then raise exception 'Order is no longer paid'; end if;
  end if;

  for need in
    select product_id, count(*)::int as qty
    from unnest(s.planned_items) as product_id
    group by product_id order by product_id
  loop
    remaining := need.qty;
    for l in
      select id, product_version_id, qty_remaining, unit_cost_cents
      from public.purchase_lots
      where product_id = need.product_id and qty_remaining > 0
        and expires_on >= (now() at time zone 'UTC')::date + 90
        and product_version_id = (select id from public.product_versions where product_id = need.product_id and is_current)
      order by expires_on nulls last, purchased_at, created_at, id
      for update
    loop
      exit when remaining = 0;
      take := least(remaining, l.qty_remaining);
      update public.purchase_lots set qty_remaining = qty_remaining - take where id = l.id;
      insert into public.shipment_items (shipment_id, product_id, product_version_id, lot_id, qty, unit_cost_cents)
      values (s.id, need.product_id, l.product_version_id, l.id, take, l.unit_cost_cents);
      insert into public.stock_movements (lot_id, product_id, kind, qty, unit_cost_cents, shipment_id, reason, created_by)
      values (l.id, need.product_id, 'pack', -take, l.unit_cost_cents, s.id, s.code, p_actor);
      snack := snack + take * l.unit_cost_cents;
      remaining := remaining - take;
    end loop;
    if remaining > 0 then
      shortages := shortages || jsonb_build_object(
        'product_id', need.product_id, 'needed', need.qty, 'short', remaining);
    end if;
  end loop;

  if jsonb_array_length(shortages) > 0 then
    raise exception 'SHORTAGE' using detail = shortages::text;
  end if;

  update public.shipments set
    status = 'packed',
    snack_cost_cents = snack,
    packaging_cost_cents = p_packaging_cents,
    overhead_cents = p_overhead_cents,
    packed_weight_oz = p_weight_oz,
    est_postage_cents = p_est_postage_cents,
    packed_by = p_actor,
    packed_at = now()
  where id = s.id;

  return jsonb_build_object('snack_cost_cents', snack);
end $$;


create or replace function public.clinical_shipment_gate() returns trigger language plpgsql
set search_path=pg_catalog,public,pg_temp as $$
begin
 if new.status in ('packed','shipped') then
  if coalesce(cardinality(new.planned_items),0)=0 then raise exception 'Shipment needs planned products'; end if;
  perform id from public.products where id=any(new.planned_items) order by id for share;
  perform id from public.product_versions where product_id=any(new.planned_items) and is_current order by product_id for share;
  perform id from public.purchase_packs where product_id=any(new.planned_items) order by id for share;
  if exists(select 1 from unnest(new.planned_items) ids(id) left join public.products p on p.id=ids.id
    where p.id is null or p.status <> 'Approved' or p.clinical_decision <> 'approved'
    or p.approval_role is distinct from 'clinician' or p.reviewed_by is distinct from 'Laurie Pham'
    or p.reviewed_at is null or p.diligence_status <> 'complete' or p.prescreened_by is null or p.prescreened_at is null
    or not public.product_diligence_complete(p.id)) then raise exception 'Authenticated clinical approval and diligence required'; end if;
  if exists(select 1 from unnest(new.planned_items) ids(id) where not public.product_package_verified(ids.id)) then
    raise exception 'Verified package identity and current label required'; end if;
 end if;
 return new;
end $$;
