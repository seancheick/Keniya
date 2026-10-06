-- Barcode identity is verified separately from the label. `upc` stays the printed barcode;
-- these fields say how sure we are that it belongs to this exact product and where that came from.
--   unverified  no barcode on file
--   candidate   one automated source only (never auto-assigned to `upc`)
--   provisional two independent sources agree, or USDA with an exact variant match
--   high        three sources agree
--   conflict    sources disagree; resolved by GS1 / manufacturer / the package
--   verified    scanned from the physical package (Verify screen or receiving)
alter table public.products add column if not exists barcode_status text not null default 'unverified'
  check (barcode_status in ('unverified', 'candidate', 'provisional', 'high', 'conflict', 'verified'));
-- [{source, gtin, exact_variant, checked_at, note}] — USDA, Open Food Facts, UPCitemdb, package…
alter table public.products add column if not exists barcode_sources jsonb not null default '[]';
alter table public.products add column if not exists barcode_checked_at timestamptz;
-- Products that already carry a UPC from a USDA label record matched on the exact pack.
update public.products set barcode_status = 'provisional'
  where upc is not null and barcode_status = 'unverified';
