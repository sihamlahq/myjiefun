import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import * as XLSX from "xlsx";
import { decodeImportBytes, repairMojibakeText } from "@/lib/text-encoding";
import type { GuestWithRelations } from "@/types/wedding";

export function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function rowsToCsv(headers: string[], rows: unknown[][]) {
  // UTF-8 BOM so Excel opens Chinese characters correctly.
  return (
    "\uFEFF" +
    [headers, ...rows]
      .map((row) => row.map((cell) => csvEscape(cell)).join(","))
      .join("\n")
  );
}

/** Columns used for guest CSV/Excel upload / download template. */
export const GUEST_UPLOAD_HEADERS = [
  "name",
  "name_zh",
  "rsvp_status",
  "expected_count",
  "relationship",
  "category",
] as const;

export type GuestTemplateOptions = {
  categories?: string[];
  relationships?: string[];
  rsvpStatuses?: string[];
};

const DEFAULT_TEMPLATE_CATEGORIES = ["Family", "Friends", "Colleagues", "VIP", "Other"];
const DEFAULT_TEMPLATE_RELATIONSHIPS = [
  "Bride's family",
  "Groom's family",
  "Friend",
  "Colleague",
  "Schoolmate",
  "Other",
];
const DEFAULT_TEMPLATE_RSVP = ["pending", "confirmed", "declined", "maybe"];

function resolveTemplateOptions(options?: GuestTemplateOptions) {
  const categories =
    options?.categories?.filter((item) => item.trim()) ?? DEFAULT_TEMPLATE_CATEGORIES;
  const relationships =
    options?.relationships?.filter((item) => item.trim()) ?? DEFAULT_TEMPLATE_RELATIONSHIPS;
  const rsvpStatuses =
    options?.rsvpStatuses?.filter((item) => item.trim()) ?? DEFAULT_TEMPLATE_RSVP;
  return {
    categories: categories.length ? categories : DEFAULT_TEMPLATE_CATEGORIES,
    relationships: relationships.length ? relationships : DEFAULT_TEMPLATE_RELATIONSHIPS,
    rsvpStatuses: rsvpStatuses.length ? rsvpStatuses : DEFAULT_TEMPLATE_RSVP,
  };
}

function templateSampleRows(options?: GuestTemplateOptions) {
  const { categories, relationships, rsvpStatuses } = resolveTemplateOptions(options);
  return [
    [
      "Alex Tan",
      "陈晓",
      rsvpStatuses.includes("confirmed") ? "confirmed" : rsvpStatuses[0],
      "2",
      relationships[0] ?? "",
      categories[0] ?? "",
    ],
    [
      "Jordan Lim",
      "林俊",
      rsvpStatuses.includes("pending") ? "pending" : rsvpStatuses[0],
      "1",
      relationships[1] ?? relationships[0] ?? "",
      categories[1] ?? categories[0] ?? "",
    ],
  ];
}

export function guestsToCsv(guests: GuestWithRelations[]) {
  const headers = [...GUEST_UPLOAD_HEADERS];
  const rows = guests.map((guest) => [
    guest.name_en,
    guest.name_zh,
    guest.rsvp_status,
    guest.expected_count,
    guest.relationship,
    guest.category,
  ]);
  return rowsToCsv(headers, rows);
}

export function guestUploadTemplateCsv(options?: GuestTemplateOptions) {
  return rowsToCsv([...GUEST_UPLOAD_HEADERS], templateSampleRows(options));
}

function escapeXmlAttr(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Inject Excel list dropdowns for relationship (E) and category (F). */
function addGuestTemplateDropdowns(
  xlsxData: ArrayBuffer | Uint8Array | number[],
  categoryCount: number,
  relationshipCount: number,
) {
  const xlsxBytes =
    xlsxData instanceof Uint8Array
      ? xlsxData
      : xlsxData instanceof ArrayBuffer
        ? new Uint8Array(xlsxData)
        : Uint8Array.from(xlsxData);
  const files = unzipSync(xlsxBytes);
  const sheetPath = "xl/worksheets/sheet1.xml";
  const sheetXml = strFromU8(files[sheetPath]);
  const categoryEnd = Math.max(categoryCount + 1, 2);
  const relationshipEnd = Math.max(relationshipCount + 1, 2);
  const validations = `<dataValidations count="2"><dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="E2:E2000"><formula1>${escapeXmlAttr(
    `Lists!$B$2:$B$${relationshipEnd}`,
  )}</formula1></dataValidation><dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="F2:F2000"><formula1>${escapeXmlAttr(
    `Lists!$A$2:$A$${categoryEnd}`,
  )}</formula1></dataValidation></dataValidations>`;

  if (!sheetXml.includes("</worksheet>")) {
    return xlsxBytes.buffer.slice(
      xlsxBytes.byteOffset,
      xlsxBytes.byteOffset + xlsxBytes.byteLength,
    ) as ArrayBuffer;
  }

  const nextXml = sheetXml.includes("<dataValidations")
    ? sheetXml
    : sheetXml.replace("</worksheet>", `${validations}</worksheet>`);
  files[sheetPath] = strToU8(nextXml);
  const zipped = zipSync(files, { level: 6 });
  return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
}

export function guestUploadTemplateXlsx(options?: GuestTemplateOptions): ArrayBuffer {
  const { categories, relationships } = resolveTemplateOptions(options);
  const guestsSheet = XLSX.utils.aoa_to_sheet([
    [...GUEST_UPLOAD_HEADERS],
    ...templateSampleRows(options),
  ]);
  guestsSheet["!cols"] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
  ];

  const listRows = Math.max(categories.length, relationships.length);
  const listsMatrix: string[][] = [["category", "relationship"]];
  for (let index = 0; index < listRows; index += 1) {
    listsMatrix.push([categories[index] ?? "", relationships[index] ?? ""]);
  }
  const listsSheet = XLSX.utils.aoa_to_sheet(listsMatrix);
  listsSheet["!cols"] = [{ wch: 16 }, { wch: 18 }];

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, guestsSheet, "Guests");
  XLSX.utils.book_append_sheet(book, listsSheet, "Lists");
  const raw = XLSX.write(book, { bookType: "xlsx", type: "array" }) as
    | ArrayBuffer
    | Uint8Array
    | number[];
  return addGuestTemplateDropdowns(raw, categories.length, relationships.length);
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

export function excelArrayBufferToObjects(buffer: ArrayBuffer, fileName = "") {
  const lower = fileName.toLowerCase();
  const isLegacyExcel = lower.endsWith(".xls") && !lower.endsWith(".xlsx") && !lower.endsWith(".xlsm");
  const book = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    // Chinese .xls files are often code page 936 (GBK).
    ...(isLegacyExcel ? { codepage: 936 } : {}),
  });
  // Prefer Guests sheet when template includes Lists
  const sheetName =
    book.SheetNames.find((name) => name.toLowerCase() === "guests") ?? book.SheetNames[0];
  if (!sheetName) return [] as Record<string, string>[];
  const sheet = book.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  }) as unknown[][];
  return sheetMatrixToObjects(matrix).map((row) => {
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      next[key] = repairMojibakeText(value);
    }
    return next;
  });
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
    return excelArrayBufferToObjects(buffer, file.name);
  }

  const buffer = await file.arrayBuffer();
  const text = decodeImportBytes(buffer);
  return csvToObjects(text).map((row) => {
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      next[key] = repairMojibakeText(value);
    }
    return next;
  });
}
