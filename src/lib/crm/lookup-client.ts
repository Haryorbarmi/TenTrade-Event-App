import "server-only";
import { fakeLookup } from "./fake-clients";
import { rosterLookup } from "./roster-lookup";
import type { ClientLookup } from "./types";

// Client lookup by Client ID (CLAUDE.md section 10), behind one switch so the app
// can go back to fully manual entry at any time:
//
//   CRM_LOOKUP unset (default) or "roster": look the Client ID up in the imported
//                    client roster (Client roster page). An empty roster finds nothing,
//                    so the form just stays manual.
//   CRM_LOOKUP=fake  made-up clients (see fake-clients.ts), for rehearsing.
//   CRM_LOOKUP=off   no lookup, registrars type everything in.
//
// The roster lookup turns the client's ACCOUNT BALANCE into eligible + tickets with
// ticketsForBalance(), then discards it: no financial figure may reach the
// browser, logs or exports.

export type { ClientLookup } from "./types";

export type CrmMode = "off" | "fake" | "roster";

export function crmMode(): CrmMode {
  const v = process.env.CRM_LOOKUP;
  if (v === "off" || v === "fake") return v;
  return "roster";
}

export async function lookupClient(clientId: string): Promise<ClientLookup> {
  const id = clientId.trim();
  const mode = crmMode();
  if (mode === "fake") return fakeLookup(id);
  if (mode === "roster") return rosterLookup(id);
  return { found: false };
}
