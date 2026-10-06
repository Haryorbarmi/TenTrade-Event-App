// Shared by the server (lib/raffle.ts) and the Raffle page. Kept separate
// because lib/raffle.ts uses node:crypto and cannot load in the browser.

// Winners cancelled by "Reset this draw" are stored as replaced, kind "other",
// with this prefix on the reason.
export const RESET_PREFIX = "Draw reset: ";
