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
 -- Draft/archived slots go with the product in one transaction; a refusal keeps them.
 declare dl uuid; al uuid; sp uuid;
 begin
  insert into products(name) values('Sample with draft slots') returning id into sp;
  insert into box_lineups(box_slug,version,status) values('heart',901,'draft') returning id into dl;
  insert into lineup_items(lineup_id,position,product_id) values(dl,1,sp);
  perform delete_product_with_draft_slots(sp);
  assert not exists(select 1 from products where id=sp), 'sample deleted';
  assert not exists(select 1 from lineup_items where lineup_id=dl), 'draft slot removed';
  insert into products(name) values('Sample in a shipment') returning id into sp;
  insert into lineup_items(lineup_id,position,product_id) values(dl,2,sp);
  insert into shipments(box_slug,planned_items) values('heart',array[sp]);
  begin
   perform delete_product_with_draft_slots(sp); raise exception 'expected shipment protection';
  exception when others then assert sqlerrm like 'This product is linked%'; end;
  assert exists(select 1 from lineup_items where lineup_id=dl and product_id=sp), 'refusal keeps the draft slot';
  insert into box_lineups(box_slug,version,status) values('blood_sugar',902,'active') returning id into al;
  insert into products(name) values('Sample in a live lineup') returning id into sp;
  insert into lineup_items(lineup_id,position,product_id) values(al,1,sp);
  begin
   perform delete_product_with_draft_slots(sp); raise exception 'expected active-lineup protection';
  exception when others then assert sqlerrm like 'This product is in an active lineup%'; end;
 end;
 assert not has_function_privilege('anon','delete_product_with_draft_slots(uuid)','execute');
 assert not has_function_privilege('anon','delete_product_permanently(uuid)','execute');
 assert not has_function_privilege('authenticated','delete_product_permanently(uuid)','execute');
end $$;
rollback;
