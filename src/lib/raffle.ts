// Lock, draw and unlock (CLAUDE.md section 7). The caller must already have
// checked that the user is a Super Admin (see app/(app)/raffle/actions.ts).
//
// `db` acts as the signed-in Super Admin (RLS applies). `admin` is the
// service-role client, used only for writes browsers are never allowed:
// winners and the activity log.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildPool,
  pickWinner,
  totalEntries,
  type DrawType,
  type PoolCandidate,
  type PoolEntry,
} from "./draw-engine";

export type Draw = {
  id: string;
  type: DrawType;
  name: string;
  prize_amount: number;
  winners_count: number;
  status: "open" | "locked" | "done";
  locked_by: string | null;
  locked_at: string | null;
  pool_snapshot: PoolSnapshot | null;
};

export type PoolSnapshot = { entries: PoolEntry[]; total: number };

export type Winner = {
  id: string;
  attendee_id: string;
  position: number;
  pool_size: number;
  total_tickets: number;
  random_value: number;
  drawn_at: string;
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });

async function loadDraw(db: SupabaseClient, drawId: string): Promise<Draw | null> {
  const { data } = await db.from("draws").select("*").eq("id", drawId).maybeSingle();
  return data as Draw | null;
}

// Everyone who can no longer win anything: current prize holders (one prize per
// attendee) and winners replaced because they were absent (not in the room).
export async function excludedAttendeeIds(db: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await db.from("winners").select("attendee_id").or("replaced.eq.false,replace_kind.eq.absent");
  if (error) throw new Error(`Could not load winners: ${error.message}`);
  return new Set((data ?? []).map((w) => w.attendee_id));
}

async function log(admin: SupabaseClient, actor: string, action: string, detail: Record<string, unknown>) {
  await admin.from("activity_log").insert({ actor, action, detail });
}

// The pool a draw would use right now. Used for the preview before locking.
export async function previewPool(
  db: SupabaseClient,
  draw: Pick<Draw, "type">,
  opts: { tiedClientIds?: string[] } = {},
): Promise<Result<PoolSnapshot>> {
  const [{ data: attendees, error }, winnerIds, participants] = await Promise.all([
    db.from("attendees").select("id, seq, client_id, eligible, tickets"),
    excludedAttendeeIds(db),
    draw.type === "engagement" ? db.from("participants").select("attendee_id") : Promise.resolve({ data: [] }),
  ]);
  if (error || !attendees) return fail("Could not load the attendee list.");

  const tiedIds =
    draw.type === "knowledge"
      ? new Set(attendees.filter((a) => opts.tiedClientIds?.includes(a.client_id)).map((a) => a.id))
      : undefined;
  const entries = buildPool(draw.type, attendees as PoolCandidate[], {
    winnerIds,
    participantIds: new Set((participants.data ?? []).map((p: { attendee_id: string }) => p.attendee_id)),
    tiedIds,
  });
  return { ok: true, value: { entries, total: totalEntries(entries) } };
}

// Lock: freeze the pool. The draw will only ever pick from this snapshot.
export async function lockDraw(
  db: SupabaseClient,
  admin: SupabaseClient,
  actor: string,
  drawId: string,
  opts: { tiedClientIds?: string[] } = {},
): Promise<Result<PoolSnapshot>> {
  const draw = await loadDraw(db, drawId);
  if (!draw) return fail("Draw not found.");
  if (draw.status !== "open") return fail(draw.status === "locked" ? "This list is already locked." : "This draw is complete.");

  const preview = await previewPool(db, draw, opts);
  if (!preview.ok) return preview;
  if (preview.value.entries.length === 0) return fail("Nobody is in the pool for this draw yet, so it cannot be locked.");

  // Only an open draw can be locked: a second click finds it already locked.
  const { data, error } = await db
    .from("draws")
    .update({ status: "locked", pool_snapshot: preview.value, locked_by: actor, locked_at: new Date().toISOString() })
    .eq("id", drawId)
    .eq("status", "open")
    .select("id");
  if (error) return fail("Could not lock the list. Try again.");
  if (!data?.length) return fail("This list was just locked by someone else.");

  await log(admin, actor, "draw_locked", { draw_id: drawId, draw: draw.type, pool_size: preview.value.entries.length, total: preview.value.total });
  return preview;
}

// Unlock: back to open so the pool can change. The UI asks for confirmation.
export async function unlockDraw(db: SupabaseClient, admin: SupabaseClient, actor: string, drawId: string): Promise<Result<null>> {
  const draw = await loadDraw(db, drawId);
  if (!draw) return fail("Draw not found.");
  if (draw.status !== "locked") return fail("Only a locked list can be unlocked.");

  const { data, error } = await db
    .from("draws")
    .update({ status: "open", pool_snapshot: null, locked_by: null, locked_at: null })
    .eq("id", drawId)
    .eq("status", "locked")
    .select("id");
  if (error || !data?.length) return fail("Could not unlock the list. Refresh and try again.");

  await log(admin, actor, "draw_unlocked", { draw_id: drawId, draw: draw.type });
  return { ok: true, value: null };
}

