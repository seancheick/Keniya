-- Re-check a shipment's needs under the packing lock (review follow-up 2026-10-18).
-- The app validates allergen exclusions, other boxes' screening and substitution confirmation
-- before packing, but needs can be edited while a shipment is still planned. This wrapper locks
-- the shipment, compares the needs the app validated with what is stored now, and only then
-- runs the existing checked pack in the same transaction.
create function public.pack_shipment_needs_checked(
  p_expected_needs jsonb,
  p_shipment uuid, p_expected_items uuid[], p_expected_lots jsonb, p_expected_package uuid, p_actor text,
  p_packaging_cents integer, p_overhead_cents integer, p_weight_oz numeric, p_est_postage_cents integer
) returns jsonb language plpgsql set search_path = pg_catalog, public, pg_temp as $$
declare s public.shipments;
begin
  select * into s from public.shipments where id = p_shipment for update;
  if not found then raise exception 'Shipment not found'; end if;
  if jsonb_build_object(
       'also_meet', to_jsonb(coalesce(s.also_meet, '{}')),
       'avoid_allergens', to_jsonb(coalesce(s.avoid_allergens, '{}')),
       'substitutions_confirmed', s.substitution_review is null or s.substitution_confirmed_by is not null)
     is distinct from p_expected_needs then
    raise exception 'NEEDS_CHANGED';
  end if;
  return public.pack_shipment_checked(p_shipment, p_expected_items, p_expected_lots, p_expected_package, p_actor,
    p_packaging_cents, p_overhead_cents, p_weight_oz, p_est_postage_cents);
end $$;
revoke all on function public.pack_shipment_needs_checked(jsonb, uuid, uuid[], jsonb, uuid, text, integer, integer, numeric, integer) from public, anon, authenticated;
grant execute on function public.pack_shipment_needs_checked(jsonb, uuid, uuid[], jsonb, uuid, text, integer, integer, numeric, integer) to service_role;
