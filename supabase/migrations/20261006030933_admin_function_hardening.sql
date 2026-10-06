-- Pin resolution for stock/admin functions, including the original ledger triggers.
alter function public.products_assign_code() set search_path = pg_catalog, public, pg_temp;
alter function public.purchase_lots_received() set search_path = pg_catalog, public, pg_temp;
alter function public.adjust_lot(uuid, integer, text, text, text) set search_path = pg_catalog, public, pg_temp;
alter function public.pack_shipment(uuid, text, integer, integer, numeric, integer) set search_path = pg_catalog, public, pg_temp;
alter function public.unpack_shipment(uuid, text) set search_path = pg_catalog, public, pg_temp;
alter function public.pack_shipment_checked(uuid, uuid[], jsonb, uuid, text, integer, integer, numeric, integer) set search_path = pg_catalog, public, pg_temp;
alter function public.activate_box_lineup(uuid) set search_path = pg_catalog, public, pg_temp;
alter function public.save_box_lineup(text, text, text, boolean, text, jsonb) set search_path = pg_catalog, public, pg_temp;
alter function public.save_package_profile(uuid, jsonb) set search_path = pg_catalog, public, pg_temp;
alter function public.set_lot_expiry(uuid, date, text, text) set search_path = pg_catalog, public, pg_temp;

-- Supabase's maintenance event trigger, when installed, is not a public RPC.
-- Revoking API-role execution does not change the owner's event-trigger execution.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
    execute 'alter function public.rls_auto_enable() set search_path = pg_catalog, public, pg_temp';
  end if;
end $$;
