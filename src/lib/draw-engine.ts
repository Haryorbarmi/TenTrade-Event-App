// Draw engine (CLAUDE.md section 7). Pure logic: who is in each draw's pool and
// how a winner is picked. Server-side only (uses node:crypto); the browser
// animation never decides anything.

import { randomInt } from "node:crypto";

export type DrawType = "grand" | "early_bird" | "lucky" | "engagement" | "knowledge";

export const EARLY_BIRD_LIMIT = 50;

export type PoolCandidate = {
  id: string;
  seq: number;
  client_id: string;
  eligible: boolean;
  tickets: number;
};

// One entry in a locked pool snapshot. `weight` is the number of entries the
// person has in the draw: their tickets for the Grand Draw, otherwise 1.
export type PoolEntry = {
  attendee_id: string;
  seq: number;
  client_id: string;
  weight: number;
};

export type PoolContext = {
  winnerIds: ReadonlySet<string>; // everyone who already holds a prize (not replaced)
  participantIds?: ReadonlySet<string>; // Event Engagement tags
  tiedIds?: ReadonlySet<string>; // Knowledge Challenge tie-break
};

// Who may win a given draw. Previous winners are always removed: one prize per attendee.
// The result is sorted by arrival number so a snapshot always replays the same way.
export function buildPool(type: DrawType, attendees: PoolCandidate[], ctx: PoolContext): PoolEntry[] {
  const rule: (a: PoolCandidate) => boolean = {
    grand: (a: PoolCandidate) => a.eligible && a.tickets > 0,
    early_bird: (a: PoolCandidate) => a.seq <= EARLY_BIRD_LIMIT,
    lucky: () => true,
    engagement: (a: PoolCandidate) => !!ctx.participantIds?.has(a.id),
    knowledge: (a: PoolCandidate) => !!ctx.tiedIds?.has(a.id),
  }[type];

  return attendees
    .filter((a) => !ctx.winnerIds.has(a.id) && rule(a))
    .sort((a, b) => a.seq - b.seq)
    .map((a) => ({
      attendee_id: a.id,
      seq: a.seq,
      client_id: a.client_id,
      weight: type === "grand" ? a.tickets : 1,
    }));
}

export function totalEntries(pool: PoolEntry[]): number {
  return pool.reduce((sum, e) => sum + e.weight, 0);
}

// Uniform integer in [0, max). node:crypto randomInt is a CSPRNG and uses
// rejection sampling internally, so there is no modulo bias.
export function secureRandomInt(max: number): number {
  return randomInt(max);
}

export type DrawResult = {
  winner: PoolEntry;
  randomValue: number; // the entry number that was picked, saved for the audit
  poolSize: number;
  totalTickets: number;
};

// Every ticket is one entry. Pick entry number r in [0, total), then walk the
// cumulative weights to find whose entry it is. A 1-ticket client can win;
// a 10-ticket client is exactly ten times as likely.
export function pickWinner(pool: PoolEntry[], random: (max: number) => number = secureRandomInt): DrawResult {
  const total = totalEntries(pool);
  if (pool.length === 0 || total === 0) throw new Error("The pool is empty: there is nobody left to draw.");

  const r = random(total);
  if (!Number.isInteger(r) || r < 0 || r >= total) throw new Error(`Random value ${r} is outside [0, ${total}).`);

  return { winner: ownerOfEntry(pool, r)!, randomValue: r, poolSize: pool.length, totalTickets: total };
}

// Who holds entry number r in a pool. Lets anyone re-check a saved result.
export function ownerOfEntry(pool: PoolEntry[], r: number): PoolEntry | undefined {
  let cumulative = 0;
  for (const entry of pool) {
    cumulative += entry.weight;
    if (r < cumulative) return entry;
  }
  return undefined;
}
