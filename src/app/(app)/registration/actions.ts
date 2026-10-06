"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { validateAttendee, type FieldErrors } from "@/lib/attendee-validation";

export type AddAttendeeState =
  | { status: "idle" }
  | { status: "error"; errors: FieldErrors; message?: string }
  | { status: "added"; seq: number; name: string; clientId: string };

const duplicateMessage = (clientId: string) =>
  `Client ID ${clientId} is already registered. Each client can only be added once.`;

export async function addAttendee(_prev: AddAttendeeState, formData: FormData): Promise<AddAttendeeState> {
  await requireUser();

  const eligibleRaw = formData.get("eligible");
  const result = validateAttendee({
    clientId: String(formData.get("clientId") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    eligible: eligibleRaw === "yes" ? true : eligibleRaw === "no" ? false : null,
    tickets: Number(formData.get("tickets") ?? 0),
  });
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

// Early warning while typing; addAttendee still enforces uniqueness.
export async function checkClientId(clientId: string): Promise<string | null> {
  await requireUser();
  const id = clientId.trim();
  if (!id) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("attendees").select("seq").eq("client_id", id).maybeSingle();
  return data ? `${duplicateMessage(id)} (Arrival no. ${data.seq})` : null;
}
