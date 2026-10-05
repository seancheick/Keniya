-- "Pre-approved": passed an automated source/ingredient pre-screen, awaiting the clinician.
-- Only "Approved" means clinically approved (lineup check "Picks not yet approved").
alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check
  check (status in ('Candidate', 'Pre-approved', 'Approved', 'Rejected', 'Retired'));
