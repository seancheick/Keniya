-- Separate the automated/founder pre-screen from clinician approval.
-- reviewed_by/at = clinician decision (Approved/Rejected); prescreened_by/at = pre-screen.
alter table public.products add column if not exists prescreened_by text;
alter table public.products add column if not exists prescreened_at timestamptz;
-- Pre-approved rows were stamped in reviewed_by: move that to the pre-screen fields.
update public.products
  set prescreened_by = reviewed_by, prescreened_at = reviewed_at, reviewed_by = null, reviewed_at = null
  where status = 'Pre-approved' and reviewed_by is not null and prescreened_by is null;
