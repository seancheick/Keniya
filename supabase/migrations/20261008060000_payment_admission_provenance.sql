-- Payments from legacy/recovered sessions remain durable but cannot enter fulfillment.
alter table public.preorders add column admission_verified boolean not null default false;
alter table public.preorders add column admission_reservation_key uuid;
update public.preorders set status='admission_hold' where status='paid';
create function public.preorder_admission_guard() returns trigger
language plpgsql set search_path=pg_catalog,public,pg_temp as $$
begin
 if tg_op='UPDATE' and (new.admission_verified is distinct from old.admission_verified or new.admission_reservation_key is distinct from old.admission_reservation_key) then raise exception 'Payment admission provenance is immutable'; end if;
 if not new.admission_verified and new.status='paid' then new.status:='admission_hold'; end if;
 return new;
end $$;
revoke all on function public.preorder_admission_guard() from public,anon,authenticated;
create trigger preorder_admission_guard before insert or update on public.preorders for each row execute function public.preorder_admission_guard();
drop function public.save_paid_order(jsonb,uuid);
create function public.save_paid_order(p_order jsonb, p_key uuid) returns boolean
language plpgsql security invoker set search_path = public as $$
declare admitted boolean; persisted boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended('commerce-box:' || (p_order->>'box_slug'), 0));
 perform request_key from public.checkout_reservations where request_key=p_key for update;
 select exists(select 1 from public.checkout_reservations where request_key=p_key and box_slug=p_order->>'box_slug'
  and nullif(p_order->>'email','') is not null and not released and not invalidation_pending and admission_rules is not null and admission_settings is not null and admission_lineup is not null
  and session_id=p_order->>'stripe_session_id') into admitted;
 insert into public.preorders(stripe_event_id,stripe_session_id,stripe_payment_intent_id,email,customer_name,amount_total,currency,shipping,box_slug,avoid,craving,status,admission_verified,admission_reservation_key)
 values(p_order->>'stripe_event_id',p_order->>'stripe_session_id',p_order->>'stripe_payment_intent_id',coalesce(p_order->>'email',''),p_order->>'customer_name',(p_order->>'amount_total')::integer,p_order->>'currency',p_order->'shipping',p_order->>'box_slug',p_order->>'avoid',p_order->>'craving',case when admitted then 'paid' else 'admission_hold' end,admitted,case when admitted then p_key else null end)
 on conflict (stripe_session_id) do nothing;
 update public.preorders set stripe_payment_intent_id = p_order->>'stripe_payment_intent_id' where stripe_session_id = p_order->>'stripe_session_id' and stripe_payment_intent_id is null;
 if not exists(select 1 from public.preorders where stripe_session_id = p_order->>'stripe_session_id' and stripe_payment_intent_id is not distinct from p_order->>'stripe_payment_intent_id') then raise exception 'Order persistence conflict'; end if;
 -- Persist every paid order even if metadata is mismatched, but never consume another hold.
 update public.checkout_reservations set consumed = true, session_id = coalesce(session_id, p_order->>'stripe_session_id')
 where admitted and request_key = p_key and box_slug = p_order->>'box_slug'
 and (session_id is null or session_id = p_order->>'stripe_session_id');
 select admission_verified into persisted from public.preorders where stripe_session_id=p_order->>'stripe_session_id';
 return persisted;
end;
$$;
revoke all on function public.save_paid_order(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.save_paid_order(jsonb,uuid) to service_role;
