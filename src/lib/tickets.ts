// The ticket rule (CLAUDE.md section 5), decided by the boss to use NET DEPOSIT
// (deposits minus withdrawals), not balance or equity: 1 ticket per $100, rounded
// down to the nearest $100, up to 10 tickets at $1,000 or more. Under $100, zero
// or negative is not eligible. Used by the CRM lookup, which turns a net deposit
// into this result and then discards the figure: it is never stored or sent to
// the browser.

export const TICKET_STEP_USD = 100;
export const MAX_TICKETS = 10;

export function ticketsForNetDeposit(netDepositUsd: number): { eligible: boolean; tickets: number } {
  const tickets = Number.isFinite(netDepositUsd) ? Math.min(MAX_TICKETS, Math.floor(netDepositUsd / TICKET_STEP_USD)) : 0;
  return tickets >= 1 ? { eligible: true, tickets } : { eligible: false, tickets: 0 };
}
