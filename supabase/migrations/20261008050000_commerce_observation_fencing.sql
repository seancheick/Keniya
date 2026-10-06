-- A newer Stripe observation claims the order before external reads. Stale in-flight
-- readers cannot restore a paid status after a refund/dispute; failures block shipment.
alter table public.preorders add column financial_revision bigint not null default 0;
create function public.begin_financial_observation(p_payment_intent text) returns bigint
language plpgsql security invoker set search_path=pg_catalog,public,pg_temp as $$
declare revision bigint;
begin
 update public.preorders set financial_revision=financial_revision+1, status='financial_pending'
 where stripe_payment_intent_id=p_payment_intent returning financial_revision into revision;
 if not found then raise exception 'Order not persisted yet'; end if;
 return revision;
end $$;
create function public.finish_financial_observation(p_payment_intent text,p_revision bigint,p_status text,p_refunded integer,p_dispute text) returns boolean
language plpgsql security invoker set search_path=pg_catalog,public,pg_temp as $$
begin
 if p_status not in ('paid','refunded','partially_refunded','disputed') or p_refunded < 0 then raise exception 'Invalid financial state'; end if;
 update public.preorders set status=p_status,refunded_cents=greatest(refunded_cents,p_refunded),dispute_status=p_dispute
 where stripe_payment_intent_id=p_payment_intent and financial_revision=p_revision;
 return found;
end $$;
revoke all on function public.begin_financial_observation(text),public.finish_financial_observation(text,bigint,text,integer,text) from public,anon,authenticated;
grant execute on function public.begin_financial_observation(text),public.finish_financial_observation(text,bigint,text,integer,text) to service_role;

-- Keep the admission inputs so active sessions can be invalidated on admin changes.
alter table public.checkout_reservations add column admission_rules jsonb;
alter table public.checkout_reservations add column admission_settings jsonb;
alter table public.checkout_reservations add column admission_lineup uuid;
alter table public.checkout_reservations add column invalidation_pending boolean not null default false;
create or replace function public.reserve_checkout(p_key uuid, p_slug text, p_capacity integer, p_fingerprint text, p_client text, p_expected_lineup uuid, p_expected_rules jsonb, p_price integer, p_expected_settings jsonb)
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
  if r.invalidation_pending or r.admission_rules is distinct from p_expected_rules or r.admission_settings is distinct from p_expected_settings or r.admission_lineup is distinct from p_expected_lineup or r.fingerprint <> p_fingerprint or r.box_slug <> p_slug or r.expires_at <= now() or r.consumed or r.released then raise exception 'Checkout request is changed or expired'; end if;
  return to_jsonb(r);
 end if;
 select count(*) into n from public.checkout_reservations where client_hash = p_client and created_at > now() - interval '10 minutes';
 if n >= 5 then raise exception 'Too many checkout attempts'; end if;
 select used into n from public.commerce_capacity() c where c.box_slug = p_slug;
 if coalesce(n, 0) >= p_capacity or p_capacity <= 0 then raise exception 'Founding run sold out'; end if;
 insert into public.checkout_reservations(request_key, box_slug, fingerprint, client_hash, admission_rules, admission_settings, admission_lineup) values(p_key,p_slug,p_fingerprint,p_client,p_expected_rules,p_expected_settings,p_expected_lineup) returning * into r;
 return to_jsonb(r);
end;
$$;
create function public.bind_checkout_session(p_key uuid,p_session text,p_url text) returns boolean
language plpgsql security invoker set search_path=pg_catalog,public,pg_temp as $$
begin
 update public.checkout_reservations set session_id=p_session,session_url=p_url
 where request_key=p_key and not invalidation_pending and not consumed and not released
 and (session_id is null or session_id=p_session);
 return found;
end $$;
revoke all on function public.bind_checkout_session(uuid,text,text) from public,anon,authenticated;
grant execute on function public.bind_checkout_session(uuid,text,text) to service_role;
-- Direct imports/database writes mark holds too. The server reconciliation worker
-- performs Stripe expiration; pending holds remain occupied until proven unpaid.
create function public.invalidate_checkout_admission() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public,pg_temp as $$
declare slugs text[]; target_product_id uuid; target_lineup_id uuid;
begin
 if tg_table_name='admin_settings' then
  select array_agg(distinct box_slug) into slugs from public.checkout_reservations;
 elsif tg_table_name='box_rules' or tg_table_name='box_lineups' then
  slugs:=array[to_jsonb(new)->>'box_slug',to_jsonb(old)->>'box_slug'];
 elsif tg_table_name='lineup_items' then
  target_lineup_id:=coalesce((to_jsonb(new)->>'lineup_id')::uuid,(to_jsonb(old)->>'lineup_id')::uuid);
  select array_agg(box_slug) into slugs from public.box_lineups where id=target_lineup_id;
 else
  target_product_id:=case when tg_table_name='products' then coalesce((to_jsonb(new)->>'id')::uuid,(to_jsonb(old)->>'id')::uuid)
                  else coalesce((to_jsonb(new)->>'product_id')::uuid,(to_jsonb(old)->>'product_id')::uuid) end;
  select array_agg(distinct l.box_slug) into slugs from public.box_lineups l join public.lineup_items i on i.lineup_id=l.id where i.product_id=target_product_id and l.status='active';
 end if;
 update public.checkout_reservations set invalidation_pending=true
 where box_slug=any(slugs) and not released and not consumed;
 return coalesce(new,old);
end $$;
revoke all on function public.invalidate_checkout_admission() from public,anon,authenticated;
create trigger checkout_admission_rules after insert or update or delete on public.box_rules for each row execute function public.invalidate_checkout_admission();
create trigger checkout_admission_settings after insert or update or delete on public.admin_settings for each row execute function public.invalidate_checkout_admission();
create trigger checkout_admission_lineups after insert or update or delete on public.box_lineups for each row execute function public.invalidate_checkout_admission();
create trigger checkout_admission_items after insert or update or delete on public.lineup_items for each row execute function public.invalidate_checkout_admission();
create trigger checkout_admission_products after update or delete on public.products for each row execute function public.invalidate_checkout_admission();
create trigger checkout_admission_versions after insert or update or delete on public.product_versions for each row execute function public.invalidate_checkout_admission();
