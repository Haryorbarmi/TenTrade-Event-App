-- Owner account: the one Super Admin that other Super Admins cannot disable,
-- demote or reset the password of. The flag is only ever set here, in the SQL
-- editor; the app never writes it. Profiles have no write policies, so users
-- cannot set it on themselves.

alter table public.profiles add column is_owner boolean not null default false;

-- At most one owner.
create unique index profiles_one_owner on public.profiles (is_owner) where is_owner;

-- Make Ayobami the owner (also makes sure the account is an active Super Admin).
update public.profiles
set is_owner = true, role = 'super_admin', active = true
where id = (select id from auth.users where email = 'ayobami@tentrade.com');

-- Check: should return exactly one row.
select p.name, u.email, p.role, p.active, p.is_owner
from public.profiles p join auth.users u on u.id = p.id
where p.is_owner;
