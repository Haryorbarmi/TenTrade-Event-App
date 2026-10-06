"use server";

import { requireSuperAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// The "of N expected" number on the Checked in card. Super Admin only
// (checked here and by RLS on event_settings). Empty clears it.
export async function setExpectedAttendees(raw: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireSuperAdmin();
  const text = raw.trim();
  const value = text === "" ? null : Number(text);
  if (value !== null && !(Number.isInteger(value) && value >= 1 && value <= 100000)) {
    return { ok: false, error: "Enter a whole number, like 240." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_settings")
    .update({ expected_attendees: value, updated_by: me.id, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Could not save. Try again." };

  await logActivity(me.id, "expected_attendees_set", { value });
  return { ok: true };
}
