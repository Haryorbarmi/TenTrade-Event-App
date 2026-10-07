-- Per the boss: attendees are recorded by Client ID and Name only, and only
-- Super Admins may edit an entry.

-- 1. Email and phone are no longer collected. The columns stay (old rows keep
--    their values, hidden from the app) but are optional, so new rows can omit them.
alter table public.attendees alter column email drop not null;
alter table public.attendees alter column phone drop not null;

-- 2. Edits: Super Admin only (registrars could edit their own entries before).
--    Adding attendees is unchanged: every active user can still register.
drop policy attendees_update on public.attendees;
create policy attendees_update on public.attendees
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Check: email/phone should now say YES (nullable), and the update policy
-- should mention only is_super_admin().
select column_name, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'attendees' and column_name in ('email', 'phone');

select policyname, qual
from pg_policies
where schemaname = 'public' and tablename = 'attendees' and policyname = 'attendees_update';
