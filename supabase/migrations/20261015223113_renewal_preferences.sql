-- Preserve checkout dietary instructions on every renewal, including webhook retries.
create or replace function public.save_renewal_order(p_order jsonb) returns boolean
language plpgsql security invoker set search_path = public as $$
declare admitted boolean; persisted boolean; first_order public.preorders%rowtype;
begin
 if nullif(p_order->>'stripe_invoice_id','') is null or nullif(p_order->>'stripe_subscription_id','') is null then
  raise exception 'Renewal needs its invoice and subscription';
 end if;
 -- The admitted first order owns dietary instructions; invoice events have no custom fields.
 select * into first_order from public.preorders where kind = 'subscription' and admission_verified
  and stripe_subscription_id = p_order->>'stripe_subscription_id'
  and box_slug = p_order->>'box_slug'
 order by created_at, id limit 1;
 admitted := found;
 insert into public.preorders(stripe_event_id,stripe_invoice_id,stripe_subscription_id,stripe_payment_intent_id,email,customer_name,amount_total,currency,shipping,box_slug,avoid,craving,status,kind,admission_verified)
 values(p_order->>'stripe_event_id',p_order->>'stripe_invoice_id',p_order->>'stripe_subscription_id',nullif(p_order->>'stripe_payment_intent_id',''),coalesce(p_order->>'email',''),p_order->>'customer_name',(p_order->>'amount_total')::integer,coalesce(p_order->>'currency','usd'),p_order->'shipping',p_order->>'box_slug',first_order.avoid,first_order.craving,case when admitted then 'paid' else 'admission_hold' end,'renewal',admitted)
 on conflict (stripe_invoice_id) where stripe_invoice_id is not null do nothing;
 select admission_verified into persisted from public.preorders where stripe_invoice_id = p_order->>'stripe_invoice_id';
 return persisted;
end;
$$;

