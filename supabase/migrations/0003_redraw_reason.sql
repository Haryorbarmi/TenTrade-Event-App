-- Phase 3: redraw. Paste into the Supabase SQL editor and run once.

-- Why a winner was replaced. 'absent' winners are not in the room, so the app
-- leaves them out of every later draw; the other kinds only cancel this win.
alter table public.winners
  add column if not exists replace_kind text
  check (replace_kind in ('absent', 'ineligible', 'other'));

alter table public.winners
  add constraint winners_replaced_has_kind
  check (not replaced or replace_kind is not null);
