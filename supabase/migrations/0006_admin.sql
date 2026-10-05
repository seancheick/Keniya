-- Keniya Admin: products (versioned), vendors, purchase lots + stock ledger (FEFO),
-- box rules + lineups, shipments, expenses, settings.
--
-- Every table here is service-role only: RLS on, no anon/authenticated policies, and the
-- RPCs are revoked from public. The admin UI reaches them through the server.
-- Money is integer cents except lot unit costs, which keep fractional cents
-- ($11.99 / 24 = 49.9583¢) so averages and box costs stay exact.

-- ---------------------------------------------------------------- vendors
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null unique check (char_length(name) between 1 and 120),
  notes text,
  created_by text
);

-- ---------------------------------------------------------------- products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  code text not null unique,
  name text not null check (char_length(name) between 1 and 200),
  brand text,
  upc text unique,
  type text not null default 'Substantial' check (type in ('Substantial', 'Mini', 'Beverage')),
  form text not null default 'Solid'
    check (form in ('Solid', 'Powder', 'Tea', 'Spread', 'Puree', 'Liquid')),
  categories text[] not null default '{}',
  url text,
  default_vendor_id uuid references public.vendors (id) on delete set null,
  retail_cents integer check (retail_cents >= 0),
  estimate_cost_cents numeric(12, 4) check (estimate_cost_cents >= 0),
  quote_cost_cents numeric(12, 4) check (quote_cost_cents >= 0),
  price_checked_on date,
  status text not null default 'Candidate'
    check (status in ('Candidate', 'Approved', 'Rejected', 'Retired')),
  reject_reason text,
  reviewed_by text,
  reviewed_at timestamptz,
  sensory text,
  notes text,
  created_by text,
  constraint rejected_needs_reason check (status <> 'Rejected' or reject_reason is not null)
);

-- P001, P002… assigned when the app doesn't supply a code.
create or replace function public.products_assign_code() returns trigger
language plpgsql as $$
begin
  if new.code is null or new.code = '' then
    select 'P' || lpad((coalesce(max(substring(code from 2)::int), 0) + 1)::text, 3, '0')
      into new.code
      from public.products
      where code ~ '^P[0-9]+$';
  end if;
  return new;
end $$;

create trigger products_assign_code before insert on public.products
  for each row execute function public.products_assign_code();

-- One row per formula. A reformulation adds a version; history is never overwritten, so a
-- shipped box keeps the nutrition it actually had.
create table public.product_versions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id uuid not null references public.products (id) on delete cascade,
  version integer not null default 1,
  is_current boolean not null default true,
  effective_from date not null default current_date,
  effective_to date,
  calories numeric,
  protein_g numeric,
  fiber_g numeric,
  carbs_g numeric,
  added_sugar_g numeric,
  sodium_mg numeric,
  caffeine_mg numeric,
  sat_fat_g numeric,
  sugar_alcohols_g numeric,
  unit_wt_oz numeric check (unit_wt_oz >= 0),
  ingredients text,
  allergens text,
  -- {vegan, gluten_free, dairy_free, peanut_free, tree_nut_free, soy_free}: true/false
  free_from jsonb not null default '{}',
  shelf_life text,
  -- {"P1": "PASS", …, "P7c": "…"}; P7c is information only.
  pregnancy_checks jsonb not null default '{}',
  -- Judged roles: {"UF": true, "NS": true, "WG": true, "MF": true, "CT": true, "WHOLE_FOOD": true}
  roles jsonb not null default '{}',
  nutrition_source text,
  verified_at date,
  verified_by text,
  created_by text,
  unique (product_id, version)
);

create unique index product_versions_one_current
  on public.product_versions (product_id) where is_current;

create table public.product_photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id uuid not null references public.products (id) on delete cascade,
  version_id uuid references public.product_versions (id) on delete set null,
  kind text not null check (kind in ('front', 'nutrition', 'ingredients', 'barcode', 'other')),
  path text not null,
  created_by text
);

-- ---------------------------------------------------------------- sourcing
create table public.vendor_prices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id uuid not null references public.products (id) on delete cascade,
  vendor_id uuid references public.vendors (id) on delete set null,
  unit_cost_cents numeric(12, 4) not null check (unit_cost_cents >= 0),
  pack_qty integer check (pack_qty > 0),
  seen_at date not null default current_date,
  source text not null default 'sighting'
    check (source in ('purchase', 'sighting', 'quote', 'estimate')),
  lot_id uuid,
  note text,
  created_by text
);

create index vendor_prices_product on public.vendor_prices (product_id, seen_at desc);

