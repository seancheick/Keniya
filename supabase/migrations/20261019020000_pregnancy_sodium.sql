-- Owner decision 2026-10-18 (Screening Standard v1.0): Pregnancy and Postpartum allow at most
-- 230 mg sodium per pack, the sodium limit of FDA's 2024 "healthy" claim for an individual food
-- (Keniya policy; GDM inherits it as the strictest parent). Only a row
-- with no sodium limit changes; an owner-set value is kept. A rules change returns active
-- lineups to draft (invalidate_lineups_on_rules) so they are re-checked.
update public.box_rules
   set rules = jsonb_set(rules, '{sodiumMax}', '230'::jsonb), updated_at = now(), updated_by = 'migration: screening standard v1.0'
 where box_slug in ('pregnancy_comfort', 'postpartum')
   and (rules->'sodiumMax' is null or rules->'sodiumMax' = 'null'::jsonb);
