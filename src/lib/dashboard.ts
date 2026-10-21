// Dashboard numbers (CLAUDE.md section 5), all computed from real data.

import { prizeAt, type PrizeDraw } from "./prizes";

export const SLOT_MINUTES = 10;
const SLOT_MS = SLOT_MINUTES * 60_000;

export type Slot = { start: number; count: number }; // start: epoch ms of the 10-minute slot

// Arrivals per 10-minute slot, from the first arrival to the last, including
// empty slots so the chart shows quiet periods too. Slots align to the clock
// (9:00, 9:10, ...); Lagos is UTC+1 with no DST, so UTC alignment matches WAT.
export function arrivalSlots(createdAt: string[]): Slot[] {
  if (createdAt.length === 0) return [];
  const times = createdAt.map((t) => new Date(t).getTime());
  const first = Math.floor(Math.min(...times) / SLOT_MS) * SLOT_MS;
  const last = Math.floor(Math.max(...times) / SLOT_MS) * SLOT_MS;
  const slots: Slot[] = [];
  for (let start = first; start <= last; start += SLOT_MS) slots.push({ start, count: 0 });
  for (const t of times) slots[Math.floor((t - first) / SLOT_MS)]!.count++;
  return slots;
}

// The busiest slot (the earliest one if tied), or null with no arrivals.
export function peakSlot(slots: Slot[]): (Slot & { end: number }) | null {
  let best: Slot | null = null;
  for (const s of slots) if (!best || s.count > best.count) best = s;
  return best ? { ...best, end: best.start + SLOT_MS } : null;
}

export type DrawSummaryInput = PrizeDraw & { status: "open" | "locked" | "done" };

// Draws done, and money awarded so far: each current winner gets the prize for their
// position (see prizes.ts).
export function drawProgress(draws: (DrawSummaryInput & { winnerPositions: number[] })[]) {
  return {
    done: draws.filter((d) => d.status === "done").length,
    total: draws.length,
    awarded: draws.reduce((sum, d) => sum + d.winnerPositions.reduce((s, p) => s + prizeAt(d, p), 0), 0),
  };
}