create table public.purchase_lots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id uuid not null references public.products (id) on delete restrict,
  product_version_id uuid not null references public.product_versions (id) on delete restrict,
  vendor_id uuid references public.vendors (id) on delete set null,
  purchased_at date not null default current_date,
  qty integer not null check (qty > 0),
  total_paid_cents integer not null check (total_paid_cents >= 0),
  unit_cost_cents numeric(12, 4) generated always as (total_paid_cents::numeric / qty) stored,
  qty_remaining integer not null check (qty_remaining >= 0),
  expires_on date,
  lot_code text,
  receipt_path text,
  note text,
  created_by text,
  constraint remaining_le_qty check (qty_remaining <= qty)
);

create index purchase_lots_fefo on public.purchase_lots
  (product_id, expires_on nulls last, purchased_at, created_at) where qty_remaining > 0;

alter table public.vendor_prices
  add constraint vendor_prices_lot_fk
  foreign key (lot_id) references public.purchase_lots (id) on delete cascade;

-- Append-only ledger. Every change to a lot's qty_remaining writes one row here.
create table public.stock_movements (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  lot_id uuid not null references public.purchase_lots (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  kind text not null check (kind in ('receive', 'pack', 'unpack', 'adjust', 'waste', 'return')),
  qty integer not null check (qty <> 0),
  unit_cost_cents numeric(12, 4) not null,
  shipment_id uuid,
  reason text,
  created_by text
);

create index stock_movements_lot on public.stock_movements (lot_id, created_at);

-- A new lot is stock received and a price seen: record both in the same transaction.
create or replace function public.purchase_lots_received() returns trigger
language plpgsql as $$
begin
  insert into public.stock_movements (lot_id, product_id, kind, qty, unit_cost_cents, reason, created_by)
  values (new.id, new.product_id, 'receive', new.qty, new.unit_cost_cents, 'Purchase', new.created_by);
  insert into public.vendor_prices (product_id, vendor_id, unit_cost_cents, pack_qty, seen_at, source, lot_id, created_by)
  values (new.product_id, new.vendor_id, new.unit_cost_cents, new.qty, new.purchased_at, 'purchase', new.id, new.created_by);
  return new;
end $$;

create trigger purchase_lots_received after insert on public.purchase_lots
  for each row execute function public.purchase_lots_received();

-- Adjust / waste / return a lot by a signed delta, atomically with its ledger row.
create or replace function public.adjust_lot(
  p_lot uuid, p_delta integer, p_kind text, p_reason text, p_actor text
) returns integer
language plpgsql as $$
declare
  l public.purchase_lots;
begin
  if p_kind not in ('adjust', 'waste', 'return') then
    raise exception 'bad adjustment kind %', p_kind;
  end if;
  if p_delta = 0 then
    raise exception 'adjustment must change the quantity';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required';
  end if;
  select * into l from public.purchase_lots where id = p_lot for update;
  if not found then
    raise exception 'lot not found';
  end if;
  if l.qty_remaining + p_delta < 0 then
    raise exception 'only % left in this lot', l.qty_remaining;
  end if;
  if l.qty_remaining + p_delta > l.qty then
    raise exception 'cannot hold more than the % purchased', l.qty;
  end if;
  update public.purchase_lots set qty_remaining = qty_remaining + p_delta where id = p_lot;
  insert into public.stock_movements (lot_id, product_id, kind, qty, unit_cost_cents, reason, created_by)
  values (p_lot, l.product_id, p_kind, p_delta, l.unit_cost_cents, p_reason, p_actor);
  return l.qty_remaining + p_delta;
end $$;

-- ---------------------------------------------------------------- boxes
-- Composition rules per box (category ranges, type limits, box-specific minimums).
-- Shape is validated by the app (src/lib/admin/types.ts).
create table public.box_rules (
  box_slug text primary key,
  rules jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

create table public.box_lineups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  box_slug text not null,
  version integer not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  objective text,
  notes text,
  created_by text,
  activated_at timestamptz,
  unique (box_slug, version)
);

create unique index box_lineups_one_active on public.box_lineups (box_slug) where status = 'active';

create table public.lineup_items (
  id uuid primary key default gen_random_uuid(),
  lineup_id uuid not null references public.box_lineups (id) on delete cascade,
  position integer not null,
  product_id uuid not null references public.products (id) on delete restrict,
  category text,
  is_extra boolean not null default false
);

create index lineup_items_lineup on public.lineup_items (lineup_id, position);

-- ---------------------------------------------------------------- fulfilment
create table public.package_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null unique,
  length_in numeric not null check (length_in > 0),
  width_in numeric not null check (width_in > 0),
  height_in numeric not null check (height_in > 0),
  empty_weight_oz numeric not null default 0 check (empty_weight_oz >= 0),
  cost_cents integer not null default 0 check (cost_cents >= 0),
  is_default boolean not null default false,
  active boolean not null default true
);

create unique index package_profiles_one_default on public.package_profiles (is_default) where is_default;

