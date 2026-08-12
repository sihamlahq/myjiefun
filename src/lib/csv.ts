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

/** Columns used for guest CSV upload / download template. */
export const GUEST_UPLOAD_HEADERS = [
  "name",
  "group",
  "rsvp_status",
  "expected_count",
  "relationship",
  "category",
] as const;

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
  return rowsToCsv(
    [...GUEST_UPLOAD_HEADERS],
    [
      ["Alex Tan", "Family", "confirmed", "2", "Cousin", "Family"],
      ["Jordan Lim", "Friends", "pending", "1", "Colleague", "Friends"],
    ],
  );
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

export function csvToObjects(text: string) {
  const [headers, ...rows] = parseCsv(text.replace(/^\uFEFF/, ""));
  if (!headers) return [];
  return rows.map((row) =>
    Object.fromEntries(
      headers.map((header, index) => [
        header
          .replace(/^\uFEFF/, "")
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, "_"),
        row[index]?.trim() ?? "",
      ]),
    ),
  );
}
