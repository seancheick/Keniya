begin;
do $$
declare first_revision bigint; next_revision bigint;
begin
 insert into public.preorders(stripe_event_id,stripe_session_id,stripe_payment_intent_id,email,amount_total,status,box_slug,admission_verified)
 values('evt_observation','cs_observation','pi_observation','test@example.com',4700,'paid','heart',true);
 first_revision:=public.begin_financial_observation('pi_observation');
 next_revision:=public.begin_financial_observation('pi_observation');
 assert (select status='financial_pending' from public.preorders where stripe_payment_intent_id='pi_observation'),'unconfirmed observations block packing';
 assert public.finish_financial_observation('pi_observation',next_revision,'refunded',4700,null);
 assert not public.finish_financial_observation('pi_observation',first_revision,'paid',0,null),'stale in-flight read rejected';
 assert (select status='refunded' and refunded_cents=4700 from public.preorders where stripe_payment_intent_id='pi_observation');
 first_revision:=public.begin_financial_observation('pi_observation');
 next_revision:=public.begin_financial_observation('pi_observation');
 assert public.finish_financial_observation('pi_observation',next_revision,'disputed',4700,'needs_response');
 assert not public.finish_financial_observation('pi_observation',first_revision,'paid',0,null),'stale dispute read rejected';
 assert (select status='disputed' from public.preorders where stripe_payment_intent_id='pi_observation');
 assert not has_function_privilege('anon','public.begin_financial_observation(text)','execute');
 assert not has_function_privilege('authenticated','public.finish_financial_observation(text,bigint,text,integer,text)','execute');
end $$;
rollback;
