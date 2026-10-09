"use server";

import { requireUser } from "@/lib/auth";
import { crmMode, lookupClient } from "@/lib/crm/lookup-client";
import type { ClientLookup } from "@/lib/crm/types";
import { createClient } from "@/lib/supabase/server";
import {
  CLIENT_ID_RE,
  attendeeFromForm,
  duplicateClientIdMessage as duplicateMessage,
  validateAttendee,
  type FieldErrors,
} from "@/lib/attendee-validation";

export type AddAttendeeState =
  | { status: "idle" }
  | { status: "error"; errors: FieldErrors; message?: string }
  | { status: "added"; seq: number; name: string; clientId: string };

// A CRM that errors or times out must never stop check-in: it just counts as unavailable.
async function lookupSafely(clientId: string): Promise<ClientLookup> {
  try {
    return await lookupClient(clientId);
  } catch {
    return { found: false, unavailable: true };
  }
}

// Called when the registrar leaves the Client ID box. Returns name, eligible and tickets
// only (never a balance or net deposit). With the CRM switched off it finds nothing, and the form stays manual.
export async function lookupClientAction(clientId: string): Promise<ClientLookup> {
  await requireUser();
  const id = clientId.trim();
  if (crmMode() === "off" || !CLIENT_ID_RE.test(id)) return { found: false };
  return lookupSafely(id);
}

export async function addAttendee(_prev: AddAttendeeState, formData: FormData): Promise<AddAttendeeState> {
  await requireUser();

  const result = validateAttendee(attendeeFromForm(formData));
  if ("errors" in result) return { status: "error", errors: result.errors };

  // "crm" only when what is saved is exactly what the CRM returned. The server asks again
  // rather than trusting the browser, so anything the registrar corrected counts as manual.
  let source: "manual" | "crm" = "manual";
  if (crmMode() !== "off") {
    const found = await lookupSafely(result.data.client_id);
    if (found.found && found.name === result.data.name && found.eligible === result.data.eligible && found.tickets === result.data.tickets)
      source = "crm";
  }

  // seq, registered_by and created_at are set by the database trigger.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendees")
    .insert({ ...result.data, source })
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
