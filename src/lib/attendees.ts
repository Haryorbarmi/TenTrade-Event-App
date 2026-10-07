// Attendee row shapes and list logic shared by server pages and live client components.

export type RecentRow = {
  id: string;
  seq: number;
  client_id: string;
  name: string;
  eligible: boolean;
  tickets: number;
  registered_by: string;
  created_at: string;
};

export const RECENT_LIMIT = 10;
export const RECENT_COLUMNS = "id, seq, client_id, name, eligible, tickets, registered_by, created_at";

// Only the Client ID and name are recorded about a person: no email or phone.
export type AttendeeRow = RecentRow;
export const ATTENDEE_COLUMNS = RECENT_COLUMNS;

export type AttendeeFilter = {
  query: string;
  eligibleOnly: boolean;
  registeredBy: string | null; // profile id, or null for everyone
};

// Search by name or Client ID (CLAUDE.md section 5), case-insensitive.
export function filterAttendees<T extends AttendeeRow>(rows: T[], filter: AttendeeFilter): T[] {
  const q = filter.query.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (!filter.eligibleOnly || r.eligible) &&
      (!filter.registeredBy || r.registered_by === filter.registeredBy) &&
      (!q || r.name.toLowerCase().includes(q) || r.client_id.toLowerCase().includes(q)),
  );
}

// Totals for the whole event, used in the footer and the "Eligible only" chip.
export function summarize(rows: { eligible: boolean; tickets: number }[]) {
  const eligible = rows.filter((r) => r.eligible);
  return {
    total: rows.length,
    eligible: eligible.length,
    tickets: eligible.reduce((sum, r) => sum + r.tickets, 0),
  };
}
