"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { readTable } from "@/lib/read-table";
import { MAX_ROSTER_ROWS, planRosterImport, rosterTableToRows } from "@/lib/roster-import";
import { createAdminClient, logActivity } from "@/lib/supabase/admin";

export type RosterImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; imported: number; skipped: { line: number; reason: string }[] };

const MAX_BYTES = 10 * 1024 * 1024;

// Replaces the whole roster with the uploaded sheet. New rows are written first, stamped
// with one batch time; only then are rows from older imports removed, so a failed upload
// never leaves the roster empty.
export async function importRoster(_prev: RosterImportState, formData: FormData): Promise<RosterImportState> {
  const me = await requireSuperAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose a file first." };
  if (file.size > MAX_BYTES) return { status: "error", message: "That file is too big (limit 10 MB)." };

  const table = await readTable(file);
  if (typeof table === "string") return { status: "error", message: table };
  const parsed = rosterTableToRows(table);
  if ("error" in parsed) return { status: "error", message: parsed.error };
  if (parsed.rows.length === 0) return { status: "error", message: "The file has no rows below the headings." };
  if (parsed.rows.length > MAX_ROSTER_ROWS)
    return { status: "error", message: `Too many rows (${parsed.rows.length}). The limit is ${MAX_ROSTER_ROWS}.` };

  const plan = planRosterImport(parsed.rows);
  if (plan.rows.length === 0)
    return { status: "error", message: `No usable rows. First problem: row ${plan.skipped[0]?.line}: ${plan.skipped[0]?.reason}` };

  const db = createAdminClient();
  const batch = new Date().toISOString();
  for (let i = 0; i < plan.rows.length; i += 500) {
    const chunk = plan.rows.slice(i, i + 500).map((r) => ({ ...r, imported_at: batch, imported_by: me.id }));
    const { error } = await db.from("client_roster").upsert(chunk, { onConflict: "client_id" });
    if (error) return { status: "error", message: "Could not save the roster. Nothing was removed; try again." };
  }
  const { error: cleanupError } = await db.from("client_roster").delete().lt("imported_at", batch);
  if (cleanupError) return { status: "error", message: "Saved the new clients but could not remove old ones. Upload again." };

  await logActivity(me.id, "roster_imported", { imported: plan.rows.length, skipped: plan.skipped.length });
  revalidatePath("/roster");
  return { status: "done", imported: plan.rows.length, skipped: plan.skipped };
}
