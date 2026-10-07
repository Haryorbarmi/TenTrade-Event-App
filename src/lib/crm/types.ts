// What a CRM lookup gives the registration form. Deliberately has no balance:
// the server turns it into eligible + tickets and discards it (CLAUDE.md sections 9 and 10).
export type ClientLookup =
  | { found: true; name: string; eligible: boolean; tickets: number }
  // `unavailable`: the CRM could not be reached (as opposed to the client not existing).
  | { found: false; unavailable?: boolean };
