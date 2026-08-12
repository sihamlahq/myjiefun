import * as XLSX from "xlsx";
import type { GuestWithRelations } from "@/types/wedding";

export function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function rowsToCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows]
    .map((row) => row.map((cell) => csvEscape(cell)).join(","))
    .join("\n");
}

/** Columns used for guest CSV/Excel upload / download template. */
export const GUEST_UPLOAD_HEADERS = [
  "name",
  "group",
  "rsvp_status",
  "expected_count",
  "relationship",
  "category",
] as const;

const TEMPLATE_SAMPLE_ROWS = [
  ["Alex Tan", "Family", "confirmed", "2", "Cousin", "Family"],
  ["Jordan Lim", "Friends", "pending", "1", "Colleague", "Friends"],
];

export function guestsToCsv(guests: GuestWithRelations[]) {
  const headers = [...GUEST_UPLOAD_HEADERS];
  const rows = guests.map((guest) => [
    guest.name_en,
    guest.guest_groups?.name ?? "",
    guest.rsvp_status,
    guest.expected_count,
    guest.relationship,
    guest.category,
  ]);
  return rowsToCsv(headers, rows);
}

export function guestUploadTemplateCsv() {
  return rowsToCsv([...GUEST_UPLOAD_HEADERS], TEMPLATE_SAMPLE_ROWS);
}

export function guestUploadTemplateXlsx(): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet([[...GUEST_UPLOAD_HEADERS], ...TEMPLATE_SAMPLE_ROWS]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Guests");
  return XLSX.write(book, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(header: string) {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function cellToString(value: unknown) {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(value);
  }
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

export function csvToObjects(text: string) {
  const [headers, ...rows] = parseCsv(text.replace(/^\uFEFF/, ""));
  if (!headers) return [];
  return rows.map((row) =>
    Object.fromEntries(
      headers.map((header, index) => [normalizeHeader(header), row[index]?.trim() ?? ""]),
    ),
  );
}

export function sheetMatrixToObjects(matrix: unknown[][]) {
  if (!matrix.length) return [] as Record<string, string>[];
  const headerRow = (matrix[0] ?? []).map((cell) => normalizeHeader(cellToString(cell)));
  return matrix
    .slice(1)
    .map((row) => {
      const record: Record<string, string> = {};
      headerRow.forEach((header, index) => {
        if (!header) return;
        record[header] = cellToString(row?.[index]);
      });
      return record;
    })
    .filter((row) => Object.values(row).some((value) => value !== ""));
}

export function excelArrayBufferToObjects(buffer: ArrayBuffer) {
  const book = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = book.SheetNames[0];
  if (!sheetName) return [] as Record<string, string>[];
  const sheet = book.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  }) as unknown[][];
  return sheetMatrixToObjects(matrix);
}

export async function fileToGuestImportRows(file: File) {
  const name = file.name.toLowerCase();
  const isExcel =
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsm") ||
    file.type.includes("spreadsheet") ||
    file.type === "application/vnd.ms-excel" ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  if (isExcel) {
    const buffer = await file.arrayBuffer();
    return excelArrayBufferToObjects(buffer);
  }

  const text = await file.text();
  return csvToObjects(text);
}
