-- Clinician review 2026-10-18: the Blood Sugar box must read protein/fiber-forward, so at least
-- 8 of 14 picks qualify as protein- or fiber-forward (was 5). Only a row still on the old
-- default changes; an owner-set value is kept. A rules change returns active lineups to draft
-- (invalidate_lineups_on_rules) so they are re-checked.
update public.box_rules
   set rules = jsonb_set(rules, '{proteinOrFiberMin}', '8'::jsonb), updated_at = now(), updated_by = 'migration: clinician review'
 where box_slug = 'blood_sugar'
   and rules->'proteinOrFiberMin' = '5'::jsonb;
