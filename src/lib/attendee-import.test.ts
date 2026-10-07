import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCsv, planImport, tableToRows, type SheetRow } from "./attendee-import";

const rowsOf = (csv: string): SheetRow[] => {
  const r = tableToRows(parseCsv(csv));
  if ("error" in r) throw new Error(r.error);
  return r.rows;
};

describe("parseCsv", () => {
  it("drops the BOM, handles CRLF and keeps values as text", () => {
    expect(parseCsv("\uFEFFNo.,Client ID\r\n1,001234\r\n")).toEqual([
      ["No.", "Client ID"],
      ["1", "001234"],
    ]);
  });
  it("handles quoted fields with commas and quotes", () => {
    expect(parseCsv('a,b\n"Obi, Ada","say ""hi"""')).toEqual([
      ["a", "b"],
      ["Obi, Ada", 'say "hi"'],
    ]);
  });
});

describe("tableToRows", () => {
  it("names the missing columns", () => {
    const r = tableToRows(parseCsv("Name,Email\nAda,a@b.co"));
    expect(r).toEqual({ error: expect.stringMatching(/Missing columns: Client ID, Phone/) });
  });
  it("reports an empty file", () => {
    expect(tableToRows([])).toEqual({ error: "The file is empty." });
  });
});

const HEAD = "No.,Client ID,Name,Email,Phone\n";

describe("planImport", () => {
  it("fills missing Grand Draw / Tickets at random, always valid", () => {
    let s = 12345;
    const seq = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648; // seeded, repeatable
    const csv = HEAD + Array.from({ length: 40 }, (_, i) => `${i + 1},${100000 + i},Name ${i},n${i}@x.com,+23480312345${String(10 + i).padStart(2, "0")}`).join("\n");
    const plan = planImport(rowsOf(csv), new Set(), seq);
    expect(plan.skipped).toEqual([]);
    expect(plan.rows).toHaveLength(40);
    for (const r of plan.rows) {
      expect(r.eligible ? r.tickets >= 1 && r.tickets <= 10 : r.tickets === 0).toBe(true);
    }
    expect(plan.rows.some((r) => r.eligible)).toBe(true);
    expect(plan.rows.some((r) => !r.eligible)).toBe(true);
  });

  it("uses Grand Draw and Tickets columns when the file has them", () => {
    const csv = "Client ID,Name,Email,Phone,Grand Draw,Tickets\n111111,Ada,a@b.co,08031234567,Eligible,4\n222222,Bayo,b@b.co,08031234568,Not eligible,9";
    const plan = planImport(rowsOf(csv), new Set());
    expect(plan.rows.map((r) => [r.eligible, r.tickets])).toEqual([[true, 4], [false, 0]]);
  });

  it("skips invalid rows, existing Client IDs and repeats, with the line number", () => {
    const csv =
      HEAD +
      "1,111111,Ada,a@b.co,08031234567\n" +
      "2,12ab,Bad Id,b@b.co,08031234568\n" +
      "3,222222,Bad Phone,c@b.co,12345\n" +
      "4,333333,Taken,d@b.co,08031234569\n" +
      "5,111111,Repeat,e@b.co,08031234560";
    const plan = planImport(rowsOf(csv), new Set(["333333"]));
    expect(plan.rows.map((r) => r.client_id)).toEqual(["111111"]);
    expect(plan.skipped.map((s) => s.line)).toEqual([3, 4, 5, 6]);
    expect(plan.skipped[2].reason).toMatch(/already registered/);
    expect(plan.skipped[3].reason).toMatch(/twice/);
  });

  it("restores leading zeros lost by spreadsheet numbers", () => {
    const plan = planImport(rowsOf("Client ID,Name,Email,Phone\n1234,Ada,a@b.co,8031234567"), new Set());
    expect(plan.rows[0]).toMatchObject({ client_id: "001234", phone: "+2348031234567" });
  });

  it("accepts the real sample file", () => {
    const path = "C:/Users/VICTUS/Downloads/random_client_data_250.csv";
    let text: string;
    try {
      text = readFileSync(path, "utf8");
    } catch {
      return; // file only exists on the owner's laptop
    }
    const plan = planImport(rowsOf(text), new Set());
    expect(plan.skipped).toEqual([]);
    expect(plan.rows).toHaveLength(250);
  });
});
