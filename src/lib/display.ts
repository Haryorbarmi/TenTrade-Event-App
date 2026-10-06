// Projector display (CLAUDE.md section 8). The display only ever shows what the
// admin screen sends it: Client IDs for the shuffle, and the winner's Client ID
// and name. Never email or phone.

export type DisplayPoolEntry = { id: string; w: number }; // Client ID and its weight (tickets in the Grand Draw)

export type DisplayState =
  | { kind: "waiting" }
  | { kind: "countdown"; label: string; seconds: number }
  | { kind: "shuffling"; label: string; pool: DisplayPoolEntry[]; winner: { clientId: string; name: string } }
  | { kind: "winner"; label: string; clientId: string; name: string };

export const SHUFFLE_MS = 6000; // whole shuffle, including the settle
export const SETTLE_MS = 2000; // last 2 seconds: digits settle left to right
export const SHUFFLE_TICK_MS = 90;

// Short names used on the projector ("WINNER · GRAND DRAW").
export const DISPLAY_LABELS: Record<string, string> = {
  grand: "Grand Draw",
  early_bird: "Early Bird",
  lucky: "Lucky Attendee",
  engagement: "Event Engagement",
  knowledge: "Knowledge Challenge",
};

// One entry per ticket, so clients with more tickets appear more often in the
// shuffle (Grand Draw). Purely visual: the winner is already chosen on the server.
export function expandPool(pool: DisplayPoolEntry[]): string[] {
  return pool.flatMap((e) => Array.from({ length: Math.max(1, e.w) }, () => e.id));
}

const DIGITS = "0123456789";

// What the digit boxes show `elapsed` ms into the shuffle. The whole ID changes
// in place; in the last SETTLE_MS the boxes lock onto the winner left to right.
export function shuffleFrame(ids: string[], winner: string, elapsed: number, random: () => number = Math.random): string[] {
  const n = winner.length;
  const settleStart = SHUFFLE_MS - SETTLE_MS;
  const settled =
    elapsed >= SHUFFLE_MS ? n : elapsed <= settleStart ? 0 : Math.min(n, Math.ceil(((elapsed - settleStart) / SETTLE_MS) * n));
  const pick = ids.length ? ids[Math.floor(random() * ids.length)]! : "";
  return Array.from({ length: n }, (_, i) => (i < settled ? winner[i]! : (pick[i] ?? DIGITS[Math.floor(random() * 10)]!)));
}

// Practice mode: fake 5-digit IDs, never real attendee data.
export function practiceState(step: number, random: () => number = Math.random): DisplayState {
  const fakeId = () => String(10000 + Math.floor(random() * 90000));
  const label = "Practice";
  switch (step % 4) {
    case 0:
      return { kind: "waiting" };
    case 1:
      return { kind: "countdown", label, seconds: 5 };
    case 2: {
      const pool = Array.from({ length: 30 }, () => ({ id: fakeId(), w: 1 + Math.floor(random() * 3) }));
      return { kind: "shuffling", label, pool, winner: { clientId: pool[0]!.id, name: "Practice Winner" } };
    }
    default:
      return { kind: "winner", label, clientId: "12345", name: "Practice Winner" };
  }
}
