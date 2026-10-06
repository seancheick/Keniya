-- Current-formula, 90-day FEFO stock; atomic shipment checks and lineup saves.
alter table public.shipments add column if not exists avoid text;
create or replace function public.pack_shipment(
  p_shipment uuid,
  p_actor text,
  p_packaging_cents integer,
  p_overhead_cents integer,
  p_weight_oz numeric,
  p_est_postage_cents integer
) returns jsonb
language plpgsql as $$
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
      or nullif(trim(p.upc), '') is null or v.verified_at is null
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

-- Undo a pack (before it ships): every unit goes back to the lot it came from.
create or replace function public.unpack_shipment(p_shipment uuid, p_actor text) returns void
language plpgsql as $$
declare
  s public.shipments;
  i record;
begin
  select * into s from public.shipments where id = p_shipment for update;
  if not found then
    raise exception 'shipment not found';
  end if;
  if s.status <> 'packed' then
    raise exception 'only a packed shipment can be unpacked (this one is %)', s.status;
  end if;
  for i in select * from public.shipment_items where shipment_id = s.id loop
    update public.purchase_lots set qty_remaining = qty_remaining + i.qty where id = i.lot_id;
    insert into public.stock_movements (lot_id, product_id, kind, qty, unit_cost_cents, shipment_id, reason, created_by)
    values (i.lot_id, i.product_id, 'unpack', i.qty, i.unit_cost_cents, s.id, s.code, p_actor);
  end loop;
  delete from public.shipment_items where shipment_id = s.id;
  update public.shipments set
    status = 'planned', snack_cost_cents = null, packaging_cost_cents = null,
    overhead_cents = null, packed_by = null, packed_at = null,
    packed_weight_oz = null, est_postage_cents = null,
    label_cost_cents = null, tracking = null, shipped_at = null
  where id = s.id;
end $$;


-- Lock the plan before comparing with the admin's checked pick list. Old tabs cannot
-- consume a different set of products, even if a concurrent swap wins the race.
create or replace function public.pack_shipment_checked(
  p_shipment uuid, p_expected_items uuid[], p_expected_lots jsonb, p_expected_package uuid, p_actor text,
  p_packaging_cents integer, p_overhead_cents integer, p_weight_oz numeric,
  p_est_postage_cents integer
) returns jsonb language plpgsql as $$
declare s public.shipments; actual_lots jsonb;
begin
  select * into s from public.shipments where id = p_shipment for update;
  if not found then raise exception 'Shipment not found'; end if;
  if s.planned_items is distinct from p_expected_items then
    raise exception 'Items changed. Refresh and check the new pick list before packing.';
  end if;
  if s.package_profile_id is distinct from p_expected_package then raise exception 'Package changed. Refresh before packing.'; end if;
  perform id from public.products where id = any(s.planned_items) order by id for share;
  perform id from public.product_versions where product_id = any(s.planned_items) and is_current order by product_id for share;
  perform l.id from public.purchase_lots l
  join public.product_versions v on v.id = l.product_version_id and v.is_current
  where l.product_id = any(s.planned_items) and l.qty_remaining > 0
    and l.expires_on >= (now() at time zone 'UTC')::date + 90
  order by l.product_id, l.expires_on, l.purchased_at, l.created_at, l.id for update of l;
  with needs as (
    select product_id, count(*)::integer as qty from unnest(s.planned_items) as ids(product_id) group by product_id
  ), available as (
    select l.id, l.product_id, l.qty_remaining, needs.qty,
      coalesce(sum(l.qty_remaining) over (partition by l.product_id order by l.expires_on, l.purchased_at, l.created_at, l.id rows between unbounded preceding and 1 preceding), 0) as prior_qty
    from public.purchase_lots l join needs on needs.product_id = l.product_id
    join public.product_versions v on v.id = l.product_version_id and v.is_current
    where l.qty_remaining > 0 and l.expires_on >= (now() at time zone 'UTC')::date + 90
  ), pulls as (
    select id, product_id, least(qty_remaining, qty - prior_qty)::integer as take from available where prior_qty < qty
  )
  select coalesce(jsonb_agg(jsonb_build_object('product_id',product_id,'lot_id',id,'qty',take) order by id), '[]'::jsonb)
  into actual_lots from pulls;
  if actual_lots is distinct from p_expected_lots then raise exception 'Stock lots changed. Refresh and check the new lots before packing.'; end if;
  return public.pack_shipment(p_shipment, p_actor, p_packaging_cents, p_overhead_cents, p_weight_oz, p_est_postage_cents);
end $$;

