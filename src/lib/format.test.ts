import { describe, expect, it } from "vitest";
import { formatLagosTime, formatPhone, shortName } from "./format";

describe("formatPhone", () => {
  it("spaces out stored Nigerian numbers", () => {
    expect(formatPhone("+2348031234567")).toBe("+234 803 123 4567");
    expect(formatPhone("something else")).toBe("something else");
  });
});

describe("formatLagosTime", () => {
  it("shows Lagos time (UTC+1) regardless of the device timezone", () => {
    expect(formatLagosTime("2026-11-14T08:02:00Z")).toBe("9:02 AM");
    expect(formatLagosTime("2026-11-14T12:30:00Z")).toBe("1:30 PM");
  });
});

describe("shortName", () => {
  it("shortens to first name and last initial", () => {
    expect(shortName("Eniola Oyedele")).toBe("Eniola O.");
    expect(shortName("  Ada  Chioma   Obi ")).toBe("Ada O.");
    expect(shortName("Samuel")).toBe("Samuel");
  });
});