insert into public.package_profiles (name, length_in, width_in, height_in, is_default)
values ('12×9×4 mailer', 12, 9, 4, true);

create sequence public.shipment_code_seq start 1;

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  code text not null unique
    default 'KEN-' || lpad(nextval('public.shipment_code_seq')::text, 6, '0'),
  kind text not null default 'order' check (kind in ('order', 'gift', 'sample', 'replacement')),
  preorder_id uuid references public.preorders (id) on delete set null,
  box_slug text not null,
  lineup_id uuid references public.box_lineups (id) on delete set null,
  package_profile_id uuid references public.package_profiles (id) on delete set null,
  status text not null default 'planned'
    check (status in ('planned', 'packed', 'shipped', 'delivered', 'issue')),
  recipient_name text,
  recipient_email text,
  ship_to jsonb,
  -- Product ids to pack (repeats allowed). Set when planned; consumed FEFO by pack_shipment.
  planned_items uuid[] not null default '{}',
  packed_weight_oz numeric,
  carrier text,
  service text,
  zone integer check (zone between 1 and 9),
  est_postage_cents integer,
  label_cost_cents integer check (label_cost_cents >= 0),
  tracking text,
  snack_cost_cents numeric(12, 4),
  packaging_cost_cents integer,
  overhead_cents integer,
  revenue_cents integer,
  stripe_fee_cents integer,
  packed_by text,
  packed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  issue text check (issue in ('damaged', 'lost', 'returned', 'other')),
  issue_note text,
  notes text,
  created_by text
);

create index shipments_status on public.shipments (status, created_at desc);
create unique index shipments_one_per_preorder on public.shipments (preorder_id)
  where preorder_id is not null and kind = 'order';

-- Exactly what each customer received: the basis for per-order profit and recalls.
create table public.shipment_items (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_version_id uuid not null references public.product_versions (id) on delete restrict,
  lot_id uuid not null references public.purchase_lots (id) on delete restrict,
  qty integer not null check (qty > 0),
  unit_cost_cents numeric(12, 4) not null
);

create index shipment_items_lot on public.shipment_items (lot_id);
create index shipment_items_shipment on public.shipment_items (shipment_id);

alter table public.stock_movements
  add constraint stock_movements_shipment_fk
  foreign key (shipment_id) references public.shipments (id) on delete set null;

-- Pack a planned shipment: consume each planned product FEFO (earliest expiry first, then
-- oldest purchase), lock the lots, record what was used, snapshot the costs. Any shortage
-- aborts the whole pack and lists every short product in the error detail (JSON).
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

  for need in
    select product_id, count(*)::int as qty
    from unnest(s.planned_items) as product_id
    group by product_id
  loop
    remaining := need.qty;
    for l in
      select id, product_version_id, qty_remaining, unit_cost_cents
      from public.purchase_lots
      where product_id = need.product_id and qty_remaining > 0
      order by expires_on nulls last, purchased_at, created_at
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
    overhead_cents = null, packed_by = null, packed_at = null
  where id = s.id;
end $$;

-- ---------------------------------------------------------------- money & settings
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  spent_on date not null default current_date,
  category text not null,
  amount_cents integer not null check (amount_cents >= 0),
  vendor_id uuid references public.vendors (id) on delete set null,
  note text,
  created_by text
);

create table public.admin_settings (
  id integer primary key default 1 check (id = 1),
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into public.admin_settings (id, data) values (1, '{}');

-- Pregnancy ingredient watchlist (feeds the P7a decision).
create table public.watchlist (
  ingredient text primary key,
  category text,
  why text,
  source text,
  reviewed_on date,
  refs text
);

-- ---------------------------------------------------------------- lock down
alter table public.vendors enable row level security;
alter table public.products enable row level security;
alter table public.product_versions enable row level security;
alter table public.product_photos enable row level security;
alter table public.vendor_prices enable row level security;
alter table public.purchase_lots enable row level security;
alter table public.stock_movements enable row level security;
alter table public.box_rules enable row level security;
alter table public.box_lineups enable row level security;
alter table public.lineup_items enable row level security;
alter table public.package_profiles enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_items enable row level security;
alter table public.expenses enable row level security;
alter table public.admin_settings enable row level security;
alter table public.watchlist enable row level security;

-- Supabase grants new functions to anon/authenticated by default; only the server may call these.
revoke all on function public.adjust_lot(uuid, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.pack_shipment(uuid, text, integer, integer, numeric, integer) from public, anon, authenticated;
revoke all on function public.unpack_shipment(uuid, text) from public, anon, authenticated;
grant execute on function public.adjust_lot(uuid, integer, text, text, text) to service_role;
grant execute on function public.pack_shipment(uuid, text, integer, integer, numeric, integer) to service_role;
grant execute on function public.unpack_shipment(uuid, text) to service_role;
