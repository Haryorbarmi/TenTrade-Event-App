-- TenTrade Lagos Seminar 2026: foundation schema (Phase 1)
-- Paste into the Supabase SQL editor (or run with `supabase db push`).
-- There is NO balance column anywhere, by design (CLAUDE.md section 9).

-- ---------------------------------------------------------------------------
-- Profiles and roles
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('super_admin', 'registrar');

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  role       public.app_role not null default 'registrar',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Every new auth user gets a profile. The role comes from app_metadata, which
-- only the service role can set, so a user can never choose their own role.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), new.email),
    coalesce((new.raw_app_meta_data ->> 'role')::public.app_role, 'registrar')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The caller's role, or null when signed out or disabled. Used by every policy.
create function public.current_app_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_app_role() = 'super_admin', false)
$$;

create function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_app_role() is not null
$$;

-- ---------------------------------------------------------------------------
-- Attendees
-- ---------------------------------------------------------------------------

create table public.attendees (
  id            uuid primary key default gen_random_uuid(),
  seq           integer not null unique,
  client_id     text not null unique,
  name          text not null,
  email         text not null,
  phone         text not null,
  eligible      boolean not null default false,
  tickets       integer not null default 0,
  source        text not null default 'manual' check (source in ('manual', 'crm')),
  registered_by uuid not null references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  updated_by    uuid references public.profiles (id),
  constraint tickets_range check (tickets between 0 and 10),
  constraint tickets_match_eligibility check (
    (eligible and tickets between 1 and 10) or (not eligible and tickets = 0)
  )
);

-- Arrival numbers are assigned here, never by the browser. The advisory lock
-- serialises concurrent inserts so two registrars can never get the same number,
-- and a rejected insert (e.g. duplicate Client ID) does not leave a gap.
create function public.attendees_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('public.attendees.seq'));
  new.seq := coalesce((select max(seq) from public.attendees), 0) + 1;
  new.registered_by := auth.uid();
  new.created_at := now();
  new.updated_at := null;
  new.updated_by := null;
  return new;
end;
$$;

create trigger attendees_before_insert
  before insert on public.attendees
  for each row execute function public.attendees_before_insert();

create table public.attendee_changes (
  id          bigint generated always as identity primary key,
  attendee_id uuid not null references public.attendees (id) on delete cascade,
  changed_by  uuid references public.profiles (id),
  changed_at  timestamptz not null default now(),
  field       text not null,
  old_value   text,
  new_value   text
);

-- Edits: lock the fields nobody may change, stamp who/when, and write one audit
-- row per changed field.
create function public.attendees_before_update() returns trigger
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
  foreach f in array array['client_id', 'name', 'email', 'phone', 'eligible', 'tickets', 'source'] loop
    if old_row ->> f is distinct from new_row ->> f then
      insert into public.attendee_changes (attendee_id, changed_by, field, old_value, new_value)
      values (old.id, auth.uid(), f, old_row ->> f, new_row ->> f);
    end if;
  end loop;
  return new;
end;
$$;

create trigger attendees_before_update
  before update on public.attendees
  for each row execute function public.attendees_before_update();

-- ---------------------------------------------------------------------------
-- Draws (Super Admin only)
-- ---------------------------------------------------------------------------

create table public.participants (
  attendee_id uuid primary key references public.attendees (id) on delete cascade,
  tagged_by   uuid not null default auth.uid() references public.profiles (id),
  tagged_at   timestamptz not null default now()
);

create table public.draws (
  id            uuid primary key default gen_random_uuid(),
  type          text not null unique check (type in ('grand', 'early_bird', 'lucky', 'engagement', 'knowledge')),
  name          text not null,
  prize_amount  integer not null,
  winners_count integer not null default 1,
  status        text not null default 'open' check (status in ('open', 'locked', 'done')),
  locked_by     uuid references public.profiles (id),
  locked_at     timestamptz,
  pool_snapshot jsonb
);

