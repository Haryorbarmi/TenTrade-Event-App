import { describe, expect, it } from "vitest";
import { SETTLE_MS, SHUFFLE_MS, practiceRound, shuffleFrame, shuffleOrder } from "./display";

describe("shuffleOrder", () => {
  it("lists every Client ID in the pool exactly once, whatever its tickets", () => {
    const order = shuffleOrder([
      { id: "104820", w: 3 },
      { id: "105170", w: 1 },
      { id: "105171", w: 10 },
    ]);
    expect([...order].sort()).toEqual(["104820", "105170", "105171"]);
  });

  it("is in a different order from one draw to the next", () => {
    const pool = Array.from({ length: 50 }, (_, i) => ({ id: String(100000 + i), w: 1 }));
    expect(shuffleOrder(pool).join()).not.toBe(shuffleOrder(pool).join());
  });
});

describe("shuffleFrame", () => {
  const order = ["11111", "22222", "33333"];
  const winner = "10482";

  it("shows the next pool ID on each frame, wrapping round", () => {
    const shown = [0, 1, 2, 3, 4].map((f) => shuffleFrame(order, winner, 1000, f).join(""));
    expect(shown).toEqual(["11111", "22222", "33333", "11111", "22222"]);
  });

  it("reads through every ID in the pool well within the 15 seconds", () => {
    // 250 attendees at a slow 30 frames a second: frames available before the settle.
    const pool = Array.from({ length: 250 }, (_, i) => ({ id: String(100000 + i * 3), w: 1 + (i % 10) }));
    const big = shuffleOrder(pool);
    const frames = Math.floor(((SHUFFLE_MS - SETTLE_MS) / 1000) * 30);
    const seen = new Set<string>();
    for (let f = 0; f < frames; f++) seen.add(shuffleFrame(big, "999999", (f / frames) * (SHUFFLE_MS - SETTLE_MS), f).join(""));
    expect(seen.size).toBe(250);
  });

  it("settles left to right during the last 2 seconds", () => {
    const start = SHUFFLE_MS - SETTLE_MS;
    const r = () => 0; // digit fill never needed here: pool IDs are as long as the winner
    expect(shuffleFrame(order, winner, start + SETTLE_MS * 0.2, 0, r).join("")).toBe("11111"); // first box settled on "1"
    expect(shuffleFrame(order, winner, start + SETTLE_MS * 0.4, 0, r).join("")).toBe("10111");
    expect(shuffleFrame(order, winner, start + SETTLE_MS * 0.8, 0, r).join("")).toBe("10481");
  });

  it("always ends exactly on the winner", () => {
    expect(shuffleFrame(order, winner, SHUFFLE_MS, 7).join("")).toBe(winner);
    expect(shuffleFrame(order, winner, SHUFFLE_MS + 5000, 99).join("")).toBe(winner);
  });

  it("fills with digits when pool IDs are shorter than the winner's", () => {
    const frame = shuffleFrame(["12"], "1048200", 0, 0, () => 0);
    expect(frame).toHaveLength(7);
    expect(frame.join("")).toMatch(/^12\d{5}$/);
  });
});

describe("practiceRound", () => {
  it("runs waiting → countdown → shuffling → winner with fake 6-digit IDs only", () => {
    const round = practiceRound();
    expect(round.map((s) => s.kind)).toEqual(["waiting", "countdown", "shuffling", "winner"]);
    const shuffle = round[2]!;
    if (shuffle.kind !== "shuffling") throw new Error("expected shuffling");
    expect(shuffle.winner.name).toBe("Practice Winner");
    expect(shuffle.pool.every((p) => /^\d{6}$/.test(p.id))).toBe(true);
  });

  it("the winner screen shows exactly the ID the shuffle settles on", () => {
    for (let i = 0; i < 20; i++) {
      const [, , shuffle, winner] = practiceRound();
      if (shuffle!.kind !== "shuffling" || winner!.kind !== "winner") throw new Error("unexpected states");
      const settled = shuffleFrame(shuffleOrder(shuffle!.pool), shuffle!.winner.clientId, SHUFFLE_MS, 0).join("");
      expect(winner!.clientId).toBe(settled);
      expect(shuffle!.pool.map((p) => p.id)).toContain(settled); // a real ID from the pool
    }
  });
});
