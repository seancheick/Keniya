-- Private durable cleanup receipts survive the product cascade until Storage confirms removal.
create table public.product_deletion_files (
 product_id uuid not null, path text not null, primary key(product_id,path)
);
alter table public.product_deletion_files enable row level security;
revoke all on public.product_deletion_files from anon,authenticated;
grant all on public.product_deletion_files to service_role;
create function public.delete_product_permanently(p_id uuid) returns void
language plpgsql set search_path=pg_catalog,public,pg_temp as $$
begin
 perform id from public.products where id=p_id for update;
 if not found then return; end if;
 if exists(select 1 from public.purchase_lots where product_id=p_id)
 or exists(select 1 from public.lineup_items where product_id=p_id)
 or exists(select 1 from public.shipment_items where product_id=p_id)
 or exists(select 1 from public.shipments where p_id=any(planned_items)) then
  raise exception 'This product is linked to inventory, a box lineup, or a shipment. Remove unused lineup/planning links first; products with purchase or shipment history must be retired.';
 end if;
 insert into public.product_deletion_files(product_id,path)
 select p_id,path from public.product_photos where product_id=p_id on conflict do nothing;
 delete from public.products where id=p_id;
end $$;
revoke all on function public.delete_product_permanently(uuid) from public,anon,authenticated;
grant execute on function public.delete_product_permanently(uuid) to service_role;
-- planned_items is an array rather than a foreign key: enforce its product references too.
create function public.shipment_product_references() returns trigger
language plpgsql set search_path=pg_catalog,public,pg_temp as $$
begin
 perform id from public.products where id=any(new.planned_items) order by id for key share;
 if exists(select 1 from unnest(new.planned_items) i(id) left join public.products p on p.id=i.id where p.id is null) then
  raise exception 'Shipment contains a deleted or unknown product';
 end if;
 return new;
end $$;
create trigger shipment_product_references before insert or update of planned_items on public.shipments
for each row execute function public.shipment_product_references();
revoke all on function public.shipment_product_references() from public,anon,authenticated;
