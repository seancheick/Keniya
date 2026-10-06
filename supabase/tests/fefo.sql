-- Run against a scratch DB with the migrations applied:
--   psql -d <db> -v ON_ERROR_STOP=1 -f supabase/tests/fefo.sql
-- Rolls back at the end; raises on the first failed expectation.
begin;

insert into public.products (name, status, reviewed_by, upc) values ('Test almonds', 'Approved', 'Test Clinician', '123456789012') returning id \gset p_
insert into public.product_versions (product_id, verified_at) values (:'p_id', current_date) returning id \gset v_

-- Lot A: bought Jan, expires Jun.  Lot B: bought Feb, expires May.  FEFO must use B first.
insert into public.purchase_lots (product_id, product_version_id, purchased_at, qty, total_paid_cents, qty_remaining, expires_on, created_by)
values (:'p_id', :'v_id', '2026-01-01', 24, 1199, 24, current_date + 180, 'test') returning id \gset a_
insert into public.purchase_lots (product_id, product_version_id, purchased_at, qty, total_paid_cents, qty_remaining, expires_on, created_by)
values (:'p_id', :'v_id', '2026-02-01', 3, 300, 3, current_date + 120, 'test') returning id \gset b_

do $$ begin
  assert (select code from public.products where name = 'Test almonds') = 'P001', 'auto code';
  assert (select round(unit_cost_cents, 4) from public.purchase_lots where qty = 24) = 49.9583, 'unit cost';
  assert (select count(*) from public.stock_movements where kind = 'receive') = 2, 'receive ledger';
  assert (select count(*) from public.vendor_prices where source = 'purchase') = 2, 'price seen';
end $$;

-- Plan 5 units: 3 from B (earlier expiry), 2 from A.
insert into public.shipments (box_slug, planned_items)
values ('heart', array[:'p_id',:'p_id',:'p_id',:'p_id',:'p_id']::uuid[]) returning id \gset s_
select public.pack_shipment(:'s_id', 'test', 300, 200, 30, 800);

do $$ begin
  assert (select qty_remaining from public.purchase_lots where qty = 3) = 0, 'B emptied first';
  assert (select qty_remaining from public.purchase_lots where qty = 24) = 22, 'A gave 2';
  assert (select status from public.shipments) = 'packed', 'packed';
  assert (select round(snack_cost_cents, 2) from public.shipments) = round(300 + 2 * 1199 / 24.0, 2), 'cost snapshot';
  assert (select sum(qty) from public.shipment_items) = 5, 'items';
end $$;

select public.unpack_shipment(:'s_id', 'test');
do $$ begin
  assert (select qty_remaining from public.purchase_lots where qty = 3) = 3, 'B restored';
  assert (select qty_remaining from public.purchase_lots where qty = 24) = 24, 'A restored';
  assert (select count(*) from public.shipment_items) = 0, 'items cleared';
  assert (select status from public.shipments) = 'planned', 'back to planned';
end $$;

-- Shortage: 30 units planned, 27 on hand -> whole pack aborts, nothing consumed.
update public.shipments set planned_items = array_fill(:'p_id'::uuid, array[30]);
do $$
declare d text;
begin
  begin
    perform public.pack_shipment((select id from public.shipments), 'test', 0, 0, 0, 0);
    raise exception 'expected shortage';
  exception when others then
    get stacked diagnostics d = pg_exception_detail;
    assert sqlerrm = 'SHORTAGE', 'shortage error: ' || sqlerrm;
    assert (d::jsonb -> 0 ->> 'short')::int = 3, 'short by 3';
  end;
  assert (select sum(qty_remaining) from public.purchase_lots) = 27, 'nothing consumed';
end $$;

-- Waste needs a reason and cannot go below zero.
select public.adjust_lot(:'a_id', -2, 'waste', 'Crushed bag', 'test');
do $$ begin
  assert (select qty_remaining from public.purchase_lots where qty = 24) = 22, 'waste applied';
  begin
    perform public.adjust_lot((select id from public.purchase_lots where qty = 3), -9, 'waste', 'x', 'test');
    raise exception 'expected floor';
  exception when others then
    assert sqlerrm like 'only % left%', 'floor: ' || sqlerrm;
  end;
end $$;

-- Locked down: anon cannot read admin tables or call the RPCs.
set local role anon;
do $$ begin
  assert (select count(*) from public.products) = 0, 'anon sees no products (RLS)';
  begin
    perform public.adjust_lot(gen_random_uuid(), 1, 'adjust', 'x', 'x');
    raise exception 'anon executed rpc';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

\echo 'fefo.sql: all assertions passed'
rollback;
