-- Storage bucket + policies for Keniya assets (applied via Management API 2026-07-17)
insert into storage.buckets (id, name, public)
values ('Keniya', 'Keniya', true)
on conflict (id) do update set public = excluded.public;
