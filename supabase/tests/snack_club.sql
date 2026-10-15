begin;
do $$
declare key uuid := gen_random_uuid(); n bigint;
begin
 -- The first box is an admitted order recording its subscription.
 insert into public.checkout_reservations(request_key,box_slug,fingerprint,client_hash,session_id,admission_rules,admission_settings,admission_lineup)
 values(key,'heart','test','test','cs_club','{}','{}',gen_random_uuid());
 assert public.save_paid_order(jsonb_build_object('stripe_event_id','evt_club','stripe_session_id','cs_club','stripe_payment_intent_id','pi_club','email','club@example.com','amount_total',3900,'currency','usd','box_slug','heart','kind','subscription','stripe_subscription_id','sub_1','avoid','peanuts','craving','Salty'),key), 'first box admitted';
 assert (select kind='subscription' and stripe_subscription_id='sub_1' from public.preorders where stripe_session_id='cs_club');
 -- A one-time order records the code that discounted it.
 insert into public.checkout_reservations(request_key,box_slug,fingerprint,client_hash,session_id,admission_rules,admission_settings,admission_lineup)
 values(gen_random_uuid(),'heart','t2','t2','cs_promo','{}','{}',gen_random_uuid());
 perform public.save_paid_order(jsonb_build_object('stripe_event_id','evt_promo','stripe_session_id','cs_promo','stripe_payment_intent_id','pi_promo','email','v@example.com','amount_total',4230,'currency','usd','box_slug','heart','promo_code','BLOOM10'),(select request_key from public.checkout_reservations where session_id='cs_promo'));
 assert (select promo_code='BLOOM10' and kind='one_time' from public.preorders where stripe_session_id='cs_promo'), 'promo code recorded';

 -- A paid renewal is admitted through that first order, once per invoice.
 assert public.save_renewal_order(jsonb_build_object('stripe_event_id','evt_r1','stripe_invoice_id','in_1','stripe_subscription_id','sub_1','stripe_payment_intent_id','pi_r1','email','club@example.com','amount_total',3900,'box_slug','heart')), 'renewal admitted';
 assert public.save_renewal_order(jsonb_build_object('stripe_event_id','evt_r1','stripe_invoice_id','in_1','stripe_subscription_id','sub_1','stripe_payment_intent_id','pi_r1','email','club@example.com','amount_total',3900,'box_slug','heart')), 'retried webhook is idempotent';
 assert (select count(*)=1 and bool_and(status='paid' and kind='renewal' and stripe_session_id is null) from public.preorders where stripe_invoice_id='in_1');

 assert (select avoid = 'peanuts' and craving = 'Salty' from public.preorders where stripe_invoice_id='in_1'), 'renewal must preserve checkout food restrictions and preference';

 -- Renewals never use first-shipment capacity.
 select used into n from public.commerce_capacity() where box_slug='heart';
 assert n = 2, format('capacity counts the first boxes only (club + one-time), got %s', n);

 -- A renewal with no admitted first order is durable but held.
 assert not public.save_renewal_order(jsonb_build_object('stripe_event_id','evt_r2','stripe_invoice_id','in_2','stripe_subscription_id','sub_unknown','email','x@example.com','amount_total',3900,'box_slug','heart')), 'unproven renewal held';
 assert (select status='admission_hold' from public.preorders where stripe_invoice_id='in_2');
 -- ...and a renewal for a different box than the subscription's first order is held too.
 assert not public.save_renewal_order(jsonb_build_object('stripe_event_id','evt_r3','stripe_invoice_id','in_3','stripe_subscription_id','sub_1','email','club@example.com','amount_total',3900,'box_slug','glp1'));

 begin
  insert into public.preorders(stripe_event_id,email,amount_total,kind,stripe_subscription_id) values('evt_bad','x@example.com',3900,'renewal','sub_1');
  raise exception 'renewal without invoice accepted';
 exception when check_violation then null; end;
 begin
  insert into public.preorders(stripe_event_id,stripe_session_id,email,amount_total,kind) values('evt_bad2','cs_bad','x@example.com',3900,'subscription');
  raise exception 'subscription order without subscription accepted';
 exception when check_violation then null; end;
end $$;
rollback;
