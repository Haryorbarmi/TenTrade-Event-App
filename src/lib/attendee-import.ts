// TESTING ONLY: bulk-import attendees from a spreadsheet (Super Admin).
// Every row goes through the same rules as the registration form.

import { validateAttendee, type CleanAttendee } from "./attendee-validation";

export const MAX_IMPORT_ROWS = 1000;

// Cells as read from the file; empty cells are "".
export type SheetRow = { line: number; cells: Record<string, string> };

export type ImportPlan = {
  rows: CleanAttendee[];
  skipped: { line: number; reason: string }[];
  lineOf: Record<string, number>; // Client ID -> spreadsheet line, for reporting save failures
};

// Minimal CSV reader that keeps every value as text (so Client IDs and phone
// numbers never lose leading zeros). Handles a BOM, CRLF and quoted fields.
export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      out.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    out.push(row);
  }
  return out.filter((r) => r.some((c) => c.trim() !== ""));
}

// "Client ID", "client_id" and "ClientID" are all the same column.
const key = (h: string) => h.replace(/^﻿/, "").toLowerCase().replace(/[^a-z0-9]/g, "");

const ALIASES: Record<"clientId" | "name" | "email" | "phone" | "eligible" | "tickets", string[]> = {
  clientId: ["clientid", "client", "id"],
  name: ["name", "fullname"],
  email: ["email", "emailaddress"],
  phone: ["phone", "phonenumber", "mobile"],
  eligible: ["granddraw", "eligible", "eligibility"],
  tickets: ["tickets", "ticket", "raffletickets"],
};

type Field = keyof typeof ALIASES;

// Turns a table (first row = headers) into sheet rows keyed by field.
export function tableToRows(table: string[][]): { rows: SheetRow[] } | { error: string } {
  if (table.length === 0) return { error: "The file is empty." };
  const headers = table[0].map(key);
  const col = {} as Record<Field, number>;
  for (const f of Object.keys(ALIASES) as Field[]) col[f] = headers.findIndex((h) => ALIASES[f].includes(h));

  const missing = (["clientId", "name", "email", "phone"] as const).filter((f) => col[f] < 0);
  if (missing.length > 0) {
    const label = { clientId: "Client ID", name: "Name", email: "Email", phone: "Phone" } as const;
    return { error: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.map((m) => label[m]).join(", ")}. The first row must have the headings.` };
  }
  const get = (r: string[], f: Field) => (col[f] >= 0 ? (r[col[f]] ?? "").trim() : "");
  return {
    rows: table.slice(1).map((r, i) => ({
      line: i + 2,
      cells: Object.fromEntries((Object.keys(ALIASES) as Field[]).map((f) => [f, get(r, f)])),
    })),
  };
}

function parseEligible(v: string): boolean | null {
  const s = v.toLowerCase().replace(/[^a-z]/g, "");
  if (["eligible", "yes", "y", "true"].includes(s)) return true;
  if (["noteligible", "ineligible", "no", "n", "false"].includes(s)) return false;
  return null;
}

// Phone cells saved as numbers lose their leading 0 (8031234567); put it back.
const fixPhone = (p: string) => (/^[789]\d{9}$/.test(p) ? `0${p}` : p);
// Same for Client IDs that start with 0.
const fixClientId = (c: string) => (/^\d{1,5}$/.test(c) ? c.padStart(6, "0") : c);

// Missing Grand Draw / Tickets are filled at random so the raffle has data to
// test with: about 70% eligible, 1 to 10 tickets each.
export function planImport(rows: SheetRow[], existingClientIds: Set<string>, random: () => number = Math.random): ImportPlan {
  const plan: ImportPlan = { rows: [], skipped: [], lineOf: {} };
  const seen = new Set<string>();
  const randomTickets = () => 1 + Math.floor(random() * 10);

  for (const { line, cells } of rows) {
    let eligible = parseEligible(cells.eligible);
    if (eligible === null) eligible = random() < 0.7;
    const ticketsGiven = Number(cells.tickets);
    const tickets = eligible ? (cells.tickets !== "" && Number.isInteger(ticketsGiven) ? ticketsGiven : randomTickets()) : 0;

    const result = validateAttendee({
      clientId: fixClientId(cells.clientId),
      name: cells.name,
      email: cells.email,
      phone: fixPhone(cells.phone),
      eligible,
      tickets,
    });
    if ("errors" in result) {
      plan.skipped.push({ line, reason: Object.values(result.errors)[0]! });
      continue;
    }
    const id = result.data.client_id;
    if (existingClientIds.has(id)) plan.skipped.push({ line, reason: `Client ID ${id} is already registered.` });
    else if (seen.has(id)) plan.skipped.push({ line, reason: `Client ID ${id} appears twice in the file.` });
    else {
      seen.add(id);
      plan.lineOf[id] = line;
      plan.rows.push(result.data);
    }
  }
  return plan;
}
