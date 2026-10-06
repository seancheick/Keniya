begin;
do $$
declare p uuid; v uuid; linked uuid; ship uuid;
begin
 insert into products(name,upc) values('Disposable delete fixture','036000291452') returning id into p;
 insert into product_versions(product_id) values(p) returning id into v;
 insert into product_photos(product_id,version_id,kind,path) values(p,v,'front','products/'||p||'/front.jpg');
 perform delete_product_permanently(p);
 assert not exists(select 1 from products where id=p);
 assert not exists(select 1 from product_versions where product_id=p);
 assert not exists(select 1 from product_photos where product_id=p);
 assert not exists(select 1 from barcode_identities where product_id=p);
 assert exists(select 1 from product_deletion_files where product_id=p),'cleanup receipt survives cascade';
 perform delete_product_permanently(p); -- cleanup retry is safe
 insert into products(name) values('Protected fixture') returning id into linked;
 insert into shipments(box_slug,planned_items) values('heart',array[linked]) returning id into ship;
 begin
  perform delete_product_permanently(linked); raise exception 'expected linked protection';
 exception when others then assert sqlerrm like 'This product is linked%'; end;
 assert exists(select 1 from products where id=linked);
 begin
  update shipments set planned_items=array[p] where id=ship; raise exception 'expected missing reference';
 exception when others then assert sqlerrm='Shipment contains a deleted or unknown product'; end;
 assert not has_function_privilege('anon','delete_product_permanently(uuid)','execute');
 assert not has_function_privilege('authenticated','delete_product_permanently(uuid)','execute');
end $$;
rollback;
