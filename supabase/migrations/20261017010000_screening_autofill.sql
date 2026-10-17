-- Screening autofill (owner decisions 2026-10-17, pending clinician confirmation).
--
-- 1. Caffeine: a blank label value no longer blocks diligence when the ingredient list has no
--    caffeine source. The app infers 0 (no cocoa) or a worst-case estimate from pack weight
--    (cocoa/chocolate); coffee, tea leaf, matcha, guarana… still need a label value. The
--    pattern mirrors caffeine_source in src/lib/admin/ingredients.ts.
-- 2. P3–P6 only restate data this predicate already requires (caffeine, added sugar, sodium,
--    allergen statement), so they may be left blank. A recorded value must still be PASS/FAIL.
-- P1, P2, P7a, P7b and P8 remain explicit decisions.
create or replace function public.product_diligence_complete(p_id uuid) returns boolean
language sql stable set search_path=public as $$
 select coalesce((select
  nullif(trim(v.nutrition_source),'') is not null and nullif(trim(v.ingredients),'') is not null
  and nullif(trim(v.allergens),'') is not null and v.unit_wt_oz > 0
  and v.calories >= 0 and v.protein_g >= 0 and v.fiber_g >= 0 and v.carbs_g >= 0
  and v.added_sugar_g >= 0 and v.sodium_mg >= 0
  and (v.caffeine_mg >= 0 or (v.caffeine_mg is null and v.ingredients !~* '\m(coffee|espresso|matcha|guarana|yerba[- ]mate|kola[- ]nut|camellia sinensis|caffeine|(green|black|white|oolong|pu[- ]?erh)\s+tea|tea\s+(leaf|leaves|extract|powder))\M'))
  and v.sat_fat_g >= 0 and (v.sugar_alcohols_g is null or v.sugar_alcohols_g >= 0)
  and upper(v.pregnancy_checks->>'P8')='PASS'
  and not exists (select 1 from unnest(array['P1','P2','P7a','P7b','P8']) k
    where coalesce(upper(v.pregnancy_checks->>k),'') not in ('PASS','FAIL'))
  and not exists (select 1 from unnest(array['P3','P4','P5','P6']) k
    where coalesce(upper(trim(v.pregnancy_checks->>k)),'') not in ('','PASS','FAIL'))
  from public.product_versions v where v.product_id=p_id and v.is_current),false)
$$;

-- 3. Blood Sugar / Gestational Diabetes treats: up to 5 g added sugar (core picks stay at 3 g).
--    Only rows still on "no treat allowance" change; an owner-set value is kept. A rules change
--    returns active lineups to draft (invalidate_lineups_on_rules) so they are re-checked.
update public.box_rules
   set rules = jsonb_set(rules, '{treatAddedSugarMax}', '5'::jsonb), updated_at = now(), updated_by = 'migration: screening autofill'
 where box_slug in ('blood_sugar','gestational_diabetes')
   and coalesce(rules->'treatAddedSugarMax','null'::jsonb) = 'null'::jsonb;
