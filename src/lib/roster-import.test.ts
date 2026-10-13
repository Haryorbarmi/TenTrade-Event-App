import { describe, expect, it } from "vitest";
import { parseBalance, planRosterImport, rosterTableToRows } from "./roster-import";

const table = [
  ["CRM ID", "First Name", "Middle Name", "Last Name", "Account Balance"],
  ["104823", "Ada", "Ngozi", "Obi", "$1,250.50"],
  ["4823", "Tunde", "", "Bello", "99"],
  ["104823", "Dup", "", "Person", "500"],
  ["12ab", "Bad", "", "Id", "500"],
  ["200001", "", "", "NoFirst", "500"],
  ["200002", "Neg", "", "Balance", "(300)"],
  ["200003", "No", "", "Number", "n/a"],
];

describe("roster import", () => {
  it("maps headings and splits names", () => {
    const parsed = rosterTableToRows(table);
    if ("error" in parsed) throw new Error(parsed.error);
    const plan = planRosterImport(parsed.rows);
    expect(plan.rows).toEqual([
      { client_id: "104823", first_name: "Ada", middle_name: "Ngozi", last_name: "Obi", balance: 1250.5 },
      { client_id: "004823", first_name: "Tunde", middle_name: null, last_name: "Bello", balance: 99 },
      { client_id: "200002", first_name: "Neg", middle_name: null, last_name: "Balance", balance: -300 },
    ]);
    expect(plan.skipped.map((s) => s.line)).toEqual([4, 5, 6, 8]);
  });

  it("reports missing columns", () => {
    const r = rosterTableToRows([["CRM ID", "First Name"]]);
    expect(r).toEqual({ error: "Missing columns: Last Name, Balance. The first row must have the headings." });
  });

  it("parses balances", () => {
    expect(parseBalance("1 250")).toBe(1250);
    expect(parseBalance("-5")).toBe(-5);
    expect(parseBalance("")).toBeNull();
    expect(parseBalance("abc")).toBeNull();
  });
});
