-- Phase 5: event settings. Paste into the Supabase SQL editor and run once.
-- Safe to run again.

-- One row of event-wide settings. For now: the "of N expected" number on the
-- Dashboard, typed in by a Super Admin (owner decision, CLAUDE.md section 13).
create table if not exists public.event_settings (
  id                 integer primary key default 1 check (id = 1),
  expected_attendees integer check (expected_attendees is null or expected_attendees between 1 and 100000),
  updated_by         uuid references public.profiles (id),
  updated_at         timestamptz
);

insert into public.event_settings (id) values (1) on conflict (id) do nothing;

alter table public.event_settings enable row level security;

drop policy if exists event_settings_select on public.event_settings;
create policy event_settings_select on public.event_settings
  for select to authenticated using (public.is_active_user());

drop policy if exists event_settings_update on public.event_settings;
create policy event_settings_update on public.event_settings
  for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
