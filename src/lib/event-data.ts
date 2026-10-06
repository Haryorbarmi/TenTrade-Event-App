// Clearing event data (CLAUDE.md section 9: delete all event data after the
// event; also used before the event to remove practice entries). Callers must
// check the user is a Super Admin first. Uses the service role: winners and the
// edit history can never be deleted from a browser.

import type { SupabaseClient } from "@supabase/supabase-js";

export const CONFIRM_PHRASE = "DELETE ALL";

export type EventDataCounts = { attendees: number; winners: number; participants: number; changes: number };

export async function countEventData(admin: SupabaseClient): Promise<EventDataCounts> {
  const count = async (table: string) => (await admin.from(table).select("*", { count: "exact", head: true })).count ?? 0;
  const [attendees, winners, participants, changes] = await Promise.all([
    count("attendees"),
    count("winners"),
    count("participants"),
    count("attendee_changes"),
  ]);
  return { attendees, winners, participants, changes };
}

const ALL_UUIDS = "00000000-0000-0000-0000-000000000000"; // filter that matches every row

// Deletes all attendee data and raffle results and reopens every draw. Keeps
// user accounts, settings and the staff activity log (which holds no names or
// contact details). The next attendee added becomes arrival No. 1.
export async function clearEventData(
  admin: SupabaseClient,
  actor: string,
  confirmation: string,
): Promise<{ ok: true; value: EventDataCounts } | { ok: false; error: string }> {
  if (confirmation.trim() !== CONFIRM_PHRASE) return { ok: false, error: `Type ${CONFIRM_PHRASE} to confirm.` };

  const before = await countEventData(admin);
  const steps = [
    () => admin.from("winners").delete().neq("id", ALL_UUIDS),
    () => admin.from("participants").delete().neq("attendee_id", ALL_UUIDS),
    () => admin.from("attendee_changes").delete().gte("id", 0),
    () => admin.from("attendees").delete().neq("id", ALL_UUIDS),
    () =>
      admin
        .from("draws")
        .update({ status: "open", pool_snapshot: null, locked_by: null, locked_at: null })
        .in("type", ["grand", "early_bird", "lucky", "engagement", "knowledge"]),
  ];
  for (const step of steps) {
    const { error } = await step();
    if (error) return { ok: false, error: `Stopped part-way: ${error.message}. Nothing was restored; press the button again to finish.` };
  }

  await admin.from("activity_log").insert({ actor, action: "event_data_cleared", detail: { deleted: before } });
  return { ok: true, value: before };
}
