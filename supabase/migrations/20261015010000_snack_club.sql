-- Monthly Snack Club. A subscription's first box is an ordinary admitted order (it ships with,
-- and counts against, the first shipment). Each paid renewal becomes its own order, admitted
-- only through that first order, and never counts against first-shipment capacity.

create table public.subscriptions (
  stripe_subscription_id text primary key,
  stripe_customer_id text not null,
  email text not null,
  box_slug text not null,
  -- Stripe's subscription status (active, past_due, canceled, ...), mirrored by the webhook.
  status text not null,
  -- pause_collection is set: a skipped month (resumes_at) or an open-ended pause.
  paused boolean not null default false,
  resumes_at timestamptz,
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  price_cents integer not null check (price_cents >= 0),
  -- Ship-to for renewals; the subscriber can change it from their manage link.
  shipping jsonb,
  -- Optional one-tap answer when they cancel (what to fix), never required to cancel.
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_email on public.subscriptions (lower(email));
alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;

alter table public.preorders add column kind text not null default 'one_time'
  check (kind in ('one_time', 'subscription', 'renewal'));
alter table public.preorders add column stripe_subscription_id text;
alter table public.preorders add column stripe_invoice_id text;
-- Which code (a vendor promo code, or the welcome offer) discounted the order, for vendor reporting.
alter table public.preorders add column promo_code text;
create unique index preorders_invoice on public.preorders (stripe_invoice_id) where stripe_invoice_id is not null;
-- Renewals have no checkout session; they are identified by their invoice instead.
alter table public.preorders alter column stripe_session_id drop not null;
alter table public.preorders add constraint preorders_source check (
  (kind = 'renewal' and stripe_invoice_id is not null and stripe_subscription_id is not null and stripe_session_id is null)
  or (kind <> 'renewal' and stripe_session_id is not null)
);
alter table public.preorders add constraint preorders_subscription_link check (
  kind = 'one_time' or stripe_subscription_id is not null
);

-- First-shipment capacity: one-time boxes and each subscription's first box, never renewals.
create or replace function public.commerce_capacity() returns table(box_slug text, used bigint)
language sql stable security invoker set search_path = public as $$
 select box_slug, count(*) from (
 select box_slug from public.preorders where status <> 'refunded' and kind <> 'renewal'
 union all select box_slug from public.checkout_reservations where not consumed and not released
 ) x group by box_slug;
$$;

-- Same admission rules as before; a subscription's first order also records its subscription.
create or replace function public.save_paid_order(p_order jsonb, p_key uuid) returns boolean
language plpgsql security invoker set search_path = public as $$
declare admitted boolean; persisted boolean; order_kind text;
begin
 order_kind := case when p_order->>'kind' = 'subscription' then 'subscription' else 'one_time' end;
 perform pg_advisory_xact_lock(hashtextextended('commerce-box:' || (p_order->>'box_slug'), 0));
 perform request_key from public.checkout_reservations where request_key=p_key for update;
 select exists(select 1 from public.checkout_reservations where request_key=p_key and box_slug=p_order->>'box_slug'
  and nullif(p_order->>'email','') is not null and not released and not invalidation_pending and admission_rules is not null and admission_settings is not null and admission_lineup is not null
  and session_id=p_order->>'stripe_session_id') into admitted;
 insert into public.preorders(stripe_event_id,stripe_session_id,stripe_payment_intent_id,email,customer_name,amount_total,currency,shipping,box_slug,avoid,craving,status,admission_verified,admission_reservation_key,kind,stripe_subscription_id,promo_code)
 values(p_order->>'stripe_event_id',p_order->>'stripe_session_id',p_order->>'stripe_payment_intent_id',coalesce(p_order->>'email',''),p_order->>'customer_name',(p_order->>'amount_total')::integer,p_order->>'currency',p_order->'shipping',p_order->>'box_slug',p_order->>'avoid',p_order->>'craving',case when admitted then 'paid' else 'admission_hold' end,admitted,case when admitted then p_key else null end,order_kind,nullif(p_order->>'stripe_subscription_id',''),nullif(p_order->>'promo_code',''))
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

-- A paid renewal invoice. Idempotent per invoice; admitted only when the subscription's first
-- order was admitted, otherwise held for review like any unproven payment.
create function public.save_renewal_order(p_order jsonb) returns boolean
language plpgsql security invoker set search_path = public as $$
declare admitted boolean; persisted boolean;
begin
 if nullif(p_order->>'stripe_invoice_id','') is null or nullif(p_order->>'stripe_subscription_id','') is null then
  raise exception 'Renewal needs its invoice and subscription';
 end if;
 select exists(select 1 from public.preorders where kind = 'subscription' and admission_verified
  and stripe_subscription_id = p_order->>'stripe_subscription_id'
  and box_slug = p_order->>'box_slug') into admitted;
 insert into public.preorders(stripe_event_id,stripe_invoice_id,stripe_subscription_id,stripe_payment_intent_id,email,customer_name,amount_total,currency,shipping,box_slug,avoid,craving,status,kind,admission_verified)
 values(p_order->>'stripe_event_id',p_order->>'stripe_invoice_id',p_order->>'stripe_subscription_id',nullif(p_order->>'stripe_payment_intent_id',''),coalesce(p_order->>'email',''),p_order->>'customer_name',(p_order->>'amount_total')::integer,coalesce(p_order->>'currency','usd'),p_order->'shipping',p_order->>'box_slug',p_order->>'avoid',p_order->>'craving',case when admitted then 'paid' else 'admission_hold' end,'renewal',admitted)
 on conflict (stripe_invoice_id) where stripe_invoice_id is not null do nothing;
 select admission_verified into persisted from public.preorders where stripe_invoice_id = p_order->>'stripe_invoice_id';
 return persisted;
end;
$$;

revoke all on function public.commerce_capacity(), public.save_paid_order(jsonb,uuid), public.save_renewal_order(jsonb) from public, anon, authenticated;
grant execute on function public.commerce_capacity(), public.save_paid_order(jsonb,uuid), public.save_renewal_order(jsonb) to service_role;
grant select, insert, update on public.subscriptions to service_role;
