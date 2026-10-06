begin;
do $$
declare p uuid; v uuid; pre uuid; ship uuid;
begin
 assert public.allow_public_attempt('test-limit',2,600);
 assert public.allow_public_attempt('test-limit',2,600);
 assert not public.allow_public_attempt('test-limit',2,600);
 update public.public_attempt_windows set started_at=now()-interval '11 minutes' where key='test-limit';
 assert public.allow_public_attempt('test-limit',2,600),'elapsed window resets';
 assert not has_function_privilege('anon','public.allow_public_attempt(text,integer,integer)','execute');
 assert not has_table_privilege('anon','public.waitlist','insert');
 assert not exists(select 1 from pg_policies where tablename='waitlist' and cmd='INSERT'),'anon cannot bypass action';
 insert into public.products(name,upc,barcode_status) values('Refund shipment fixture','036000291452','verified') returning id into p;
 insert into public.product_versions(product_id,calories,protein_g,fiber_g,carbs_g,added_sugar_g,sodium_mg,caffeine_mg,sat_fat_g,sugar_alcohols_g,unit_wt_oz,ingredients,allergens,nutrition_source,pregnancy_checks,verified_at)
 values(p,100,5,3,10,0,0,0,0,0,1,'Almonds','Tree nuts','Label','{"P1":"PASS","P2":"PASS","P3":"PASS","P4":"PASS","P5":"PASS","P6":"PASS","P7a":"PASS","P7b":"PASS","P8":"PASS"}',current_date) returning id into v;
 update public.product_versions set verified_by='Sean' where id=v;
 perform public.set_product_review(p,'Pre-approved',null,'Sean','admin');
 perform public.set_product_review(p,'Approved',null,'Laurie Pham','clinician');
 insert into public.purchase_lots(product_id,product_version_id,qty,qty_remaining,total_paid_cents,expires_on)
 values(p,v,1,1,100,current_date+180);
 insert into public.preorders(stripe_event_id,stripe_session_id,email,amount_total,status,box_slug,admission_verified)
 values('evt_refund_fixture','cs_refund_fixture','test@example.com',4700,'paid','heart',true) returning id into pre;
 insert into public.shipments(box_slug,planned_items,preorder_id) values('heart',array[p],pre) returning id into ship;
 update public.preorders set status='partially_refunded' where id=pre;
 begin
  perform public.pack_shipment(ship,'test',0,0,1,0);
  raise exception 'Refunded order packed';
 exception when others then assert sqlerrm='Order is no longer paid'; end;
 update public.preorders set status='paid' where id=pre;
 perform public.pack_shipment(ship,'test',0,0,1,0);
 update public.preorders set status='refunded' where id=pre;
 begin
  update public.shipments set status='shipped' where id=ship;
  raise exception 'Refunded packed order shipped';
 exception when others then assert sqlerrm='Order is no longer paid'; end;
end $$;
rollback;
