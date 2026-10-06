// Dashboard numbers (CLAUDE.md section 5), all computed from real data.

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

export type DrawSummaryInput = { status: "open" | "locked" | "done"; prize_amount: number; winners_count: number };

// Draws done, and money awarded so far: each current winner gets the draw's
// prize divided by its number of winners (Event Engagement: $250 / 5 = $50 each).
export function drawProgress(draws: (DrawSummaryInput & { currentWinners: number })[]) {
  return {
    done: draws.filter((d) => d.status === "done").length,
    total: draws.length,
    awarded: draws.reduce((sum, d) => sum + (d.prize_amount / d.winners_count) * d.currentWinners, 0),
  };
}