create table public.winners (
  id              uuid primary key default gen_random_uuid(),
  draw_id         uuid not null references public.draws (id) on delete cascade,
  attendee_id     uuid not null references public.attendees (id) on delete cascade,
  position        integer not null,
  drawn_by        uuid not null references public.profiles (id),
  drawn_at        timestamptz not null default now(),
  pool_size       integer not null,
  total_tickets   integer not null,
  random_value    bigint not null,
  replaced        boolean not null default false,
  replaced_reason text
);

-- One prize per attendee: at most one current (not replaced) win per person.
create unique index winners_one_prize_per_attendee on public.winners (attendee_id) where not replaced;

insert into public.draws (type, name, prize_amount, winners_count) values
  ('grand',      'Grand Trading Draw',  1000, 1),
  ('early_bird', 'Early Bird',           500, 1),
  ('engagement', 'Event Engagement',     250, 5),
  ('knowledge',  'Knowledge Challenge',  100, 1),
  ('lucky',      'Lucky Attendee',        50, 1);

-- ---------------------------------------------------------------------------
-- Activity log: sign-ins, entries, locks, draws, exports (CLAUDE.md section 9)
-- ---------------------------------------------------------------------------

create table public.activity_log (
  id       bigint generated always as identity primary key,
  actor    uuid references public.profiles (id),
  action   text not null,
  detail   jsonb,
  at       timestamptz not null default now()
);

-- Browsers may only record their own sign-in/sign-out. Trusted actions (draws,
-- exports, locks) are logged by server code with the service role.
create function public.log_session_event(p_action text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_action not in ('sign_in', 'sign_out') then
    raise exception 'action not allowed';
  end if;
  if not public.is_active_user() then
    raise exception 'not allowed';
  end if;
  insert into public.activity_log (actor, action) values (auth.uid(), p_action);
end;
$$;

create function public.attendees_log_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.activity_log (actor, action, detail)
  values (auth.uid(), 'attendee_added', jsonb_build_object('attendee_id', new.id, 'seq', new.seq));
  return null;
end;
$$;

create trigger attendees_log_insert
  after insert on public.attendees
  for each row execute function public.attendees_log_insert();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.attendees        enable row level security;
alter table public.attendee_changes enable row level security;
alter table public.participants     enable row level security;
alter table public.draws            enable row level security;
alter table public.winners          enable row level security;
alter table public.activity_log     enable row level security;

-- Profiles: active users can see names (for "Registered by"). Changes go
-- through the service role only (Super Admin server actions / scripts).
create policy profiles_select on public.profiles
  for select to authenticated using (public.is_active_user());

-- Attendees: every active user can view and add.
create policy attendees_select on public.attendees
  for select to authenticated using (public.is_active_user());

create policy attendees_insert on public.attendees
  for insert to authenticated with check (public.is_active_user());

-- Edits: Super Admin on any entry, registrars on entries they created.
create policy attendees_update on public.attendees
  for update to authenticated
  using (public.is_super_admin() or (public.is_active_user() and registered_by = auth.uid()))
  with check (public.is_super_admin() or (public.is_active_user() and registered_by = auth.uid()));

create policy attendees_delete on public.attendees
  for delete to authenticated using (public.is_super_admin());

create policy attendee_changes_select on public.attendee_changes
  for select to authenticated using (public.is_super_admin());

-- Raffle tables: Super Admin only. Registrars get nothing, even via the API.
create policy participants_all on public.participants
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy draws_all on public.draws
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy winners_select on public.winners
  for select to authenticated using (public.is_super_admin());
-- Winners are written only by the server draw engine (service role), never
-- directly from a browser, and are never deleted.

create policy activity_log_select on public.activity_log
  for select to authenticated using (public.is_super_admin());

-- Lock down function execution to signed-in users.
revoke execute on function public.log_session_event(text) from public, anon;
grant execute on function public.log_session_event(text) to authenticated;

-- Realtime for the live attendee list (Phase 2).
alter publication supabase_realtime add table public.attendees;
