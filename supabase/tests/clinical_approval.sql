begin;
do $$
declare p uuid; v uuid; lineup uuid; ship uuid;
begin
 insert into public.products(name) values('Clinical auth regression') returning id into p;
 insert into public.product_versions(product_id) values(p) returning id into v;
 begin
  perform public.set_product_review(p,'Approved',null,'Laurie Pham','admin');
  raise exception 'Expected clinician auth failure';
 exception when others then assert sqlerrm='Only authenticated Laurie Pham can approve'; end;
 begin
  perform public.set_product_review(p,'Pre-approved',null,'Sean','admin');
  raise exception 'Expected evidence failure';
 exception when others then assert sqlerrm like 'Diligence requires%'; end;
 update public.product_versions set nutrition_source='Label',ingredients='Almonds',allergens='Tree nuts',unit_wt_oz=1,
  calories=150,protein_g=6,fiber_g=3,carbs_g=12,added_sugar_g=0,sodium_mg=0,caffeine_mg=0,sat_fat_g=1,sugar_alcohols_g=0,
  pregnancy_checks='{"P1":"PASS","P2":"PASS","P3":"PASS","P4":"PASS","P5":"PASS","P6":"PASS","P7a":"PASS","P7b":"PASS","P8":"PASS"}' where id=v;
 perform public.set_product_review(p,'Pre-approved',null,'Sean','admin');
 assert (select reviewed_by is null and clinical_decision='pending' and diligence_status='complete' from public.products where id=p);
 perform public.set_product_review(p,'Approved',null,'Laurie Pham','clinician');
 assert (select reviewed_by='Laurie Pham' and approval_role='clinician' and clinical_decision='approved' from public.products where id=p);
 -- A fully approved formula without verified package identity cannot bypass stock RPCs.
 insert into public.shipments(box_slug,planned_items) values('heart',array[p]) returning id into ship;
 begin
  update public.shipments set status='packed' where id=ship;
  raise exception 'Expected package identity failure';
 exception when others then assert sqlerrm='Verified package identity and current label required'; end;
 delete from public.shipments where id=ship;
 perform public.set_product_review(p,'Changes requested','Recheck label','Laurie Pham','clinician');
 assert (select status='Candidate' and clinical_decision='changes_requested' from public.products where id=p);
 perform public.set_product_review(p,'Approved',null,'Laurie Pham','clinician');
 -- A verification timestamp doesn't change the formula or invalidate its attestation.
 update public.product_versions set verified_at=now(),verified_by='Sean' where id=v;
 assert (select clinical_decision='approved' from public.products where id=p);
 update public.product_versions set ingredients='Almonds, coconut oil' where id=v;
 assert (select clinical_decision='pending' and reviewed_by is null and diligence_status='candidate' from public.products where id=p);
 -- A forged display name cannot pass the durable shipment gate.
 update public.products set status='Approved',reviewed_by='Laurie Pham' where id=p;
 insert into public.shipments(box_slug,planned_items) values('heart',array[p]) returning id into ship;
 begin
  update public.shipments set status='packed' where id=ship;
  raise exception 'Expected clinical packing failure';
 exception when others then assert sqlerrm='Authenticated clinical approval and diligence required'; end;
 insert into public.box_rules(box_slug,rules) values('heart','{"addedSugarMax":5}') on conflict(box_slug) do nothing;
 insert into public.box_lineups(box_slug,version,status) values('heart',900,'active') returning id into lineup;
 update public.box_rules set rules=jsonb_set(rules,'{addedSugarMax}','4'::jsonb) where box_slug='heart';
 assert (select status='draft' from public.box_lineups where id=lineup), 'rules edit disables active lineup';
 assert not has_function_privilege('anon','public.set_product_review(uuid,text,text,text,text)','execute');
 assert not has_function_privilege('authenticated','public.set_product_review(uuid,text,text,text,text)','execute');
end $$;
rollback;
