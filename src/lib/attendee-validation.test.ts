import { describe, expect, it } from "vitest";
import { normalizeNigerianPhone, validateAttendee, type AttendeeInput } from "./attendee-validation";

const valid: AttendeeInput = {
  clientId: " 100234 ",
  name: "  Ada   Obi ",
  email: " Ada@Example.com ",
  phone: "0803 123 4567",
  eligible: true,
  tickets: 3,
};

describe("normalizeNigerianPhone", () => {
  it("accepts local and +234 formats", () => {
    expect(normalizeNigerianPhone("08031234567")).toBe("+2348031234567");
    expect(normalizeNigerianPhone("0803 123 4567")).toBe("+2348031234567");
    expect(normalizeNigerianPhone("+234 803 123 4567")).toBe("+2348031234567");
    expect(normalizeNigerianPhone("234-803-123-4567")).toBe("+2348031234567");
    expect(normalizeNigerianPhone("09012345678")).toBe("+2349012345678");
    expect(normalizeNigerianPhone("07012345678")).toBe("+2347012345678");
  });

  it("rejects wrong lengths and non-mobile numbers", () => {
    expect(normalizeNigerianPhone("0803123456")).toBeNull();
    expect(normalizeNigerianPhone("080312345678")).toBeNull();
    expect(normalizeNigerianPhone("01234567890")).toBeNull();
    expect(normalizeNigerianPhone("+44 7700 900123")).toBeNull();
    expect(normalizeNigerianPhone("abc")).toBeNull();
  });
});

describe("validateAttendee", () => {
  it("cleans a valid entry", () => {
    expect(validateAttendee(valid)).toEqual({
      data: { client_id: "100234", name: "Ada Obi", email: "ada@example.com", phone: "+2348031234567", eligible: true, tickets: 3 },
    });
  });

  it("requires every field", () => {
    const result = validateAttendee({ clientId: "", name: "", email: "", phone: "", eligible: null, tickets: 0 });
    expect("errors" in result && Object.keys(result.errors).sort()).toEqual(["clientId", "eligible", "email", "name", "phone"]);
  });

  it("checks email and phone formats", () => {
    const result = validateAttendee({ ...valid, email: "ada@", phone: "12345" });
    expect("errors" in result && result.errors).toMatchObject({ email: expect.any(String), phone: expect.any(String) });
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
