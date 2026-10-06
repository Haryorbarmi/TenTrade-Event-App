-- Phase 3: draw safety. Paste into the Supabase SQL editor and run once.

-- Each winner slot in a draw (position 1, 2, ... up to winners_count) can be
-- filled only once while it stands. If two "Draw" requests race (double-click,
-- two admins), the second insert fails instead of creating an extra winner.
-- A replaced winner (redraw) frees the slot for the new winner.
create unique index if not exists winners_one_per_position
  on public.winners (draw_id, position)
  where not replaced;
