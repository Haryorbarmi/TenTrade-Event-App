import "server-only";
import { fakeLookup } from "./fake-clients";
import type { ClientLookup } from "./types";

// CRM lookup by Client ID (CLAUDE.md section 10), behind one switch so the app
// can go back to fully manual entry at any time:
//
//   CRM_LOOKUP=off   (or unset, or anything else): no lookup, registrars type everything in.
//   CRM_LOOKUP=fake  made-up clients (see fake-clients.ts), for building and rehearsing.
//
// There is no "live" mode yet: FXBO has no public API docs and nothing is built
// against a guessed endpoint. A real version would be added here and must turn
// any balance into eligible + tickets with ticketsForBalance(), then discard it:
// a balance must never reach the browser, the database, logs or exports.

export type { ClientLookup } from "./types";

export type CrmMode = "off" | "fake";

export function crmMode(): CrmMode {
  return process.env.CRM_LOOKUP === "fake" ? "fake" : "off";
}

export async function lookupClient(clientId: string): Promise<ClientLookup> {
  if (crmMode() === "fake") return fakeLookup(clientId.trim());
  return { found: false };
}
