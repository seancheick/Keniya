-- Checkout's "Allergies or foods to avoid" answer. Condition (box_slug) decides which snacks
-- are eligible; this steers the pick among them.
alter table public.preorders add column if not exists avoid text;
