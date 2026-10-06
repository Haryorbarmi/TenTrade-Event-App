"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  attendeeFromForm,
  duplicateClientIdMessage as duplicateMessage,
  validateAttendee,
  type FieldErrors,
} from "@/lib/attendee-validation";

export type AddAttendeeState =
  | { status: "idle" }
  | { status: "error"; errors: FieldErrors; message?: string }
  | { status: "added"; seq: number; name: string; clientId: string };

export async function addAttendee(_prev: AddAttendeeState, formData: FormData): Promise<AddAttendeeState> {
  await requireUser();

  const result = validateAttendee(attendeeFromForm(formData));
  if ("errors" in result) return { status: "error", errors: result.errors };

  // seq, registered_by and created_at are set by the database trigger.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendees")
    .insert({ ...result.data, source: "manual" })
    .select("seq, name, client_id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { status: "error", errors: { clientId: duplicateMessage(result.data.client_id) } };
    }
    return { status: "error", errors: {}, message: "Could not save. Check the connection and try again." };
  }
  return { status: "added", seq: data.seq, name: data.name, clientId: data.client_id };
}

// Early warning while typing; the database still enforces uniqueness.
// `exceptId` skips the entry being edited, so it does not clash with itself.
export async function checkClientId(clientId: string, exceptId?: string): Promise<string | null> {
  await requireUser();
  const id = clientId.trim();
  if (!id) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("attendees").select("id, seq").eq("client_id", id).maybeSingle();
  return data && data.id !== exceptId ? `${duplicateMessage(id)} (Arrival no. ${data.seq})` : null;
}