// Draw one winner from the locked snapshot.
export async function drawWinner(
  db: SupabaseClient,
  admin: SupabaseClient,
  actor: string,
  drawId: string,
  random?: (max: number) => number,
): Promise<Result<{ winner: Winner; complete: boolean }>> {
  const draw = await loadDraw(db, drawId);
  if (!draw) return fail("Draw not found.");
  if (draw.status === "open") return fail("Lock the list before drawing.");
  if (draw.status === "done" || !draw.pool_snapshot) return fail("This draw is complete.");

  const [winnerIds, { data: mine }] = await Promise.all([
    excludedAttendeeIds(db),
    db.from("winners").select("position").eq("draw_id", drawId).eq("replaced", false),
  ]);
  // First free slot: after a redraw this is the replaced winner's position.
  const taken = new Set((mine ?? []).map((w) => w.position));
  const position = Array.from({ length: draw.winners_count }, (_, i) => i + 1).find((p) => !taken.has(p));
  if (position === undefined) return fail("All winners for this draw have been drawn.");

  // Also drop anyone who won another draw, or was found absent, after this list was locked.
  const pool = draw.pool_snapshot.entries.filter((e) => !winnerIds.has(e.attendee_id));
  if (pool.length === 0) return fail("Everyone left in this locked list has already won a prize.");

  const pick = pickWinner(pool, random);
  const { data: saved, error } = await admin
    .from("winners")
    .insert({
      draw_id: drawId,
      attendee_id: pick.winner.attendee_id,
      position,
      drawn_by: actor,
      pool_size: pick.poolSize,
      total_tickets: pick.totalTickets,
      random_value: pick.randomValue,
    })
    .select("id, attendee_id, position, pool_size, total_tickets, random_value, drawn_at")
    .single();
  if (error) {
    // 23505: another draw request won the race for this slot, or this person just won elsewhere.
    if (error.code === "23505") return fail("Another draw was made at the same moment. Refresh to see the result.");
    return fail("Could not save the winner. Try again.");
  }

  const complete = taken.size + 1 === draw.winners_count;
  if (complete) await db.from("draws").update({ status: "done" }).eq("id", drawId);

  await log(admin, actor, "winner_drawn", {
    draw_id: drawId,
    draw: draw.type,
    position,
    attendee_id: pick.winner.attendee_id,
    pool_size: pick.poolSize,
    total: pick.totalTickets,
    random_value: pick.randomValue,
  });
  return { ok: true, value: { winner: saved as Winner, complete } };
}

// Event Engagement participants. Only while the list is unlocked: a locked
// snapshot would not include changes, so the app refuses rather than mislead.
async function engagementIsOpen(db: SupabaseClient): Promise<boolean> {
  const { data } = await db.from("draws").select("status").eq("type", "engagement").maybeSingle();
  return data?.status === "open";
}

export async function tagParticipant(db: SupabaseClient, clientId: string): Promise<Result<{ name: string }>> {
  const id = clientId.trim();
  if (!id) return fail("Enter a Client ID.");
  if (!(await engagementIsOpen(db))) return fail("Unlock the list to change participants.");

  const { data: attendee } = await db.from("attendees").select("id, name").eq("client_id", id).maybeSingle();
  if (!attendee) return fail(`No attendee with Client ID ${id}. Register them first.`);
  if ((await excludedAttendeeIds(db)).has(attendee.id)) {
    return fail(`${attendee.name} (${id}) has already won a prize or was found absent, so they cannot be in this draw.`);
  }

  const { error } = await db.from("participants").insert({ attendee_id: attendee.id });
  if (error) return fail(error.code === "23505" ? `${attendee.name} (${id}) is already tagged.` : "Could not tag. Try again.");
  return { ok: true, value: { name: attendee.name } };
}

export async function untagParticipant(db: SupabaseClient, attendeeId: string): Promise<Result<null>> {
  if (!(await engagementIsOpen(db))) return fail("Unlock the list to change participants.");
  const { error } = await db.from("participants").delete().eq("attendee_id", attendeeId);
  return error ? fail("Could not remove. Try again.") : { ok: true, value: null };
}

export type ReplaceKind = "absent" | "ineligible" | "other";

// Redraw, part 1: mark a winner as replaced (never deleted or overwritten) and
// reopen their slot. The new winner is then drawn with drawWinner as usual.
export async function replaceWinner(
  db: SupabaseClient,
  admin: SupabaseClient,
  actor: string,
  winnerId: string,
  kind: ReplaceKind,
  note: string,
): Promise<Result<null>> {
  const { data: winner } = await db
    .from("winners")
    .select("id, draw_id, attendee_id, position, replaced")
    .eq("id", winnerId)
    .maybeSingle();
  if (!winner) return fail("Winner not found.");
  if (winner.replaced) return fail("This winner has already been replaced.");

  const reason = note.trim().slice(0, 300) || null;
  const { data, error } = await admin
    .from("winners")
    .update({ replaced: true, replace_kind: kind, replaced_reason: reason })
    .eq("id", winnerId)
    .eq("replaced", false)
    .select("id");
  if (error || !data?.length) return fail("Could not replace this winner. Refresh and try again.");

  // A completed draw has a free slot again, so it goes back to locked (same snapshot).
  await db.from("draws").update({ status: "locked" }).eq("id", winner.draw_id).eq("status", "done");

  await log(admin, actor, "winner_replaced", {
    draw_id: winner.draw_id,
    winner_id: winnerId,
    attendee_id: winner.attendee_id,
    position: winner.position,
    kind,
    reason,
  });
  return { ok: true, value: null };
}
