import "server-only";

// CRM lookup by Client ID (CLAUDE.md section 10). FXBO has no public API docs,
// so this returns "not found" and the registrar types everything in.
// A future FXBO version fills the same fields. If the CRM returns a balance,
// convert it to eligible + tickets here and discard it: it must never reach
// the browser.

export type ClientLookup =
  | { found: false }
  | {
      found: true;
      name: string;
      eligible?: boolean;
      tickets?: number;
    };

export async function lookupClient(clientId: string): Promise<ClientLookup> {
  void clientId;
  return { found: false };
}
