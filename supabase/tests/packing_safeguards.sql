-- Scratch DB only: apply 0006, 0008, 0009 and the packing_safeguards and admin_function_hardening migrations first.
begin;
do $$
declare
  p uuid; v uuid; old_v uuid; fresh uuid; later uuid; held uuid; ship uuid;
  active_id uuid; empty_id uuid; version_count integer;
begin
  insert into public.products (name, status, reviewed_by, upc)
  values ('Packing test', 'Approved', 'Clinician', '123456789012') returning id into p;
  insert into public.product_versions (product_id, version, is_current) values (p, 1, false) returning id into old_v;
  insert into public.product_versions (product_id, version, verified_at) values (p, 2, current_date) returning id into v;
  insert into public.purchase_lots (product_id, product_version_id, qty, qty_remaining, total_paid_cents, expires_on)
  values (p, v, 1, 1, 100, (now() at time zone 'UTC')::date + 90) returning id into fresh;
  insert into public.purchase_lots (product_id, product_version_id, qty, qty_remaining, total_paid_cents, expires_on)
  values (p, v, 2, 2, 300, current_date + 180) returning id into later;
  insert into public.purchase_lots (product_id, product_version_id, qty, qty_remaining, total_paid_cents, expires_on)
  values (p, v, 10, 10, 100, current_date + 89) returning id into held;
  insert into public.purchase_lots (product_id, product_version_id, qty, qty_remaining, total_paid_cents, expires_on)
  values (p, v, 10, 10, 100, null), (p, old_v, 10, 10, 100, current_date + 180);
  insert into public.shipments (box_slug, planned_items) values ('heart', array[p,p]) returning id into ship;
  begin
    perform public.pack_shipment_checked(ship, array[p], '[]', null, 'test', 0, 0, 1, 0);
    raise exception 'expected stale-plan error';
  exception when others then
    assert sqlerrm like 'Items changed%', 'stale-plan error';
  end;
  begin
    perform public.pack_shipment_checked(ship, array[p,p], '[]', null, 'test', 0, 0, 1, 0);
    raise exception 'expected stale-lot error';
  exception when others then assert sqlerrm like 'Stock lots changed%', 'stale lot guard'; end;
  perform public.pack_shipment_checked(ship, array[p,p], jsonb_build_array(jsonb_build_object('product_id',p,'lot_id',least(fresh,later),'qty',1),jsonb_build_object('product_id',p,'lot_id',greatest(fresh,later),'qty',1)), null, 'test', 10, 20, 3, 400);
  assert (select qty_remaining from public.purchase_lots where id=fresh) = 0, 'earliest usable lot first';
  assert (select qty_remaining from public.purchase_lots where id=later) = 1, 'later lot second';
  assert (select qty_remaining from public.purchase_lots where id=held) = 10, 'short-dated lot untouched';
  assert (select snack_cost_cents from public.shipments where id=ship) = 250, 'snapshot correct costs';
  assert (select count(*) from public.shipment_items where shipment_id=ship) = 2, 'lot trace';
  update public.shipments set label_cost_cents=500, tracking='old label' where id=ship;
  perform public.unpack_shipment(ship, 'test');
  assert (select qty_remaining from public.purchase_lots where id=fresh) = 1, 'restored lot';
  assert (select tracking is null and label_cost_cents is null and packed_weight_oz is null and est_postage_cents is null from public.shipments where id=ship), 'unpack clears stale label and costs';
  update public.shipments set planned_items=array[p,p,p,p] where id=ship;
  begin
    perform public.pack_shipment(ship, 'test', 0, 0, 0, 0);
    raise exception 'expected shortage';
  exception when others then assert sqlerrm = 'SHORTAGE', 'held lots cannot fill shortage'; end;
  assert (select qty_remaining from public.purchase_lots where id=fresh)=1, 'shortage rolls back stock';
  assert (select count(*) from public.shipment_items where shipment_id=ship)=0, 'shortage rolls back items';
  update public.products set reviewed_by=null where id=p;
  begin
    perform public.pack_shipment(ship, 'test', 0, 0, 0, 0);
    raise exception 'expected approval error';
  exception when others then assert sqlerrm like 'Products must be%', 'requires named approval'; end;
  perform public.set_lot_expiry(held, current_date + 180, 'Corrected from physical package', 'test');
  assert (select expires_on from public.purchase_lots where id=held)=current_date+180, 'expiry correction';
  assert (select qty_remaining from public.purchase_lots where id=held)=10, 'expiry correction never receives stock';
  assert (select note from public.purchase_lots where id=held) like '%Corrected from physical package%', 'expiry audit note';
  begin
    perform public.set_lot_expiry(held, current_date-1, 'Bad date', 'test');
    raise exception 'expected invalid expiry';
  exception when others then assert sqlerrm='Expiry cannot be before the purchase date'; end;
  active_id := public.save_box_lineup('heart', 'manual', null, true, 'test', jsonb_build_array(jsonb_build_object('product_id',p,'category',null,'is_extra',false)));
  insert into public.box_lineups (box_slug, version, status) values ('heart', 2, 'draft') returning id into empty_id;
  begin
    perform public.activate_box_lineup(empty_id);
    raise exception 'expected empty-lineup error';
  exception when others then assert sqlerrm='Cannot activate an empty lineup'; end;
  assert (select status from public.box_lineups where id=active_id)='active', 'failed activation preserves active lineup';
  select count(*) into version_count from public.box_lineups where box_slug='heart';
  begin
    perform public.save_box_lineup('heart','manual',null,true,'test',jsonb_build_array(jsonb_build_object('product_id',gen_random_uuid(),'is_extra',false)));
    raise exception 'expected foreign-key error';
  exception when foreign_key_violation then null; end;
  assert (select count(*) from public.box_lineups where box_slug='heart')=version_count, 'failed save rolls back version';
  begin
    perform public.save_package_profile(null, jsonb_build_object('name','12×9×4 mailer','length_in',12,'width_in',9,'height_in',4,'empty_weight_oz',0,'cost_cents',0,'is_default',true));
    raise exception 'expected duplicate package';
  exception when unique_violation then null; end;
  assert (select is_default from public.package_profiles where name='12×9×4 mailer'), 'failed package save preserves default';
  assert not has_function_privilege('anon','public.save_package_profile(uuid,jsonb)','execute'), 'anon cannot change packages';
  assert not has_function_privilege('anon' ,'public.pack_shipment_checked(uuid,uuid[],jsonb,uuid,text,integer,integer,numeric,integer)','execute'), 'anon cannot pack';
  assert not has_function_privilege('authenticated','public.save_box_lineup(text,text,text,boolean,text,jsonb)','execute'), 'authenticated cannot save lineup';
  assert not exists (select 1 from pg_proc f join pg_namespace n on n.oid=f.pronamespace
    where n.nspname='public' and f.proname in ('adjust_lot','pack_shipment','unpack_shipment','pack_shipment_checked','activate_box_lineup','save_box_lineup','save_package_profile','set_lot_expiry')
    and (has_function_privilege('anon',f.oid,'execute') or has_function_privilege('authenticated',f.oid,'execute'))), 'all stock RPCs restricted';
  assert (select count(*) from pg_proc f join pg_namespace n on n.oid=f.pronamespace
    where n.nspname='public' and f.proconfig @> array['search_path=pg_catalog, public, pg_temp']) >= 10, 'function paths pinned';
end $$;
rollback;
