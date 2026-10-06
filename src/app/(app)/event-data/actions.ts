"use server";

import { requireSuperAdmin } from "@/lib/auth";
import { clearEventData } from "@/lib/event-data";
import { createAdminClient } from "@/lib/supabase/admin";

// Super Admin only, re-checked here even if the page is bypassed.
export async function clearAllEventData(confirmation: string) {
  const me = await requireSuperAdmin();
  return clearEventData(createAdminClient(), me.id, confirmation);
}