-- Archive + activate must be one transaction: a failed activation keeps the old lineup.
create or replace function public.activate_box_lineup(p_id uuid) returns void language plpgsql as $$
declare target public.box_lineups;
begin
  select * into target from public.box_lineups where id = p_id;
  if not found then raise exception 'Lineup not found'; end if;
  perform pg_advisory_xact_lock(hashtext('box-lineup:' || target.box_slug));
  if not exists (select 1 from public.lineup_items where lineup_id = p_id and not is_extra) then
    raise exception 'Cannot activate an empty lineup';
  end if;
  update public.box_lineups set status = 'archived' where box_slug = target.box_slug and status = 'active' and id <> p_id;
  update public.box_lineups set status = 'active', activated_at = now() where id = p_id;
end $$;

-- Version allocation, items and activation are also atomic under the same box lock.
create or replace function public.save_box_lineup(
  p_slug text, p_objective text, p_notes text, p_activate boolean, p_actor text, p_items jsonb
) returns uuid language plpgsql as $$
declare new_id uuid; next_version integer;
begin
  perform pg_advisory_xact_lock(hashtext('box-lineup:' || p_slug));
  select coalesce(max(version), 0) + 1 into next_version from public.box_lineups where box_slug = p_slug;
  insert into public.box_lineups (box_slug, version, status, objective, notes, created_by)
  values (p_slug, next_version, 'draft', p_objective, p_notes, p_actor) returning id into new_id;
  insert into public.lineup_items (lineup_id, position, product_id, category, is_extra)
  select new_id, ord::integer, (item->>'product_id')::uuid, item->>'category', coalesce((item->>'is_extra')::boolean, false)
  from jsonb_array_elements(p_items) with ordinality as rows(item, ord);
  if p_activate then perform public.activate_box_lineup(new_id); end if;
  return new_id;
end $$;

revoke all on function public.pack_shipment_checked(uuid, uuid[], jsonb, uuid, text, integer, integer, numeric, integer) from public, anon, authenticated;
revoke all on function public.activate_box_lineup(uuid) from public, anon, authenticated;
revoke all on function public.save_box_lineup(text, text, text, boolean, text, jsonb) from public, anon, authenticated;
grant execute on function public.pack_shipment_checked(uuid, uuid[], jsonb, uuid, text, integer, integer, numeric, integer) to service_role;
grant execute on function public.activate_box_lineup(uuid) to service_role;
grant execute on function public.save_box_lineup(text, text, text, boolean, text, jsonb) to service_role;

-- A failed package edit must not unset the existing default mailer.
create or replace function public.save_package_profile(p_id uuid, p_profile jsonb) returns uuid
language plpgsql as $$
declare saved_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('package-profiles'));
  if p_id is not null and not exists (select 1 from public.package_profiles where id=p_id) then
    raise exception 'Package not found';
  end if;
  if (p_profile->>'is_default')::boolean then
    update public.package_profiles set is_default=false where is_default;
  end if;
  if p_id is null then
    insert into public.package_profiles (name, length_in, width_in, height_in, empty_weight_oz, cost_cents, is_default)
    values (p_profile->>'name', (p_profile->>'length_in')::numeric, (p_profile->>'width_in')::numeric, (p_profile->>'height_in')::numeric,
      (p_profile->>'empty_weight_oz')::numeric, (p_profile->>'cost_cents')::integer, (p_profile->>'is_default')::boolean)
    returning id into saved_id;
  else
    update public.package_profiles set name=p_profile->>'name', length_in=(p_profile->>'length_in')::numeric,
      width_in=(p_profile->>'width_in')::numeric, height_in=(p_profile->>'height_in')::numeric,
      empty_weight_oz=(p_profile->>'empty_weight_oz')::numeric, cost_cents=(p_profile->>'cost_cents')::integer,
      is_default=(p_profile->>'is_default')::boolean where id=p_id returning id into saved_id;
  end if;
  return saved_id;
end $$;
revoke all on function public.save_package_profile(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_package_profile(uuid, jsonb) to service_role;

create or replace function public.set_lot_expiry(p_lot uuid, p_expires_on date, p_reason text, p_actor text) returns void
language plpgsql as $$
declare l public.purchase_lots;
begin
  select * into l from public.purchase_lots where id=p_lot for update;
  if not found then raise exception 'Lot not found'; end if;
  if p_expires_on is null or p_expires_on < l.purchased_at then raise exception 'Expiry cannot be before the purchase date'; end if;
  if coalesce(trim(p_reason),'')='' then raise exception 'Give a reason for the expiry correction'; end if;
  update public.purchase_lots set expires_on=p_expires_on,
    note=concat_ws(E'\n',nullif(note,''),format('Expiry corrected %s by %s: %s → %s. %s',now(),p_actor,coalesce(l.expires_on::text,'unknown'),p_expires_on,p_reason))
  where id=p_lot;
end $$;
revoke all on function public.set_lot_expiry(uuid, date, text, text) from public, anon, authenticated;
grant execute on function public.set_lot_expiry(uuid, date, text, text) to service_role;
