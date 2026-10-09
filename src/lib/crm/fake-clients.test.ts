import { describe, expect, it } from "vitest";
import { fakeLookup } from "./fake-clients";

describe("fakeLookup", () => {
  it("is predictable: ending in 0 is not found, ending in 9 is an outage", () => {
    expect(fakeLookup("123450")).toEqual({ found: false });
    expect(fakeLookup("123459")).toEqual({ found: false, unavailable: true });
  });

  it("returns a name and a valid eligibility/ticket result, never a financial figure", () => {
    for (let n = 100001; n < 100400; n++) {
      const r = fakeLookup(String(n));
      if (!r.found) continue;
      expect(Object.keys(r).sort()).toEqual(["eligible", "found", "name", "tickets"]);
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.eligible ? r.tickets >= 1 && r.tickets <= 10 : r.tickets === 0).toBe(true);
    }
  });

  it("covers every case a tester needs: not eligible, some tickets, and the 10-ticket cap", () => {
    const results = Array.from({ length: 400 }, (_, i) => fakeLookup(String(100001 + i))).flatMap((r) => (r.found ? [r] : []));
    expect(results.some((r) => !r.eligible)).toBe(true);
    expect(results.some((r) => r.eligible && r.tickets < 10)).toBe(true);
    expect(results.some((r) => r.tickets === 10)).toBe(true);
  });

  it("gives the same answer every time for the same Client ID", () => {
    expect(fakeLookup("104823")).toEqual(fakeLookup("104823"));
  });

  it("does not look up anything that is not a 6-digit Client ID", () => {
    expect(fakeLookup("12345")).toEqual({ found: false });
    expect(fakeLookup("abcdef")).toEqual({ found: false });
  });
});
