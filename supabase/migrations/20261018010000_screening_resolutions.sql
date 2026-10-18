-- Recorded decisions on ingredient findings (owner amendment 2026-10-18).
--
-- Eligibility re-screens the current ingredients every time, so a stored PASS can never outlive a
-- newly listed watchlist/no-go ingredient. A legitimate false positive (or an acceptable review
-- item such as food-level ginger) is cleared only by a row here:
--   - safety findings: authenticated clinician (Laurie Pham), the same identity rule as
--     set_product_review;
--   - brand preferences (sugar alcohols): an admin may record the exception;
--   - synthetic dyes: no exception (Keniya standard), refused here and ignored by the app.
-- A row is bound to one product version and to a hash of that version's ingredient text
-- (computed by the app), so a reformulation or an in-place ingredient edit voids it.
create table public.screening_resolutions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  product_version_id uuid not null references public.product_versions(id) on delete cascade,
  finding_key text not null,
  finding_kind text not null check (finding_kind in ('safety','brand')),
  ingredients_hash text not null,
  decision text not null check (decision in ('accept','confirm_fail')),
  reason text not null check (length(trim(reason)) > 0),
  evidence text,
  resolved_by text not null,
  resolved_role text not null check (resolved_role in ('admin','clinician')),
  resolved_at timestamptz not null default now(),
  unique (product_version_id, finding_key)
);
alter table public.screening_resolutions enable row level security;

create function public.resolve_screening_finding(
  p_version_id uuid, p_key text, p_kind text, p_hash text, p_decision text, p_reason text, p_evidence text, p_actor text, p_role text
) returns void language plpgsql set search_path=public as $$
declare v public.product_versions;
begin
 select * into v from public.product_versions where id=p_version_id for share;
 if not found or not v.is_current then raise exception 'Only the current formula version can be resolved'; end if;
 if p_key like 'synthetic_dye:%' then raise exception 'Synthetic dyes have no exception (Keniya standard)'; end if;
 if p_kind not in ('safety','brand') then raise exception 'Invalid finding kind'; end if;
 if p_kind='safety' and (p_role is distinct from 'clinician' or p_actor is distinct from 'Laurie Pham') then
  raise exception 'Only authenticated Laurie Pham can resolve a safety finding'; end if;
 if p_role not in ('admin','clinician') then raise exception 'Invalid role'; end if;
 if coalesce(trim(p_reason),'')='' then raise exception 'Give the reason and evidence for this decision'; end if;
 insert into public.screening_resolutions(product_id,product_version_id,finding_key,finding_kind,ingredients_hash,decision,reason,evidence,resolved_by,resolved_role)
 values (v.product_id,p_version_id,p_key,p_kind,p_hash,p_decision,trim(p_reason),p_evidence,p_actor,p_role)
 on conflict (product_version_id,finding_key) do update set finding_kind=excluded.finding_kind,ingredients_hash=excluded.ingredients_hash,
  decision=excluded.decision,reason=excluded.reason,evidence=excluded.evidence,resolved_by=excluded.resolved_by,
  resolved_role=excluded.resolved_role,resolved_at=now();
end $$;
revoke all on function public.resolve_screening_finding(uuid,text,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.resolve_screening_finding(uuid,text,text,text,text,text,text,text,text) to service_role;

-- A decision changes eligibility, so open checkout holds for affected boxes are re-checked.
create trigger checkout_admission_resolutions after insert or update or delete on public.screening_resolutions
 for each row execute function public.invalidate_checkout_admission();
