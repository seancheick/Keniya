-- Trusted server actions are the only waitlist insert path.
drop policy if exists "public can join waitlist" on public.waitlist;
revoke insert on public.waitlist from anon, authenticated;

create table public.public_attempt_windows (
  key text primary key,
  started_at timestamptz not null,
  attempts integer not null check (attempts > 0)
);
alter table public.public_attempt_windows enable row level security;
revoke all on public.public_attempt_windows from anon, authenticated;
grant all on public.public_attempt_windows to service_role;

create function public.allow_public_attempt(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security invoker set search_path = pg_catalog, public, pg_temp as $$
declare hits integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or length(p_key) > 200 then raise exception 'Invalid rate limit'; end if;
  insert into public.public_attempt_windows(key, started_at, attempts)
  values (p_key, clock_timestamp(), 1)
  on conflict(key) do update set
    started_at = case when public.public_attempt_windows.started_at <= clock_timestamp() - make_interval(secs => p_window_seconds) then clock_timestamp() else public.public_attempt_windows.started_at end,
    attempts = case when public.public_attempt_windows.started_at <= clock_timestamp() - make_interval(secs => p_window_seconds) then 1 else public.public_attempt_windows.attempts + 1 end
  returning attempts into hits;
  -- Bound retention; rows hold hashes, never IPs or addresses.
  delete from public.public_attempt_windows where started_at < clock_timestamp() - interval '2 days';
  return hits <= p_limit;
end $$;
revoke all on function public.allow_public_attempt(text, integer, integer) from public, anon, authenticated;
grant execute on function public.allow_public_attempt(text, integer, integer) to service_role;

-- Refunds/disputes block shipping as well as packing, including direct RPC/table paths.
create function public.paid_shipment_gate() returns trigger language plpgsql
set search_path=pg_catalog,public,pg_temp as $$
begin
  if new.preorder_id is not null and new.status in ('packed','shipped') then
    perform id from public.preorders where id=new.preorder_id and status='paid' for share;
    if not found then raise exception 'Order is no longer paid'; end if;
  end if;
  return new;
end $$;
revoke all on function public.paid_shipment_gate() from public,anon,authenticated;
create trigger paid_shipment_gate before insert or update of status,preorder_id on public.shipments
for each row execute function public.paid_shipment_gate();
