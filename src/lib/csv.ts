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

export function guestsToCsv(guests: GuestWithRelations[]) {
  const headers = [
    "guest_code",
    "name_en",
    "name_zh",
    "nickname",
    "phone",
    "email",
    "group",
    "rsvp_status",
    "expected_count",
    "attendance_status",
    "table",
    "seat",
    "is_vip",
    "is_walk_in",
    "dietary",
    "relationship",
    "category",
    "notes",
    "checked_in_at",
  ];

  const rows = guests.map((guest) => [
    guest.guest_code,
    guest.name_en,
    guest.name_zh,
    guest.nickname,
    guest.phone,
    guest.email,
    guest.guest_groups?.name ?? "",
    guest.rsvp_status,
    guest.expected_count,
    guest.attendance_status,
    guest.reception_tables?.table_number ?? "",
    guest.seats?.seat_number ?? "",
    guest.is_vip ? "yes" : "no",
    guest.is_walk_in ? "yes" : "no",
    guest.dietary,
    guest.relationship,
    guest.category,
    guest.notes,
    guest.checked_in_at ?? "",
  ]);

  return rowsToCsv(headers, rows);
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
  const [headers, ...rows] = parseCsv(text);
  if (!headers) return [];
  return rows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), row[index]?.trim() ?? ""])),
  );
}
