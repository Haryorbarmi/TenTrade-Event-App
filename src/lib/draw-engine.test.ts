import { describe, expect, it } from "vitest";
import {
  buildPool,
  ownerOfEntry,
  pickWinner,
  secureRandomInt,
  totalEntries,
  type PoolCandidate,
  type PoolEntry,
} from "./draw-engine";

const person = (seq: number, eligible = false, tickets = 0): PoolCandidate => ({
  id: `a${seq}`,
  seq,
  client_id: `C${seq}`,
  eligible,
  tickets,
});

// 60 arrivals: every 3rd is eligible with (seq % 10) + 1 tickets.
const attendees = Array.from({ length: 60 }, (_, i) => {
  const seq = i + 1;
  return seq % 3 === 0 ? person(seq, true, (seq % 10) + 1) : person(seq);
});
const none = { winnerIds: new Set<string>() };
const ids = (pool: PoolEntry[]) => pool.map((e) => e.seq);

describe("buildPool", () => {
  it("Grand Draw: eligible clients only, weighted by tickets", () => {
    const pool = buildPool("grand", attendees, none);
    expect(pool).toHaveLength(20);
    expect(pool.every((e) => attendees.find((a) => a.id === e.attendee_id)!.eligible)).toBe(true);
    expect(pool.find((e) => e.seq === 9)!.weight).toBe(10);
    expect(pool.find((e) => e.seq === 30)!.weight).toBe(1);
  });

  it("Early Bird: arrival numbers 1 to 50 regardless of eligibility, 1 entry each", () => {
    const pool = buildPool("early_bird", attendees, none);
    expect(ids(pool)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    expect(pool.every((e) => e.weight === 1)).toBe(true);
  });

  it("Early Bird does not extend past 50 when one of the first 50 already won", () => {
    const pool = buildPool("early_bird", attendees, { winnerIds: new Set(["a7"]) });
    expect(pool).toHaveLength(49);
    expect(ids(pool)).not.toContain(7);
    expect(Math.max(...ids(pool))).toBe(50);
  });

  it("Lucky Attendee: everyone checked in, 1 entry each", () => {
    expect(buildPool("lucky", attendees, none)).toHaveLength(60);
  });

  it("Event Engagement: tagged participants only", () => {
    const pool = buildPool("engagement", attendees, { ...none, participantIds: new Set(["a2", "a55", "a3"]) });
    expect(ids(pool)).toEqual([2, 3, 55]);
  });

  it("Knowledge Challenge tie-break: only the tied clients", () => {
    const pool = buildPool("knowledge", attendees, { ...none, tiedIds: new Set(["a10", "a4"]) });
    expect(ids(pool)).toEqual([4, 10]);
  });

  it("one prize per attendee: previous winners are removed from every draw", () => {
    const winnerIds = new Set(["a3", "a9", "a12"]);
    for (const type of ["grand", "early_bird", "lucky", "engagement", "knowledge"] as const) {
      const pool = buildPool(type, attendees, {
        winnerIds,
        participantIds: new Set(["a3", "a4"]),
        tiedIds: new Set(["a9", "a5"]),
      });
      expect(pool.some((e) => winnerIds.has(e.attendee_id))).toBe(false);
    }
  });

  it("is sorted by arrival number whatever the input order", () => {
    const pool = buildPool("lucky", [...attendees].reverse(), none);
    expect(ids(pool)).toEqual([...ids(pool)].sort((a, b) => a - b));
  });
});

describe("pickWinner", () => {
  const pool: PoolEntry[] = [
    { attendee_id: "x", seq: 1, client_id: "X", weight: 1 }, // entry 0
    { attendee_id: "y", seq: 2, client_id: "Y", weight: 3 }, // entries 1-3
    { attendee_id: "z", seq: 3, client_id: "Z", weight: 6 }, // entries 4-9
  ];

  it("maps each entry number to the right owner, including the boundaries", () => {
    const at = (r: number) => pickWinner(pool, () => r).winner.attendee_id;
    expect([0, 1, 3, 4, 9].map(at)).toEqual(["x", "y", "y", "z", "z"]);
  });

  it("records the audit values", () => {
    expect(pickWinner(pool, () => 5)).toMatchObject({ randomValue: 5, poolSize: 3, totalTickets: 10 });
  });

  it("rejects an empty pool and out-of-range randomness", () => {
    expect(() => pickWinner([])).toThrow(/empty/);
    expect(() => pickWinner(pool, () => 10)).toThrow(/outside/);
    expect(() => pickWinner(pool, () => -1)).toThrow(/outside/);
  });

  it("a saved random value always re-checks to the same winner", () => {
    const result = pickWinner(pool);
    expect(ownerOfEntry(pool, result.randomValue)).toEqual(result.winner);
  });
});

describe("secureRandomInt", () => {
  it("stays inside [0, max)", () => {
    for (let i = 0; i < 10_000; i++) {
      const r = secureRandomInt(7);
      expect(r >= 0 && r < 7 && Number.isInteger(r)).toBe(true);
    }
  });
});

// CLAUDE.md phase 3 check: simulate 100,000 weighted draws, confirm the results
// match the ticket proportions, and that a 1-ticket client can win.
describe("Grand Draw fairness (100,000 simulated draws)", () => {
  const tickets = [1, 2, 3, 5, 10, 1, 4, 7, 10, 1];
  const pool: PoolEntry[] = tickets.map((t, i) => ({ attendee_id: `p${i}`, seq: i + 1, client_id: `P${i}`, weight: t }));
  const total = totalEntries(pool); // 44
  const N = 100_000;
  const wins = new Map<string, number>();
  for (let i = 0; i < N; i++) {
    const id = pickWinner(pool).winner.attendee_id;
    wins.set(id, (wins.get(id) ?? 0) + 1);
  }

  it("each client's share matches tickets / total within 5 standard deviations", () => {
    for (const e of pool) {
      const p = e.weight / total;
      const expected = N * p;
      const sd = Math.sqrt(N * p * (1 - p));
      const got = wins.get(e.attendee_id) ?? 0;
      expect(Math.abs(got - expected), `${e.client_id}: ${got} vs ${expected.toFixed(0)}`).toBeLessThan(5 * sd);
    }
  });

  it("1-ticket clients win, and 10 tickets is about ten times 1 ticket", () => {
    const oneTicket = ["p0", "p5", "p9"].map((id) => wins.get(id) ?? 0);
    const tenTicket = ["p4", "p8"].map((id) => wins.get(id) ?? 0);
    expect(Math.min(...oneTicket)).toBeGreaterThan(0);
    const ratio = tenTicket.reduce((a, b) => a + b) / 2 / (oneTicket.reduce((a, b) => a + b) / 3);
    expect(ratio).toBeGreaterThan(9);
    expect(ratio).toBeLessThan(11);
  });

  it("prints the results table", () => {
    const rows = pool.map((e) => {
      const got = wins.get(e.attendee_id) ?? 0;
      return `${e.client_id.padEnd(4)} ${String(e.weight).padStart(2)} tickets  expected ${((100 * e.weight) / total).toFixed(2).padStart(5)}%  got ${((100 * got) / N).toFixed(2).padStart(5)}%`;
    });
    console.log(`\nGrand Draw simulation, ${N.toLocaleString()} draws, ${total} entries:\n${rows.join("\n")}`);
  });
});
