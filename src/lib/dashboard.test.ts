import { describe, expect, it } from "vitest";
import { arrivalSlots, drawProgress, peakSlot } from "./dashboard";
import { formatLagosTime } from "./format";

// 08:00Z is 9:00 AM in Lagos.
const at = (hhmm: string) => `2026-11-14T${hhmm}:00Z`;

describe("arrivalSlots", () => {
  it("counts arrivals per 10-minute slot, aligned to the clock, with empty slots kept", () => {
    const slots = arrivalSlots([at("08:02"), at("08:09"), at("08:31"), at("08:12"), at("08:35"), at("08:39")]);
    expect(slots.map((s) => formatLagosTime(new Date(s.start).toISOString()))).toEqual(["9:00 AM", "9:10 AM", "9:20 AM", "9:30 AM"]);
    expect(slots.map((s) => s.count)).toEqual([2, 1, 0, 3]);
  });

  it("is empty with no arrivals", () => {
    expect(arrivalSlots([])).toEqual([]);
  });
});

describe("peakSlot", () => {
  it("finds the busiest slot, earliest on a tie, with its end time", () => {
    const peak = peakSlot(arrivalSlots([at("08:02"), at("08:05"), at("08:31"), at("08:33")]))!;
    expect(peak.count).toBe(2);
    expect(formatLagosTime(new Date(peak.start).toISOString())).toBe("9:00 AM");
    expect(formatLagosTime(new Date(peak.end).toISOString())).toBe("9:10 AM");
    expect(peakSlot([])).toBeNull();
  });
});

describe("drawProgress", () => {
  it("counts finished draws and money awarded per current winner", () => {
    const p = drawProgress([
      { status: "done", prize_amount: 500, winners_count: 1, currentWinners: 1 }, // Early Bird
      { status: "locked", prize_amount: 250, winners_count: 5, currentWinners: 2 }, // Engagement, 2 of 5 so far
      { status: "open", prize_amount: 1000, winners_count: 1, currentWinners: 0 },
    ]);
    expect(p).toEqual({ done: 1, total: 3, awarded: 600 });
  });
});
