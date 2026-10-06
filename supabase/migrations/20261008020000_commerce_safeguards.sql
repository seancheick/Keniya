alter table public.preorders add column if not exists stripe_payment_intent_id text;
alter table public.preorders add column if not exists refunded_cents integer not null default 0;
alter table public.preorders add column if not exists dispute_status text;
create unique index if not exists preorders_payment_intent on public.preorders(stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create table public.checkout_reservations (
 request_key uuid primary key, box_slug text not null, fingerprint text not null,
 client_hash text not null, created_at timestamptz not null default now(),
 expires_at timestamptz not null default now() + interval '2 hours',
 session_id text unique, session_url text, released boolean not null default false, consumed boolean not null default false
);
alter table public.checkout_reservations enable row level security;
revoke all on public.checkout_reservations from anon, authenticated;
grant all on public.checkout_reservations to service_role;
create function public.commerce_capacity() returns table(box_slug text, used bigint)
language sql stable security invoker set search_path = public as $$
 select box_slug, count(*) from (
 select box_slug from public.preorders where status <> 'refunded'
 union all select box_slug from public.checkout_reservations where not consumed and not released
 ) x group by box_slug;
$$;
create function public.reserve_checkout(p_key uuid, p_slug text, p_capacity integer, p_fingerprint text, p_client text, p_expected_lineup uuid, p_expected_rules jsonb, p_price integer, p_expected_settings jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare r public.checkout_reservations; n bigint;
begin
 -- Share the lineup/rules edit lock, then freeze admission inputs through commit.
 perform pg_advisory_xact_lock(hashtext('box-lineup:' || p_slug));
 perform box_slug from public.box_rules where box_slug = p_slug for share;
 if not exists(select 1 from public.box_rules where box_slug = p_slug and rules = p_expected_rules) then raise exception 'Box rules changed'; end if;
 perform id from public.admin_settings where id = 1 for share;
 if not exists(select 1 from public.admin_settings where id = 1 and data = p_expected_settings and (data->'runSize'->>p_slug)::integer = p_capacity and (data->'prices'->>p_slug)::integer = p_price) then raise exception 'Sale settings changed'; end if;
 perform id from public.box_lineups where id = p_expected_lineup and box_slug = p_slug and status = 'active' for share;
 if not found then raise exception 'Active lineup changed'; end if;
 perform id from public.lineup_items where lineup_id = p_expected_lineup order by id for share;
 perform p.id from public.products p join public.lineup_items i on i.product_id = p.id where i.lineup_id = p_expected_lineup order by p.id for share of p;
 perform v.id from public.product_versions v join public.lineup_items i on i.product_id = v.product_id where i.lineup_id = p_expected_lineup and v.is_current order by v.id for share of v;
 if not exists(select 1 from public.lineup_items where lineup_id = p_expected_lineup) or exists (
   select 1 from public.lineup_items i left join public.products p on p.id = i.product_id
   where i.lineup_id = p_expected_lineup and (p.id is null or p.status <> 'Approved' or p.clinical_decision <> 'approved'
    or p.approval_role is distinct from 'clinician' or p.reviewed_by is distinct from 'Laurie Pham'
    or p.diligence_status <> 'complete' or not public.product_diligence_complete(p.id))
 ) then raise exception 'Clinician-approved lineup required'; end if;
 -- One capacity lock per box, plus one abuse lock per client across all boxes.
 perform pg_advisory_xact_lock(hashtextextended('commerce-client:' || p_client, 0));
 perform pg_advisory_xact_lock(hashtextextended('commerce-box:' || p_slug, 0));
 select * into r from public.checkout_reservations where request_key = p_key;
 if found then
  if r.fingerprint <> p_fingerprint or r.box_slug <> p_slug or r.expires_at <= now() or r.consumed or r.released then raise exception 'Checkout request is changed or expired'; end if;
  return to_jsonb(r);
 end if;
 select count(*) into n from public.checkout_reservations where client_hash = p_client and created_at > now() - interval '10 minutes';
 if n >= 5 then raise exception 'Too many checkout attempts'; end if;
 select used into n from public.commerce_capacity() c where c.box_slug = p_slug;
 if coalesce(n, 0) >= p_capacity or p_capacity <= 0 then raise exception 'Founding run sold out'; end if;
 insert into public.checkout_reservations(request_key, box_slug, fingerprint, client_hash) values(p_key,p_slug,p_fingerprint,p_client) returning * into r;
 return to_jsonb(r);
end;
$$;
create function public.save_paid_order(p_order jsonb, p_key uuid) returns void
language plpgsql security invoker set search_path = public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('commerce-box:' || (p_order->>'box_slug'), 0));
 insert into public.preorders(stripe_event_id,stripe_session_id,stripe_payment_intent_id,email,customer_name,amount_total,currency,shipping,box_slug,avoid,craving,status)
 values(p_order->>'stripe_event_id',p_order->>'stripe_session_id',p_order->>'stripe_payment_intent_id',p_order->>'email',p_order->>'customer_name',(p_order->>'amount_total')::integer,p_order->>'currency',p_order->'shipping',p_order->>'box_slug',p_order->>'avoid',p_order->>'craving','paid')
 on conflict (stripe_session_id) do nothing;
 update public.preorders set stripe_payment_intent_id = p_order->>'stripe_payment_intent_id' where stripe_session_id = p_order->>'stripe_session_id' and stripe_payment_intent_id is null;
 if not exists(select 1 from public.preorders where stripe_session_id = p_order->>'stripe_session_id' and stripe_payment_intent_id is not distinct from p_order->>'stripe_payment_intent_id') then raise exception 'Order persistence conflict'; end if;
 -- Persist every paid order even if metadata is mismatched, but never consume another hold.
 update public.checkout_reservations set consumed = true, session_id = coalesce(session_id, p_order->>'stripe_session_id')
 where request_key = p_key and box_slug = p_order->>'box_slug'
 and (session_id is null or session_id = p_order->>'stripe_session_id');
end;
$$;
revoke all on function public.commerce_capacity(), public.reserve_checkout(uuid,text,integer,text,text,uuid,jsonb,integer,jsonb), public.save_paid_order(jsonb,uuid) from public, anon, authenticated;
grant execute on function public.commerce_capacity(), public.reserve_checkout(uuid,text,integer,text,text,uuid,jsonb,integer,jsonb), public.save_paid_order(jsonb,uuid) to service_role;
