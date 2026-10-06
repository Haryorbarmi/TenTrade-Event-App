import { describe, expect, it } from "vitest";
import { SETTLE_MS, SHUFFLE_MS, expandPool, practiceState, shuffleFrame } from "./display";

describe("expandPool", () => {
  it("repeats each Client ID once per ticket so bigger holders appear more often", () => {
    const ids = expandPool([
      { id: "10482", w: 3 },
      { id: "10517", w: 1 },
    ]);
    expect(ids.filter((i) => i === "10482")).toHaveLength(3);
    expect(ids.filter((i) => i === "10517")).toHaveLength(1);
  });
});

describe("shuffleFrame", () => {
  const ids = ["11111", "22222", "33333"];
  const winner = "10482";

  it("shows a whole random pool ID (changing in place) before the settle", () => {
    const frame = shuffleFrame(ids, winner, 1000, () => 0.5).join("");
    expect(frame).toBe("22222");
  });

  it("settles left to right during the last 2 seconds", () => {
    const start = SHUFFLE_MS - SETTLE_MS;
    const r = () => 0; // always picks "11111"
    expect(shuffleFrame(ids, winner, start + SETTLE_MS * 0.2, r).join("")).toBe("11111"); // first box settled on "1"
    expect(shuffleFrame(ids, winner, start + SETTLE_MS * 0.4, r).join("")).toBe("10111");
    expect(shuffleFrame(ids, winner, start + SETTLE_MS * 0.8, r).join("")).toBe("10481");
  });

  it("always ends exactly on the winner", () => {
    expect(shuffleFrame(ids, winner, SHUFFLE_MS).join("")).toBe(winner);
    expect(shuffleFrame(ids, winner, SHUFFLE_MS + 5000).join("")).toBe(winner);
  });

  it("fills with digits when pool IDs are shorter than the winner's", () => {
    const frame = shuffleFrame(["12"], "1048200", 0, () => 0);
    expect(frame).toHaveLength(7);
    expect(frame.join("")).toMatch(/^12\d{5}$/);
  });
});

describe("practiceState", () => {
  it("cycles waiting → countdown → shuffling → winner with fake data only", () => {
    expect([0, 1, 2, 3, 4].map((s) => practiceState(s).kind)).toEqual(["waiting", "countdown", "shuffling", "winner", "waiting"]);
    const shuffle = practiceState(2);
    if (shuffle.kind !== "shuffling") throw new Error("expected shuffling");
    expect(shuffle.winner.name).toBe("Practice Winner");
    expect(shuffle.pool.every((p) => /^\d{5}$/.test(p.id))).toBe(true);
  });
});
