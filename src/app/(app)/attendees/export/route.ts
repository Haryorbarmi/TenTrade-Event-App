import ExcelJS from "exceljs";
import { getCurrentProfile } from "@/lib/auth";
import { ATTENDEE_COLUMNS, summarize, type AttendeeRow } from "@/lib/attendees";
import { formatPhone } from "@/lib/format";
import { canExportAttendees } from "@/lib/roles";
import { logActivity } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const lagosDate = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "2-digit", month: "short", year: "numeric" });
const lagosTime = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", hour: "numeric", minute: "2-digit" });
const lagosStamp = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Africa/Lagos",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

// GET /attendees/export: the full attendee list as .xlsx. Super Admin only,
// checked here on the server; registrars get 403 even if they call it directly.
export async function GET() {
  const profile = await getCurrentProfile();
  if (!canExportAttendees(profile)) {
    return new Response("Not allowed: only Super Admins can export the attendee list.", { status: 403 });
  }

  const supabase = await createClient();
  const [{ data: rows, error }, { data: profiles }] = await Promise.all([
    supabase.from("attendees").select(ATTENDEE_COLUMNS).order("seq"),
    supabase.from("profiles").select("id, name"),
  ]);
  if (error || !rows) return new Response("Could not load attendees.", { status: 500 });

  const attendees = rows as AttendeeRow[];
  const names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.name]));
  const totals = summarize(attendees);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TenTrade Lagos Seminar 2026";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Attendees", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "No.", key: "seq", width: 7 },
    { header: "Client ID", key: "client_id", width: 14 },
    { header: "Name", key: "name", width: 28 },
    { header: "Email", key: "email", width: 32 },
    { header: "Phone", key: "phone", width: 18 },
    { header: "Grand Draw", key: "eligible", width: 13 },
    { header: "Tickets", key: "tickets", width: 9 },
    { header: "Registered by", key: "registered_by", width: 20 },
    { header: "Date (WAT)", key: "date", width: 13 },
    { header: "Time (WAT)", key: "time", width: 11 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: "A1", to: "J1" };

  for (const r of attendees) {
    const at = new Date(r.created_at);
    sheet.addRow({
      seq: r.seq,
      client_id: r.client_id,
      name: r.name,
      email: r.email,
      phone: formatPhone(r.phone),
      eligible: r.eligible ? "Eligible" : "Not eligible",
      tickets: r.tickets,
      registered_by: names[r.registered_by] ?? "",
      date: lagosDate.format(at),
      time: lagosTime.format(at),
    });
  }
  // Client IDs stay as text so leading zeros are never lost.
  sheet.getColumn("client_id").numFmt = "@";

  sheet.addRow([]);
  sheet.addRow([`${totals.total} attendees · ${totals.eligible} eligible · ${totals.tickets} tickets in the Grand Draw`]).font = {
    italic: true,
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = lagosStamp.format(new Date()).replace(" ", "-").replace(":", "");
  await logActivity(profile!.id, "export", { rows: attendees.length });

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tentrade-lagos-2026-attendees-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
