begin;
do $$
declare key uuid:=gen_random_uuid(); consumed_key uuid:=gen_random_uuid();
begin
 insert into public.checkout_reservations(request_key,box_slug,fingerprint,client_hash)
 values(key,'heart','fingerprint','client');
 insert into public.checkout_reservations(request_key,box_slug,fingerprint,client_hash,consumed)
 values(consumed_key,'heart','fingerprint','client',true);
 insert into public.box_rules(box_slug,rules) values('heart','{}') on conflict(box_slug) do update set rules=excluded.rules;
 assert (select invalidation_pending and not released from public.checkout_reservations where request_key=key),'direct rule write invalidates but retains capacity';
 assert not (select invalidation_pending from public.checkout_reservations where request_key=consumed_key),'paid orders are separate from holds';
 assert not public.bind_checkout_session(key,'cs_invalidated','https://checkout.stripe.com/invalid'),'in-flight create cannot bind invalidated hold';
 update public.checkout_reservations set invalidation_pending=false where request_key=key;
 update public.admin_settings set data=data where id=1;
 assert (select invalidation_pending from public.checkout_reservations where request_key=key),'direct settings write invalidates';
 assert not has_function_privilege('anon','public.bind_checkout_session(uuid,text,text)','execute');
end $$;
rollback;
