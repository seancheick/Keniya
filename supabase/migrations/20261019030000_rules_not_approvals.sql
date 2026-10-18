-- Keniya Screening Standard v1.0 (owner decision 2026-10-18): a clinician approves the rules
-- once, not each product. A product can be packed and sold when it is in use (not Rejected or
-- Retired), its label data is complete and its current package is verified in hand. Whether it
-- fits a box is the rules engine's answer, checked in the app at planning, every swap and packing.
-- Clinician review records (set_product_review, screening resolutions) stay; they gate nothing.
--
-- product_diligence_complete: P1, P2, P7a and P7b are derived from the ingredient screen on every
-- evaluation, so only P8 (one pack = one serving, read from the label) must be stored; a stored
-- P1–P7b value must still be PASS or FAIL.
--
-- Each function is patched in place and fails loudly if its text changed since this was written.
do $$
declare
  d text;
  o0 text := $o$unnest(array['P1','P2','P7a','P7b','P8']) k$o$;
  n0 text := $n$unnest(array['P8']) k$n$;
  o1 text := $o$unnest(array['P3','P4','P5','P6']) k$o$;
  n1 text := $n$unnest(array['P1','P2','P3','P4','P5','P6','P7a','P7b']) k$n$;
begin
  select pg_get_functiondef('public.product_diligence_complete(uuid)'::regprocedure) into d;
  if position(n0 in d) > 0 then return; end if;
  if position(o0 in d) = 0 then raise exception 'product_diligence_complete changed; update 20261019030000_rules_not_approvals.sql'; end if;
  d := replace(d, o0, n0);
  if position(o1 in d) = 0 then raise exception 'product_diligence_complete changed; update 20261019030000_rules_not_approvals.sql'; end if;
  d := replace(d, o1, n1);
  execute d;
end $$;

do $$
declare
  d text;
  o0 text := $o$    where p.id is null or p.status <> 'Approved' or p.clinical_decision <> 'approved'
    or p.approval_role is distinct from 'clinician' or p.reviewed_by is distinct from 'Laurie Pham'
    or p.reviewed_at is null or p.diligence_status <> 'complete' or p.prescreened_by is null or p.prescreened_at is null
    or not public.product_diligence_complete(p.id)) then raise exception 'Authenticated clinical approval and diligence required'; end if;$o$;
  n0 text := $n$    where p.id is null or p.status in ('Rejected','Retired') or not public.product_diligence_complete(p.id)) then raise exception 'Product must be in use with complete label data'; end if;$n$;
begin
  select pg_get_functiondef('public.clinical_shipment_gate()'::regprocedure) into d;
  if position(n0 in d) > 0 then return; end if;
  if position(o0 in d) = 0 then raise exception 'clinical_shipment_gate changed; update 20261019030000_rules_not_approvals.sql'; end if;
  d := replace(d, o0, n0);
  execute d;
end $$;

do $$
declare
  d text;
  o0 text := $o$    where p.id is null or p.status <> 'Approved' or nullif(trim(p.reviewed_by), '') is null
      or not public.product_package_verified(p.id)
  ) then raise exception 'Products must be clinician-approved and current packages verified'; end if;$o$;
  n0 text := $n$    where p.id is null or p.status in ('Rejected', 'Retired') or not public.product_diligence_complete(p.id)
      or not public.product_package_verified(p.id)
  ) then raise exception 'Products must have complete label data and verified current packages'; end if;$n$;
begin
  select pg_get_functiondef('public.pack_shipment(uuid,text,integer,integer,numeric,integer)'::regprocedure) into d;
  if position(n0 in d) > 0 then return; end if;
  if position(o0 in d) = 0 then raise exception 'pack_shipment changed; update 20261019030000_rules_not_approvals.sql'; end if;
  d := replace(d, o0, n0);
  execute d;
end $$;

do $$
declare
  d text;
  o0 text := $o$   where i.lineup_id = p_expected_lineup and (p.id is null or p.status <> 'Approved' or p.clinical_decision <> 'approved'
    or p.approval_role is distinct from 'clinician' or p.reviewed_by is distinct from 'Laurie Pham'
    or p.diligence_status <> 'complete' or not public.product_diligence_complete(p.id))
 ) then raise exception 'Clinician-approved lineup required'; end if;$o$;
  n0 text := $n$   where i.lineup_id = p_expected_lineup and (p.id is null or p.status in ('Rejected', 'Retired')
    or not public.product_diligence_complete(p.id) or not public.product_package_verified(p.id))
 ) then raise exception 'Verified lineup required'; end if;$n$;
begin
  select pg_get_functiondef('public.reserve_checkout(uuid,text,integer,text,text,uuid,jsonb,integer,jsonb)'::regprocedure) into d;
  if position(n0 in d) > 0 then return; end if;
  if position(o0 in d) = 0 then raise exception 'reserve_checkout changed; update 20261019030000_rules_not_approvals.sql'; end if;
  d := replace(d, o0, n0);
  execute d;
end $$;
