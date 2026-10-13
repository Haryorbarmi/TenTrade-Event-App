import "server-only";
import ExcelJS from "exceljs";
import { parseCsv } from "./attendee-import";

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return String(v.text); // hyperlink cell
    if ("result" in v) return String(v.result ?? ""); // formula cell
    return "";
  }
  return String(v);
}

// Reads the first sheet of an .xlsx, or a .csv, as rows of text (first row = headings).
// Returns an error message string when the file cannot be read.
export async function readTable(file: File): Promise<string[][] | string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCsv(await file.text());
  if (name.endsWith(".xlsx")) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ArrayBuffer);
      const sheet = workbook.worksheets[0];
      if (!sheet) return "The workbook has no sheets.";
      const table: string[][] = [];
      sheet.eachRow({ includeEmpty: false }, (row) => {
        const cells: string[] = [];
        for (let c = 1; c <= sheet.columnCount; c++) cells.push(cellText(row.getCell(c).value));
        table.push(cells);
      });
      return table;
    } catch {
      return "Could not read that Excel file. Save it as .xlsx or .csv and try again.";
    }
  }
  return "Choose an .xlsx or .csv file.";
}
