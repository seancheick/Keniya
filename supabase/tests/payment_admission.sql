begin;
do $$
declare key uuid:=gen_random_uuid(); revision bigint;
begin
 assert not public.save_paid_order(jsonb_build_object('stripe_event_id','evt_legacy','stripe_session_id','cs_legacy','stripe_payment_intent_id','pi_legacy','email','test@example.com','amount_total',4700,'currency','usd','box_slug','heart'),null);
 assert (select status='admission_hold' and not admission_verified from public.preorders where stripe_session_id='cs_legacy'),'legacy payment durable but quarantined';
 revision:=public.begin_financial_observation('pi_legacy');
 assert public.finish_financial_observation('pi_legacy',revision,'paid',0,null);
 assert (select status='admission_hold' from public.preorders where stripe_session_id='cs_legacy'),'financial sync cannot restore admission';
 begin
  update public.preorders set admission_verified=true where stripe_session_id='cs_legacy';
  raise exception 'immutable provenance changed';
 exception when others then assert sqlerrm='Payment admission provenance is immutable'; end;
 insert into public.checkout_reservations(request_key,box_slug,fingerprint,client_hash,session_id,admission_rules,admission_settings,admission_lineup)
 values(key,'heart','test','test','cs_original','{}','{}',gen_random_uuid());
 assert not public.save_paid_order(jsonb_build_object('stripe_event_id','evt_recovered','stripe_session_id','cs_recovered','stripe_payment_intent_id','pi_recovered','email','test@example.com','amount_total',4700,'currency','usd','box_slug','heart'),key),'recovery cannot consume original admission';
 assert not (select consumed from public.checkout_reservations where request_key=key);
 update public.checkout_reservations set invalidation_pending=true where request_key=key;
 assert not public.save_paid_order(jsonb_build_object('stripe_event_id','evt_invalidated','stripe_session_id','cs_original','stripe_payment_intent_id','pi_invalidated','email','test@example.com','amount_total',4700,'currency','usd','box_slug','heart'),key),'invalidated admission quarantined';
end $$;
rollback;
