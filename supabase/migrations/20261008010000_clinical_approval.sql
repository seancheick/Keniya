-- Internal diligence and authenticated clinical decisions have separate audit trails.
alter table public.products
  add column diligence_status text not null default 'candidate' check (diligence_status in ('candidate','complete','rejected','retired')),
  add column clinical_decision text not null default 'pending' check (clinical_decision in ('pending','approved','rejected','changes_requested')),
  add column approval_role text check (approval_role is null or approval_role = 'clinician');
-- Arbitrary names from the former shared-password login are not clinician attestations.
update public.products set reviewed_by=null, reviewed_at=null, prescreened_by=null, prescreened_at=null,
  status=case when status in ('Approved','Pre-approved') then 'Candidate' else status end;

create function public.product_diligence_complete(p_id uuid) returns boolean
language sql stable set search_path=public as $$
 select coalesce((select
  nullif(trim(v.nutrition_source),'') is not null and nullif(trim(v.ingredients),'') is not null
  and nullif(trim(v.allergens),'') is not null and v.unit_wt_oz > 0
  and v.calories >= 0 and v.protein_g >= 0 and v.fiber_g >= 0 and v.carbs_g >= 0
  and v.added_sugar_g >= 0 and v.sodium_mg >= 0 and v.caffeine_mg >= 0
  and v.sat_fat_g >= 0 and v.sugar_alcohols_g >= 0
  and upper(v.pregnancy_checks->>'P8')='PASS'
  and not exists (select 1 from unnest(array['P1','P2','P3','P4','P5','P6','P7a','P7b','P8']) k
    where coalesce(upper(v.pregnancy_checks->>k),'') not in ('PASS','FAIL'))
  from public.product_versions v where v.product_id=p_id and v.is_current),false)
$$;

-- The service-only RPC takes identity exclusively from the verified signed session.
create function public.set_product_review(p_id uuid,p_status text,p_reason text,p_actor text,p_role text)
returns void language plpgsql set search_path=public as $$
declare p public.products;
begin
 select * into p from public.products where id=p_id for update;
 if not found then raise exception 'Product not found'; end if;
 perform id from public.product_versions where product_id=p_id and is_current for share;
 if p_status not in ('Candidate','Pre-approved','Approved','Rejected','Retired','Changes requested') then raise exception 'Invalid status'; end if;
 if p_status='Approved' then
  if p_role is distinct from 'clinician' or p_actor is distinct from 'Laurie Pham' then raise exception 'Only authenticated Laurie Pham can approve'; end if;
  if p.diligence_status <> 'complete' or p.prescreened_by is null or p.prescreened_at is null or not public.product_diligence_complete(p_id)
    then raise exception 'Complete Keniya diligence before clinical approval'; end if;
  update public.products set status='Approved', clinical_decision='approved', approval_role='clinician',
    reviewed_by=p_actor, reviewed_at=now(), reject_reason=null, updated_at=now() where id=p_id;
 elsif p_status='Changes requested' then
  if p_role is distinct from 'clinician' or p_actor is distinct from 'Laurie Pham' then raise exception 'Only authenticated Laurie can request clinical changes'; end if;
  if coalesce(trim(p_reason),'')='' then raise exception 'Describe the requested changes'; end if;
  update public.products set status='Candidate',clinical_decision='changes_requested',approval_role='clinician',
    reviewed_by=p_actor,reviewed_at=now(),reject_reason=p_reason,updated_at=now() where id=p_id;
 elsif p_status='Rejected' and p_role='clinician' then
  if p_actor is distinct from 'Laurie Pham' then raise exception 'Invalid clinician identity'; end if;
  if coalesce(trim(p_reason),'')='' then raise exception 'Give a rejection reason'; end if;
  update public.products set status='Rejected',clinical_decision='rejected',approval_role='clinician',
    reviewed_by=p_actor,reviewed_at=now(),reject_reason=p_reason,updated_at=now() where id=p_id;
 else
  if p_status='Pre-approved' and not public.product_diligence_complete(p_id) then
    raise exception 'Diligence requires source, ingredient/allergen labels, all nutrients, unit weight, screening decisions and single-serve confirmation'; end if;
  if p_status='Rejected' and coalesce(trim(p_reason),'')='' then raise exception 'Give a rejection reason'; end if;
  update public.products set status=p_status,
    diligence_status=case p_status when 'Pre-approved' then 'complete' when 'Rejected' then 'rejected' when 'Retired' then 'retired' else 'candidate' end,
    prescreened_by=case when p_status='Candidate' then null else p_actor end,
    prescreened_at=case when p_status='Candidate' then null else now() end,
    clinical_decision='pending',approval_role=null,reviewed_by=null,reviewed_at=null,
    reject_reason=case when p_status='Rejected' then p_reason else null end,updated_at=now() where id=p_id;
 end if;
end $$;
revoke all on function public.set_product_review(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.set_product_review(uuid,text,text,text,text) to service_role;
revoke all on function public.product_diligence_complete(uuid) from public,anon,authenticated;
grant execute on function public.product_diligence_complete(uuid) to service_role;

create function public.invalidate_formula_approval() returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='INSERT' or (to_jsonb(new)-array['verified_at','verified_by','P9','created_at']) is distinct from
  (to_jsonb(old)-array['verified_at','verified_by','P9','created_at']) then
  update public.products set status='Candidate',diligence_status='candidate',prescreened_by=null,prescreened_at=null,
    clinical_decision='pending',approval_role=null,reviewed_by=null,reviewed_at=null where id=new.product_id;
 end if;
 return new;
end $$;
create trigger invalidate_formula_approval after insert or update on public.product_versions
 for each row execute function public.invalidate_formula_approval();

-- Direct packing RPCs cannot bypass the clinical attestations, even with the old wrapper.
create function public.clinical_shipment_gate() returns trigger language plpgsql set search_path=public as $$
begin
 if new.status in ('packed','shipped') then
  perform id from public.products where id=any(new.planned_items) order by id for share;
  if exists(select 1 from unnest(new.planned_items) ids(id) left join public.products p on p.id=ids.id
    where p.id is null or p.status <> 'Approved' or p.clinical_decision <> 'approved'
    or p.approval_role is distinct from 'clinician' or p.reviewed_by is distinct from 'Laurie Pham'
    or p.reviewed_at is null or p.diligence_status <> 'complete' or p.prescreened_by is null or p.prescreened_at is null
    or not public.product_diligence_complete(p.id)) then raise exception 'Authenticated clinical approval and diligence required'; end if;
 end if;
 return new;
end $$;
create trigger clinical_shipment_gate before insert or update of status on public.shipments
 for each row execute function public.clinical_shipment_gate();

-- A rules edit removes active sale/fulfillment readiness until a lineup is checked again.
create function public.invalidate_lineups_on_rules() returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='INSERT' or new.rules is distinct from old.rules then
  -- The rules row is already update-locked; admission holds its share lock first.
  -- Avoid taking a lineup advisory lock here in the opposite order to checkout.
  update public.box_lineups set status='draft',activated_at=null where box_slug=new.box_slug and status='active';
 end if;
 return new;
end $$;
create trigger invalidate_lineups_on_rules after insert or update on public.box_rules
 for each row execute function public.invalidate_lineups_on_rules();
