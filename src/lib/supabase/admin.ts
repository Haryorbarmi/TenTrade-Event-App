import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

// Service-role client: bypasses RLS. Server only, and only for trusted writes
// such as the activity log. Always check the user's role before using it.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill it in.");
  return createClient(supabaseUrl(), key, { auth: { persistSession: false } });
}

export async function logActivity(actor: string, action: string, detail?: Record<string, unknown>) {
  const { error } = await createAdminClient().from("activity_log").insert({ actor, action, detail: detail ?? null });
  if (error) console.error(`activity_log insert failed (${action}):`, error.message);
}
