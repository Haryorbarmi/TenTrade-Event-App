-- Client roster (imported from the company's Excel sheet) and split names.
--
-- 1. client_roster holds the imported clients: Client ID (also called CRM ID),
--    First / Middle / Last name and the account balance. Balances are stored here
--    ONLY: they are never copied to attendees and never sent to the browser. RLS is
--    on with NO policies, so no signed-in user can read the table directly; only the
--    server (service role) can, and it turns the balance into eligible + tickets.
-- 2. attendees get first_name / middle_name / last_name. The existing `name` column
--    stays (raffle, projector and exports read it) and is now composed from the
--    parts by a trigger whenever first_name is present.

create table public.client_roster (
  client_id   text primary key,
  first_name  text not null,
  middle_name text,
  last_name   text not null,
  balance     numeric(14, 2) not null,
  imported_at timestamptz not null default now(),
  imported_by uuid references public.profiles (id)
);

alter table public.client_roster enable row level security;
-- Deliberately no policies: invisible to every signed-in user.

alter table public.attendees add column first_name  text;
alter table public.attendees add column middle_name text;
alter table public.attendees add column last_name   text;

-- Backfill existing rows: first word = first name, the rest = last name.
update public.attendees
set first_name = split_part(btrim(name), ' ', 1),
    last_name  = nullif(btrim(substr(btrim(name), length(split_part(btrim(name), ' ', 1)) + 1)), '')
where first_name is null;

-- Keep `name` in step with the parts. Named with an "a_" prefix so it fires before
-- the audit trigger and the audit sees the final name.
create function public.attendees_compose_name() returns trigger
language plpgsql set search_path = '' as $$
begin
  if nullif(btrim(coalesce(new.first_name, '')), '') is not null then
    new.first_name  := btrim(new.first_name);
    new.middle_name := nullif(btrim(coalesce(new.middle_name, '')), '');
    new.last_name   := nullif(btrim(coalesce(new.last_name, '')), '');
    new.name := concat_ws(' ', new.first_name, new.middle_name, new.last_name);
  end if;
  return new;
end;
$$;

create trigger attendees_a_compose_name
  before insert or update on public.attendees
  for each row execute function public.attendees_compose_name();

-- Edits are audited per field: include the new name parts.
create or replace function public.attendees_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  f text;
  old_row jsonb;
  new_row jsonb;
begin
  new.id := old.id;
  new.seq := old.seq;
  new.registered_by := old.registered_by;
  new.created_at := old.created_at;
  new.updated_at := now();
  new.updated_by := auth.uid();

  old_row := to_jsonb(old);
  new_row := to_jsonb(new);
  foreach f in array array['client_id', 'name', 'first_name', 'middle_name', 'last_name', 'email', 'phone', 'eligible', 'tickets', 'source'] loop
    if old_row ->> f is distinct from new_row ->> f then
      insert into public.attendee_changes (attendee_id, changed_by, field, old_value, new_value)
      values (old.id, auth.uid(), f, old_row ->> f, new_row ->> f);
    end if;
  end loop;
  return new;
end;
$$;

-- Check: roster table exists with RLS on and no policies; attendees have the new columns.
select c.relname, c.relrowsecurity as rls_on,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relname = 'client_roster';

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'attendees' and column_name in ('first_name', 'middle_name', 'last_name');
