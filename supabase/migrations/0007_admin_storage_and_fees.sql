-- Private bucket for product photos and receipts (served to the admin via signed URLs only;
-- the existing `Keniya` bucket is public).
insert into storage.buckets (id, name, public)
values ('keniya-admin', 'keniya-admin', false)
on conflict (id) do update set public = false;

-- Actual Stripe fee and net payout per preorder, read from the balance transaction.
alter table public.preorders add column if not exists stripe_fee_cents integer;
alter table public.preorders add column if not exists amount_net_cents integer;
