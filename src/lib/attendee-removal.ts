// What deleting an attendee does to the raffle (CLAUDE.md section 7). The caller
// must already have checked the user is a Super Admin. Uses the service role:
// winners and draws are never written from a browser.
//
// - Their wins go away with them (the database cascades), which frees those
//   prize slots. A draw that was "done" becomes "locked" again so the slot can
//   be drawn again from the same frozen list.
// - Every locked list is a frozen snapshot, so the deleted person is also
//   taken out of those, otherwise a later draw could pick someone who no
//   longer exists.

import type { SupabaseClient } from "@supabase/supabase-js";
import { totalEntries } from "./draw-engine";
import type { PoolSnapshot } from "./raffle";

export type Win = { drawId: string; drawName: string };

// Pure: the snapshot without one person. Same object back if they were not in it.
export function withoutAttendee(snapshot: PoolSnapshot, attendeeId: string): PoolSnapshot {
  if (!snapshot.entries.some((e) => e.attendee_id === attendeeId)) return snapshot;
  const entries = snapshot.entries.filter((e) => e.attendee_id !== attendeeId);
  return { entries, total: totalEntries(entries) };
}

// Prizes this person currently holds (replaced wins no longer count).
export async function currentWins(admin: SupabaseClient, attendeeId: string): Promise<Win[]> {
  const { data, error } = await admin
    .from("winners")
    .select("draw_id, draws(name)")
    .eq("attendee_id", attendeeId)
    .eq("replaced", false);
  if (error) throw new Error(`Could not load winners: ${error.message}`);
  return (data ?? []).map((w) => {
    const draw = w.draws as unknown as { name: string } | { name: string }[] | null;
    return { drawId: w.draw_id as string, drawName: (Array.isArray(draw) ? draw[0]?.name : draw?.name) ?? "a draw" };
  });
}

// Run after the attendee row is deleted. Reopens finished draws that lost a
// winner and removes the person from every frozen list.
export async function tidyDrawsAfterDelete(admin: SupabaseClient, attendeeId: string, wins: Win[]): Promise<void> {
  const { data: draws, error } = await admin.from("draws").select("id, status, pool_snapshot");
  if (error) throw new Error(`Could not load draws: ${error.message}`);

  const lostWinner = new Set(wins.map((w) => w.drawId));
  for (const d of draws ?? []) {
    const snapshot = d.pool_snapshot as PoolSnapshot | null;
    const trimmed = snapshot ? withoutAttendee(snapshot, attendeeId) : null;
    const patch: Record<string, unknown> = {};
    if (snapshot && trimmed !== snapshot) patch.pool_snapshot = trimmed;
    if (d.status === "done" && lostWinner.has(d.id)) patch.status = snapshot ? "locked" : "open";
    if (Object.keys(patch).length) {
      const { error: updateError } = await admin.from("draws").update(patch).eq("id", d.id);
      if (updateError) throw new Error(`Could not update draw: ${updateError.message}`);
    }
  }
}
