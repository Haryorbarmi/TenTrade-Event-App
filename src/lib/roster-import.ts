// Client roster import (Super Admin): turns the company's client sheet into
// roster rows. Pure functions, no database. The balance is kept as a number for
// the server to turn into tickets; it never goes to the browser.

import { CLIENT_ID_RE } from "./attendee-validation";

export const MAX_ROSTER_ROWS = 20000;

export type RosterRow = {
  client_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  balance: number;
};

export type RosterPlan = {
  rows: RosterRow[];
  skipped: { line: number; reason: string }[];
};

// "First Name", "first_name" and "FirstName" are all the same column.
const key = (h: string) => h.replace(/^﻿/, "").toLowerCase().replace(/[^a-z0-9]/g, "");

const ALIASES = {
  clientId: ["clientid", "crmid", "client", "id", "accountid", "login"],
  firstName: ["firstname", "first", "givenname", "forename"],
  middleName: ["middlename", "middlenames", "middle", "othernames"],
  lastName: ["lastname", "last", "surname", "familyname"],
  balance: ["balance", "accountbalance", "acctbalance", "currentbalance"],
} as const;

type Field = keyof typeof ALIASES;
const LABELS: Record<Field, string> = {
  clientId: "Client ID (CRM ID)",
  firstName: "First Name",
  middleName: "Middle Name",
  lastName: "Last Name",
  balance: "Balance",
};

export type RosterSheetRow = { line: number; cells: Record<Field, string> };

// Turns a table (first row = headings) into sheet rows. Middle Name is optional.
export function rosterTableToRows(table: string[][]): { rows: RosterSheetRow[] } | { error: string } {
  if (table.length === 0) return { error: "The file is empty." };
  const headers = table[0].map(key);
  const col = {} as Record<Field, number>;
  for (const f of Object.keys(ALIASES) as Field[]) col[f] = headers.findIndex((h) => (ALIASES[f] as readonly string[]).includes(h));

  const missing = (["clientId", "firstName", "lastName", "balance"] as const).filter((f) => col[f] < 0);
  if (missing.length > 0)
    return { error: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.map((m) => LABELS[m]).join(", ")}. The first row must have the headings.` };

  const get = (r: string[], f: Field) => (col[f] >= 0 ? (r[col[f]] ?? "").trim() : "");
  return {
    rows: table.slice(1).map((r, i) => ({
      line: i + 2,
      cells: Object.fromEntries((Object.keys(ALIASES) as Field[]).map((f) => [f, get(r, f)])) as Record<Field, string>,
    })),
  };
}

// "$1,250.50", "1 250", "(300)" and "-300" all read as numbers. Anything else is null.
export function parseBalance(v: string): number | null {
  let s = v.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[$€£\s,]/g, "").replace(/^usd/i, "");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? (negative ? -Math.abs(n) : n) : null;
}

// Client IDs that start with 0 lose it when a spreadsheet saves them as numbers.
const fixClientId = (c: string) => (/^\d{1,5}$/.test(c) ? c.padStart(6, "0") : c);
const tidy = (s: string) => s.trim().replace(/\s+/g, " ");

export function planRosterImport(rows: RosterSheetRow[]): RosterPlan {
  const plan: RosterPlan = { rows: [], skipped: [] };
  const seen = new Set<string>();

  for (const { line, cells } of rows) {
    const clientId = fixClientId(cells.clientId.trim());
    const first = tidy(cells.firstName);
    const middle = tidy(cells.middleName);
    const last = tidy(cells.lastName);
    const balance = parseBalance(cells.balance);

    let reason = "";
    if (!CLIENT_ID_RE.test(clientId)) reason = clientId ? `Client ID "${clientId}" is not 6 digits.` : "Client ID is empty.";
    else if (!first) reason = "First Name is empty.";
    else if (!last) reason = "Last Name is empty.";
    else if (balance === null) reason = "Balance is missing or not a number.";
    else if (seen.has(clientId)) reason = `Client ID ${clientId} appears twice in the file.`;
    if (reason) {
      plan.skipped.push({ line, reason });
      continue;
    }
    seen.add(clientId);
    plan.rows.push({ client_id: clientId, first_name: first, middle_name: middle || null, last_name: last, balance: balance! });
  }
  return plan;
}
