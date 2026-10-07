"use server";

// TESTING ONLY: remove this file, import-button.tsx and their use in page.tsx
// before the event.

import ExcelJS from "exceljs";
import { requireSuperAdmin } from "@/lib/auth";
import { MAX_IMPORT_ROWS, parseCsv, planImport, tableToRows, type SheetRow } from "@/lib/attendee-import";
import { logActivity } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; added: number; skipped: { line: number; reason: string }[] };

const MAX_BYTES = 1024 * 1024;

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return String(v.text); // hyperlink cell, e.g. an email
    if ("result" in v) return String(v.result ?? ""); // formula cell
    return "";
  }
  return String(v);
}

async function readTable(file: File): Promise<string[][] | string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCsv(await file.text());
  if (name.endsWith(".xlsx")) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ArrayBuffer);
      const sheet = workbook.worksheets[0];
      if (!sheet) return "The workbook has no sheets.";
      const table: string[][] = [];
      sheet.eachRow({ includeEmpty: false }, (row) => {
        const cells: string[] = [];
        for (let c = 1; c <= sheet.columnCount; c++) cells.push(cellText(row.getCell(c).value));
        table.push(cells);
      });
      return table;
    } catch {
      return "Could not read that Excel file. Save it as .xlsx or .csv and try again.";
    }
  }
  return "Choose an .xlsx or .csv file.";
}

export async function importAttendees(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const me = await requireSuperAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose a file first." };
  if (file.size > MAX_BYTES) return { status: "error", message: "That file is too big (limit 1 MB)." };

  const table = await readTable(file);
  if (typeof table === "string") return { status: "error", message: table };
  const parsed = tableToRows(table);
  if ("error" in parsed) return { status: "error", message: parsed.error };
  if (parsed.rows.length === 0) return { status: "error", message: "The file has no rows below the headings." };
  if (parsed.rows.length > MAX_IMPORT_ROWS)
    return { status: "error", message: `Too many rows (${parsed.rows.length}). The limit is ${MAX_IMPORT_ROWS} per import.` };

  // First pass finds which Client IDs are candidates; then ask the database which already exist.
  const supabase = await createClient();
  const candidates = planImport(parsed.rows, new Set()).rows.map((r) => r.client_id);
  const existing = new Set<string>();
  for (let i = 0; i < candidates.length; i += 200) {
    const { data, error } = await supabase.from("attendees").select("client_id").in("client_id", candidates.slice(i, i + 200));
    if (error) return { status: "error", message: "Could not check existing attendees. Try again." };
    for (const r of data ?? []) existing.add(r.client_id);
  }
  const plan = planImport(parsed.rows as SheetRow[], existing);

  // Arrival numbers and "registered by" are set by the database trigger, in the order inserted.
  // A chunk that fails (e.g. someone registered the same Client ID meanwhile) is retried row by row.
  let added = 0;
  const skipped = [...plan.skipped];
  for (let i = 0; i < plan.rows.length; i += 100) {
    const chunk = plan.rows.slice(i, i + 100).map((r) => ({ ...r, source: "manual" as const }));
    const { error } = await supabase.from("attendees").insert(chunk);
    if (!error) {
      added += chunk.length;
      continue;
    }
    for (const row of chunk) {
      const { error: rowError } = await supabase.from("attendees").insert(row);
      if (!rowError) added++;
      else
        skipped.push({
          line: plan.lineOf[row.client_id],
          reason: rowError.code === "23505" ? `Client ID ${row.client_id} is already registered.` : `Could not save Client ID ${row.client_id}.`,
        });
    }
  }
  skipped.sort((a, b) => a.line - b.line);

  await logActivity(me.id, "attendees_imported", { added, skipped: skipped.length });
  return { status: "done", added, skipped };
}
