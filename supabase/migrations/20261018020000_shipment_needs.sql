-- Per-shipment needs (owner amendment 2026-10-18). Enforced by the app at planning, every manual
-- substitution and packing (the same layer as the existing avoid answer).
--
-- also_meet: other boxes' screening every item must also pass, e.g. a Postpartum box for a
--   mother managing diabetes carries {blood_sugar}. Recorded on the shipment so the approved
--   combination travels to packing.
-- avoid_allergens: structured exclusions (FDA nine), parsed from the customer's free-text
--   answer at planning and editable by an admin. Contains and cross-contact both conflict.
-- substitution_review: swaps the planner proposed for a conflict. Packing stays blocked until
--   an admin confirms them (no silent substitutions).
alter table public.shipments
  add column also_meet text[] not null default '{}',
  add column avoid_allergens text[] not null default '{}',
  add column substitution_review jsonb,
  add column substitution_confirmed_by text,
  add column substitution_confirmed_at timestamptz;

alter table public.shipments add constraint shipments_also_meet_known
  check (also_meet <@ array['pregnancy_comfort','blood_sugar','heart','gestational_diabetes','glp1','postpartum']::text[]);
alter table public.shipments add constraint shipments_avoid_allergens_known
  check (avoid_allergens <@ array['milk','egg','fish','shellfish','tree_nuts','peanuts','wheat','soy','sesame']::text[]);

alter table public.preorders add column avoid_allergens text[] not null default '{}';
alter table public.preorders add constraint preorders_avoid_allergens_known
  check (avoid_allergens <@ array['milk','egg','fish','shellfish','tree_nuts','peanuts','wheat','soy','sesame']::text[]);
