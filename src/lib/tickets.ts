// The ticket rule (CLAUDE.md section 5): 1 ticket per $100 in the account, rounded
// down to the nearest $100, up to 10 tickets at $1,000 or more. Under $100 is
// not eligible. Used by the CRM lookup, which turns a balance into this result
// and then discards the balance: balances are never stored or sent to the browser.

export const TICKET_STEP_USD = 100;
export const MAX_TICKETS = 10;

export function ticketsForBalance(balanceUsd: number): { eligible: boolean; tickets: number } {
  const tickets = Number.isFinite(balanceUsd) ? Math.min(MAX_TICKETS, Math.floor(balanceUsd / TICKET_STEP_USD)) : 0;
  return tickets >= 1 ? { eligible: true, tickets } : { eligible: false, tickets: 0 };
}
