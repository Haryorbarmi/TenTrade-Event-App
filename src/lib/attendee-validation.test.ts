import { describe, expect, it } from "vitest";
import { validateAttendee, type AttendeeInput } from "./attendee-validation";

const valid: AttendeeInput = {
  clientId: " 100234 ",
  name: "  Ada   Obi ",
  eligible: true,
  tickets: 3,
};

describe("validateAttendee", () => {
  it("cleans a valid entry", () => {
    expect(validateAttendee(valid)).toEqual({
      data: { client_id: "100234", name: "Ada Obi", eligible: true, tickets: 3 },
    });
  });

  it("requires every field", () => {
    const result = validateAttendee({ clientId: "", name: "", eligible: null, tickets: 0 });
    expect("errors" in result && Object.keys(result.errors).sort()).toEqual(["clientId", "eligible", "name"]);
  });

  it("requires a Client ID of exactly 6 digits", () => {
    for (const bad of ["10023", "1002345", "10O234", "100-234", "ABC123"]) {
      const result = validateAttendee({ ...valid, clientId: bad });
      expect("errors" in result && result.errors.clientId, bad).toMatch(/exactly 6 digits/);
    }
    expect("data" in validateAttendee({ ...valid, clientId: " 012345 " })).toBe(true); // leading zero kept, spaces trimmed
  });

  it("needs 1 to 10 tickets when eligible", () => {
    for (const tickets of [0, 11, 2.5]) {
      const result = validateAttendee({ ...valid, tickets });
      expect("errors" in result && result.errors.tickets).toBeTruthy();
    }
  });

  it("forces 0 tickets when not eligible", () => {
    const result = validateAttendee({ ...valid, eligible: false, tickets: 7 });
    expect("data" in result && result.data.tickets).toBe(0);
  });
});
