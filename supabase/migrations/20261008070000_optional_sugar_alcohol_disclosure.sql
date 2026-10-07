-- Sugar-alcohol grams may be undisclosed. Keep null; ingredient evidence and P7b review remain mandatory.
create or replace function public.product_diligence_complete(p_id uuid) returns boolean
language sql stable set search_path=public as $$
 select coalesce((select
  nullif(trim(v.nutrition_source),'') is not null and nullif(trim(v.ingredients),'') is not null
  and nullif(trim(v.allergens),'') is not null and v.unit_wt_oz > 0
  and v.calories >= 0 and v.protein_g >= 0 and v.fiber_g >= 0 and v.carbs_g >= 0
  and v.added_sugar_g >= 0 and v.sodium_mg >= 0 and v.caffeine_mg >= 0
  and v.sat_fat_g >= 0 and (v.sugar_alcohols_g is null or v.sugar_alcohols_g >= 0)
  and upper(v.pregnancy_checks->>'P8')='PASS'
  and not exists (select 1 from unnest(array['P1','P2','P3','P4','P5','P6','P7a','P7b','P8']) k
    where coalesce(upper(v.pregnancy_checks->>k),'') not in ('PASS','FAIL'))
  from public.product_versions v where v.product_id=p_id and v.is_current),false)
$$;

