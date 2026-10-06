import { describe, expect, it } from "vitest";
import { filterAttendees, summarize, type AttendeeRow } from "./attendees";

const row = (seq: number, over: Partial<AttendeeRow>): AttendeeRow => ({
  id: `id${seq}`,
  seq,
  client_id: `C${seq}`,
  name: `Person ${seq}`,
  email: `p${seq}@example.com`,
  phone: "+2348031234567",
  eligible: false,
  tickets: 0,
  registered_by: "eniola",
  created_at: "2026-11-14T08:00:00Z",
  ...over,
});

const rows = [
  row(1, { name: "Ada Obi", eligible: true, tickets: 3 }),
  row(2, { name: "Tunde Bakare", client_id: "10517", registered_by: "chioma" }),
  row(3, { name: "Ngozi Eze", email: "NGOZI@Mail.com", eligible: true, tickets: 10, registered_by: "chioma" }),
];
const all = { query: "", eligibleOnly: false, registeredBy: null };

describe("filterAttendees", () => {
  it("returns everyone with no filters", () => {
    expect(filterAttendees(rows, all)).toHaveLength(3);
  });

  it("searches name, email and Client ID, ignoring case and spaces", () => {
    expect(filterAttendees(rows, { ...all, query: " ada " }).map((r) => r.seq)).toEqual([1]);
    expect(filterAttendees(rows, { ...all, query: "ngozi@mail" }).map((r) => r.seq)).toEqual([3]);
    expect(filterAttendees(rows, { ...all, query: "1051" }).map((r) => r.seq)).toEqual([2]);
    expect(filterAttendees(rows, { ...all, query: "nobody" })).toEqual([]);
  });

  it("combines Eligible only and Registered by", () => {
    expect(filterAttendees(rows, { ...all, eligibleOnly: true }).map((r) => r.seq)).toEqual([1, 3]);
    expect(filterAttendees(rows, { ...all, registeredBy: "chioma" }).map((r) => r.seq)).toEqual([2, 3]);
    expect(filterAttendees(rows, { ...all, eligibleOnly: true, registeredBy: "chioma" }).map((r) => r.seq)).toEqual([3]);
  });
});

describe("summarize", () => {
  it("counts attendees, eligible clients and Grand Draw tickets", () => {
    expect(summarize(rows)).toEqual({ total: 3, eligible: 2, tickets: 13 });
    expect(summarize([])).toEqual({ total: 0, eligible: 0, tickets: 0 });
  });
});
