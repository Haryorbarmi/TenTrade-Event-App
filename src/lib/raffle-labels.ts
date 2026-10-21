// Shared by the server (lib/raffle.ts) and the Raffle page. Kept separate
// because lib/raffle.ts uses node:crypto and cannot load in the browser.

// Winners cancelled by "Reset this draw" are stored as replaced, kind "other",
// with this prefix on the reason.
export const RESET_PREFIX = "Draw reset: ";

// Dropdown value for the Tenedge 5k page: winners are typed in for the projector, not drawn.
export const TENEDGE_5K = "tenedge_5k";
