// The ticket rule (CLAUDE.md section 5), based on the client's ACCOUNT BALANCE
// (changed from net deposit on 2026-10-13): 1 ticket per $100, rounded down to the
// nearest $100, up to 10 tickets at $1,000 or more. Under $100, zero or negative
// is not eligible. Used by the client lookup, which turns a balance into this
// result; the figure is never sent to the browser.

export const TICKET_STEP_USD = 100;
export const MAX_TICKETS = 10;

export function ticketsForBalance(balanceUsd: number): { eligible: boolean; tickets: number } {
  const tickets = Number.isFinite(balanceUsd) ? Math.min(MAX_TICKETS, Math.floor(balanceUsd / TICKET_STEP_USD)) : 0;
  return tickets >= 1 ? { eligible: true, tickets } : { eligible: false, tickets: 0 };
}
