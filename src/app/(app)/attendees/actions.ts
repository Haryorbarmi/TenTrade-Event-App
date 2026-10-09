"use server";

import { getCurrentProfile, requireUser } from "@/lib/auth";
import {
  attendeeFromForm,
  duplicateClientIdMessage,
  validateAttendee,
  type FieldErrors,
} from "@/lib/attendee-validation";
import { canEditAttendee, isSuperAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, logActivity } from "@/lib/supabase/admin";
import { currentWins, tidyDrawsAfterDelete, type Win } from "@/lib/attendee-removal";

export type EditAttendeeState =
  | { status: "idle" }
  | { status: "error"; errors: FieldErrors; message?: string }
  | { status: "saved" };

export type AttendeeChange = {
  id: number;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
};

const NOT_ALLOWED = "Only Super Admins can edit an entry. Ask a Super Admin to change this one.";

// Seq, who registered and when never change: the database trigger locks them
// and writes one audit row per changed field. Super Admin only; the database
// refuses registrars too.
export async function updateAttendee(id: string, _prev: EditAttendeeState, formData: FormData): Promise<EditAttendeeState> {
  const profile = await requireUser();
  if (!canEditAttendee(profile)) return { status: "error", errors: {}, message: NOT_ALLOWED };
  const supabase = await createClient();

  const result = validateAttendee(attendeeFromForm(formData));
  if ("errors" in result) return { status: "error", errors: result.errors };

  const { data, error } = await supabase.from("attendees").update(result.data).eq("id", id).select("id");
  if (error) {
    if (error.code === "23505") {
      return { status: "error", errors: { clientId: duplicateClientIdMessage(result.data.client_id) } };
    }
    return { status: "error", errors: {}, message: "Could not save. Check the connection and try again." };
  }
  // No row back: the entry was deleted (e.g. an Event data wipe) while the pop-up was open.
  if (!data?.length) return { status: "error", errors: {}, message: "This entry no longer exists." };
  return { status: "saved" };
}

export type DeleteAttendeeResult = { status: "deleted" } | { status: "error"; message: string };

const DELETE_NOT_ALLOWED = "Only Super Admins can delete an entry.";

// Prizes the client holds now, so the confirmation can say what deleting will reopen.
export async function getAttendeePrizes(id: string): Promise<string[] | null> {
  const profile = await getCurrentProfile();
  if (!canEditAttendee(profile)) return null;
  try {
    return (await currentWins(createAdminClient(), id)).map((w) => w.drawName);
  } catch {
    return null;
  }
}

// Super Admin only (the database refuses registrars too). If the client holds a
// prize, it is reset: the slot is free to draw again from the same locked list
// (see lib/attendee-removal.ts). The activity log notes the arrival number
// and the prizes reopened, never a name.
export async function deleteAttendee(id: string): Promise<DeleteAttendeeResult> {
  const profile = await requireUser();
  if (!canEditAttendee(profile)) return { status: "error", message: DELETE_NOT_ALLOWED };

  const admin = createAdminClient();
  let wins: Win[];
  try {
    wins = await currentWins(admin, id);
  } catch {
    return { status: "error", message: "Could not check the raffle results. Try again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("attendees").delete().eq("id", id).select("seq");
  if (error) return { status: "error", message: "Could not delete. Check the connection and try again." };
  if (!data?.length) return { status: "error", message: "This entry no longer exists." };

  try {
    await tidyDrawsAfterDelete(admin, id, wins);
  } catch {
    await logActivity(profile.id, "attendee_deleted", { seq: data[0].seq, prizes_reopened: wins.map((w) => w.drawName), draws_tidied: false });
    return { status: "error", message: "The entry was deleted, but the raffle lists could not be updated. Open the Raffle page and check the draws." };
  }

  await logActivity(profile.id, "attendee_deleted", { seq: data[0].seq, prizes_reopened: wins.map((w) => w.drawName) });
  return { status: "deleted" };
}

// Change history is visible to Super Admins only (RLS returns nothing to registrars).
export async function getAttendeeHistory(id: string): Promise<AttendeeChange[] | null> {
  const profile = await getCurrentProfile();
  if (!isSuperAdmin(profile)) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("attendee_changes")
    .select("id, field, old_value, new_value, changed_by, changed_at")
    .eq("attendee_id", id)
    .order("changed_at", { ascending: false });
  return data ?? [];
}
