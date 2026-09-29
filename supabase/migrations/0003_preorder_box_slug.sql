-- Production already has this column (added by hand); this keeps fresh setups in sync.
alter table public.preorders add column if not exists box_slug text;
