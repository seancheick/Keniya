-- Checkout's "Sweet or salty?" answer (label). Like `avoid`, it steers the pick among the
-- snacks the box's screening allows; it never changes eligibility.
alter table public.preorders add column if not exists craving text;
