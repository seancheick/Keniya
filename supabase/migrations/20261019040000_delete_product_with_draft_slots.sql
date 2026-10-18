-- Deleting a sample product (pnpm products:delete): its slots in draft or archived lineups
-- (proposals that never shipped) are removed and the product is deleted in ONE transaction,
-- so a refusal (purchase lots, shipments, an active lineup) leaves the slots untouched.
-- delete_product_permanently keeps its stricter rule for the admin's Delete button.
create function public.delete_product_with_draft_slots(p_id uuid) returns void
language plpgsql set search_path=pg_catalog,public,pg_temp as $$
begin
 perform id from public.products where id=p_id for update;
 if not found then return; end if;
 if exists(select 1 from public.lineup_items i join public.box_lineups l on l.id=i.lineup_id
   where i.product_id=p_id and l.status not in ('draft','archived')) then
  raise exception 'This product is in an active lineup. Replace it there first.';
 end if;
 delete from public.lineup_items i using public.box_lineups l
  where l.id=i.lineup_id and i.product_id=p_id and l.status in ('draft','archived');
 -- Same guards (lots, shipments) and cleanup receipts; an exception rolls back the slot removal.
 perform public.delete_product_permanently(p_id);
end $$;
revoke all on function public.delete_product_with_draft_slots(uuid) from public,anon,authenticated;
grant execute on function public.delete_product_with_draft_slots(uuid) to service_role;
