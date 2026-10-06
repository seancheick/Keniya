-- The thing we buy and the thing we put in a box are not always the same barcode.
-- products.upc = the single pack's own printed barcode (often none: stick packets, minis).
-- purchase_packs = an outer box/multipack we buy, mapped to the product it contains.
-- Receiving can scan either; a pack scan logs units_per_pack × packs bought.

-- Canonical identity for matching (UPC-A 012… and EAN-13 0012… are one item). The printed
-- code stays in `upc` exactly as on the package; this is derived, never edited.
alter table public.products add column if not exists gtin14 text
  generated always as (case when upc is null then null else lpad(regexp_replace(upc, '\D', '', 'g'), 14, '0') end) stored;
create unique index if not exists products_gtin14_key on public.products (gtin14) where gtin14 is not null;

create table if not exists public.purchase_packs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- Printed outer barcode, digits only (8, 12, 13 or 14).
  gtin text not null check (gtin ~ '^([0-9]{8}|[0-9]{12,14})$'),
  gtin14 text generated always as (lpad(gtin, 14, '0')) stored,
  units_per_pack integer not null check (units_per_pack between 2 and 1000),
  description text,
  barcode_status text not null default 'candidate'
    check (barcode_status in ('candidate', 'provisional', 'high', 'conflict', 'verified')),
  barcode_sources jsonb not null default '[]',
  created_by text
);
create unique index if not exists purchase_packs_gtin14_key on public.purchase_packs (gtin14);
create index if not exists purchase_packs_product_idx on public.purchase_packs (product_id);
alter table public.purchase_packs enable row level security;

-- One barcode, one meaning: a code can't be both a single pack and an outer pack.
create or replace function public.barcode_one_meaning() returns trigger
language plpgsql set search_path = pg_catalog, public, pg_temp as $$
begin
  if tg_table_name = 'products' then
    if new.gtin14 is not null and exists (select 1 from public.purchase_packs where gtin14 = new.gtin14) then
      raise exception 'Barcode % is registered as an outer pack, not a single pack', new.upc;
    end if;
  elsif exists (select 1 from public.products where gtin14 = new.gtin14) then
    raise exception 'Barcode % is already a product''s own barcode', new.gtin;
  end if;
  return new;
end $$;
revoke all on function public.barcode_one_meaning() from public, anon, authenticated;
drop trigger if exists products_barcode_one_meaning on public.products;
create trigger products_barcode_one_meaning before insert or update of upc on public.products
  for each row execute function public.barcode_one_meaning();
drop trigger if exists purchase_packs_barcode_one_meaning on public.purchase_packs;
create trigger purchase_packs_barcode_one_meaning before insert or update of gtin on public.purchase_packs
  for each row execute function public.barcode_one_meaning();

-- Packing gate: identity is proven by the single pack's barcode OR a verified outer pack
-- (for packets with no barcode of their own). Patched in place so the rest of the function,
-- written in 20261006025542, is untouched; fails loudly if that text has changed.
do $$
declare
  d text;
  old text := 'nullif(trim(p.upc), '''') is null or v.verified_at is null';
  neu text := '(nullif(trim(p.upc), '''') is null and not exists (select 1 from public.purchase_packs pp where pp.product_id = p.id and pp.barcode_status = ''verified'')) or v.verified_at is null';
begin
  select pg_get_functiondef('public.pack_shipment(uuid,text,integer,integer,numeric,integer)'::regprocedure) into d;
  if position(neu in d) > 0 then return; end if;
  if position(old in d) = 0 then raise exception 'pack_shipment changed; update 20261007000000_purchase_packs.sql'; end if;
  execute replace(d, old, neu);
end $$;
