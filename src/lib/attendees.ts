// Attendee row shapes shared by server pages and live client components.

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
