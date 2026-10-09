import { describe, expect, it } from "vitest";
import { withoutAttendee } from "./attendee-removal";

const snapshot = {
  entries: [
    { attendee_id: "a", seq: 1, client_id: "100001", weight: 3 },
    { attendee_id: "b", seq: 2, client_id: "100002", weight: 5 },
  ],
  total: 8,
};

describe("withoutAttendee", () => {
  it("removes the person and recounts the tickets", () => {
    const result = withoutAttendee(snapshot, "a");
    expect(result.entries.map((e) => e.attendee_id)).toEqual(["b"]);
    expect(result.total).toBe(5);
  });

  it("returns the same snapshot when the person was not in it", () => {
    expect(withoutAttendee(snapshot, "zzz")).toBe(snapshot);
  });

  it("does not change the original", () => {
    withoutAttendee(snapshot, "a");
    expect(snapshot.entries).toHaveLength(2);
    expect(snapshot.total).toBe(8);
  });
});
