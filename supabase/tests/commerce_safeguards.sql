-- Scratch database / CI only. Rolls back all fixtures.
begin;
do $$
declare k uuid := gen_random_uuid(); k2 uuid := gen_random_uuid(); slug text := 'commerce_test_' || gen_random_uuid(); r jsonb; product uuid; lineup uuid; settings jsonb;
begin
 insert into public.products(name) values('Commerce fixture') returning id into product;
 insert into public.product_versions(product_id,nutrition_source,ingredients,allergens,unit_wt_oz,calories,protein_g,fiber_g,carbs_g,added_sugar_g,sodium_mg,caffeine_mg,sat_fat_g,sugar_alcohols_g,pregnancy_checks)
 values(product,'Label','Almonds','Tree nuts',1,150,6,3,12,0,0,0,1,0,'{"P1":"PASS","P2":"PASS","P3":"PASS","P4":"PASS","P5":"PASS","P6":"PASS","P7a":"PASS","P7b":"PASS","P8":"PASS"}');
 perform public.set_product_review(product,'Pre-approved',null,'Sean','admin');
 perform public.set_product_review(product,'Approved',null,'Laurie Pham','clinician');
 insert into public.box_rules(box_slug,rules) values(slug,'{}');
 insert into public.box_lineups(box_slug,version,status) values(slug,1,'active') returning id into lineup;
 insert into public.lineup_items(lineup_id,position,product_id) values(lineup,1,product);
 insert into public.admin_settings(id,data) values(1,jsonb_build_object('runSize',jsonb_build_object(slug,1),'prices',jsonb_build_object(slug,4700)))
 on conflict(id) do update set data = public.admin_settings.data || jsonb_build_object('runSize',coalesce(public.admin_settings.data->'runSize','{}') || jsonb_build_object(slug,1),'prices',coalesce(public.admin_settings.data->'prices','{}') || jsonb_build_object(slug,4700));
 select data into settings from public.admin_settings where id = 1;
 begin
  perform public.reserve_checkout(k,slug,1,'same','test-client',lineup,'{}',4900,settings);
  raise exception 'stale price admitted';
 exception when others then if sqlerrm <> 'Sale settings changed' then raise; end if; end;
 update public.admin_settings set data = data - 'runSize' where id = 1;
 begin
  perform public.reserve_checkout(k,slug,1,'same','test-client',lineup,'{}',4700,settings - 'runSize');
  raise exception 'missing capacity fell back to defaults';
 exception when others then if sqlerrm <> 'Sale settings changed' then raise; end if; end;
 update public.admin_settings set data = settings where id = 1;
 r := public.reserve_checkout(k,slug,1,'same','test-client',lineup,'{}',4700,settings);
 if (r->>'request_key')::uuid <> k then raise exception 'reservation key lost'; end if;
 if public.reserve_checkout(k,slug,1,'same','test-client',lineup,'{}',4700,settings) <> r then raise exception 'retry changed reservation'; end if;
 begin
  perform public.reserve_checkout(k2,slug,1,'different','test-client',lineup,'{}',4700,settings);
  raise exception 'oversell allowed';
 exception when others then
  if sqlerrm <> 'Founding run sold out' then raise; end if;
 end;
 begin
  perform public.reserve_checkout(k,slug,1,'changed','test-client',lineup,'{}',4700,settings);
  raise exception 'key reused with different order';
 exception when others then
  if sqlerrm <> 'Checkout request is changed or expired' then raise; end if;
 end;
 update public.checkout_reservations set expires_at = now() - interval '1 second' where request_key = k;
 begin
  perform public.reserve_checkout(k2,slug,1,'different','test-client',lineup,'{}',4700,settings);
  raise exception 'unreconciled expiry freed capacity';
 exception when others then
  if sqlerrm <> 'Founding run sold out' then raise; end if;
 end;
 update public.checkout_reservations set released = true where request_key = k;
 perform public.reserve_checkout(k2,slug,1,'different','test-client',lineup,'{}',4700,settings);
 assert public.bind_checkout_session(k2,'cs_'||k2,'https://checkout.stripe.com/fixture');
 assert public.save_paid_order(jsonb_build_object('stripe_event_id','evt_'||k2,'stripe_session_id','cs_'||k2,'stripe_payment_intent_id','pi_'||k2,'email','test@example.com','amount_total',4700,'currency','usd','box_slug',slug),k2);
 -- Wrong metadata must not consume someone else's reservation.
 update public.checkout_reservations set consumed = false where request_key = k;
 assert not public.save_paid_order(jsonb_build_object('stripe_event_id','evt_wrong_'||k,'stripe_session_id','cs_wrong_'||k,'stripe_payment_intent_id','pi_wrong_'||k,'email','test@example.com','amount_total',4700,'currency','usd','box_slug','other_box'),k);
 if (select consumed from public.checkout_reservations where request_key = k) then raise exception 'wrong box consumed hold'; end if;
 update public.checkout_reservations set session_id = 'cs_original_'||k where request_key = k;
 assert not public.save_paid_order(jsonb_build_object('stripe_event_id','evt_wrong_session_'||k,'stripe_session_id','cs_wrong_session_'||k,'stripe_payment_intent_id','pi_wrong_session_'||k,'email','test@example.com','amount_total',4700,'currency','usd','box_slug',slug),k);
 if (select consumed from public.checkout_reservations where request_key = k) then raise exception 'wrong session consumed hold'; end if;
 if not (select consumed from public.checkout_reservations where request_key = k2) then raise exception 'hold not consumed'; end if;
 delete from public.preorders where stripe_session_id = 'cs_wrong_session_'||k;
 if (select used from public.commerce_capacity() where box_slug = slug) <> 1 then raise exception 'paid order double counted'; end if;
 update public.preorders set status = 'refunded' where stripe_payment_intent_id = 'pi_'||k2;
 perform public.save_paid_order(jsonb_build_object('stripe_event_id','evt_retry_'||k2,'stripe_session_id','cs_'||k2,'stripe_payment_intent_id','pi_'||k2,'email','test@example.com','amount_total',4700,'currency','usd','box_slug',slug),k2);
 if (select status from public.preorders where stripe_payment_intent_id = 'pi_'||k2) <> 'refunded' then raise exception 'paid retry undid refund'; end if;
end $$;
rollback;
