"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  AttendanceStatus,
  Guest,
  RsvpStatus,
} from "@/types/wedding";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

async function writeAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: {
    action: string;
    entity_type: string;
    entity_id?: string | null;
    staff_id?: string | null;
    before_data?: unknown;
    after_data?: unknown;
    meta?: Record<string, unknown>;
  },
) {
  await supabase.from("audit_logs").insert({
    action: payload.action,
    entity_type: payload.entity_type,
    entity_id: payload.entity_id ?? null,
    staff_id: payload.staff_id ?? null,
    before_data: payload.before_data ?? null,
    after_data: payload.after_data ?? null,
    meta: payload.meta ?? {},
  });
}

export async function upsertGuest(input: Partial<Guest> & { name_en: string }) {
  const { supabase, user } = await requireUser();
  const expectedCount = Number(input.expected_count);
  const row: Record<string, unknown> = {
    name_en: input.name_en.trim(),
    name_zh: input.name_zh ?? "",
    nickname: input.nickname ?? "",
    phone: input.phone ?? "",
    email: input.email ?? "",
    group_id: input.group_id || null,
    rsvp_status: normalizeRsvp(input.rsvp_status),
    expected_count: Number.isFinite(expectedCount) && expectedCount >= 0 ? expectedCount : 1,
    attendance_status: normalizeAttendance(input.attendance_status),
    table_id: input.table_id || null,
    is_vip: Boolean(input.is_vip),
    dietary: input.dietary ?? "",
    relationship: input.relationship ?? "",
    category: input.category ?? "",
    notes: input.notes ?? "",
    custom_fields: input.custom_fields ?? {},
  };

  if (input.guest_code?.trim()) row.guest_code = input.guest_code.trim();
  if ("seat_id" in input) row.seat_id = input.seat_id || null;
  if ("checked_in_at" in input) row.checked_in_at = input.checked_in_at ?? null;
  if ("checked_in_by" in input) row.checked_in_by = input.checked_in_by ?? null;

  if (input.id) {
    const { data: before } = await supabase
      .from("guests")
      .select("*")
      .eq("id", input.id)
      .single();
    const { data, error } = await supabase
      .from("guests")
      .update(row)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(supabase, {
      action: "guest_update",
      entity_type: "guest",
      entity_id: data.id,
      staff_id: user.id,
      before_data: before,
      after_data: data,
    });
    revalidatePath("/guests");
    return data as Guest;
  }

  if (!row.guest_code) {
    row.guest_code = `G-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  const { data, error } = await supabase
    .from("guests")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await writeAudit(supabase, {
    action: "guest_create",
    entity_type: "guest",
    entity_id: data.id,
    staff_id: user.id,
    after_data: data,
  });
  revalidatePath("/guests");
  return data as Guest;
}

const RSVP_VALUES = new Set(["pending", "confirmed", "declined", "maybe"]);
const ATTENDANCE_VALUES = new Set(["not_arrived", "checked_in", "no_show"]);

function normalizeRsvp(value: unknown): RsvpStatus {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const aliases: Record<string, RsvpStatus> = {
    yes: "confirmed",
    y: "confirmed",
    confirm: "confirmed",
    confirmed: "confirmed",
    attending: "confirmed",
    no: "declined",
    n: "declined",
    decline: "declined",
    declined: "declined",
    reject: "declined",
    maybe: "maybe",
    perhaps: "maybe",
    pending: "pending",
    await: "pending",
    awaiting: "pending",
  };
  if (aliases[raw]) return aliases[raw];
  if (RSVP_VALUES.has(raw)) return raw as RsvpStatus;
  return "pending";
}

function normalizeAttendance(value: unknown): AttendanceStatus {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const aliases: Record<string, AttendanceStatus> = {
    arrived: "checked_in",
    checkedin: "checked_in",
    checked_in: "checked_in",
    "check-in": "checked_in",
    check_in: "checked_in",
    present: "checked_in",
    waiting: "not_arrived",
    notarrived: "not_arrived",
    not_arrived: "not_arrived",
    "not-arrived": "not_arrived",
    noshow: "no_show",
    no_show: "no_show",
    "no-show": "no_show",
    walkin: "checked_in",
    walk_in: "checked_in",
    "walk-in": "checked_in",
  };
  if (aliases[raw]) return aliases[raw];
  if (ATTENDANCE_VALUES.has(raw)) return raw as AttendanceStatus;
  return "not_arrived";
}

export type GuestImportRow = Record<string, string>;

export async function importGuests(rows: GuestImportRow[]) {
  const { supabase, user } = await requireUser();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("CSV has no data rows.");
  }
  if (rows.length > 2000) {
    throw new Error("CSV import is limited to 2000 rows at a time.");
  }

  const { data: groups } = await supabase.from("guest_groups").select("id, name");
  const groupByName = new Map(
    (groups ?? []).map((item) => [String(item.name).trim().toLowerCase(), item.id as string]),
  );

  async function resolveGroupId(groupName: string) {
    const key = groupName.trim().toLowerCase();
    if (!key) return null;
    const existing = groupByName.get(key);
    if (existing) return existing;
    const { data, error } = await supabase
      .from("guest_groups")
      .insert({ name: groupName.trim(), notes: "Created from CSV import" })
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);
    groupByName.set(key, data.id);
    return data.id as string;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const raw = normalizeImportRow(rows[index] ?? {});
    const name = (raw.name || raw.name_en || raw.guest_name || "").trim();
    if (!name) {
      skipped += 1;
      continue;
    }

    const expectedCount = Number(raw.expected_count || 1);
    const groupName = (raw.group || raw.group_name || "").trim();

    try {
      const groupId = await resolveGroupId(groupName);
      const payload = {
        name_en: name,
        rsvp_status: normalizeRsvp(raw.rsvp_status || raw.rsvp),
        expected_count: Number.isFinite(expectedCount) && expectedCount >= 0 ? expectedCount : 1,
        group_id: groupId,
        relationship: raw.relationship ?? "",
        category: raw.category ?? "",
      };

      // Prefer update when same name + group already exists.
      let existingQuery = supabase
        .from("guests")
        .select("id")
        .ilike("name_en", name)
        .limit(1);
      existingQuery = groupId
        ? existingQuery.eq("group_id", groupId)
        : existingQuery.is("group_id", null);
      const { data: existingRows } = await existingQuery;
      const existingId = existingRows?.[0]?.id ?? null;

      if (existingId) {
        const { error } = await supabase.from("guests").update(payload).eq("id", existingId);
        if (error) throw new Error(error.message);
        updated += 1;
      } else {
        const guestCode = `G-${Date.now().toString(36).toUpperCase()}-${Math.random()
          .toString(36)
          .slice(2, 6)
          .toUpperCase()}`;
        const { error } = await supabase.from("guests").insert({
          ...payload,
          guest_code: guestCode,
          name_zh: "",
          nickname: "",
          phone: "",
          email: "",
          attendance_status: "not_arrived",
          is_vip: false,
          is_walk_in: false,
          dietary: "",
          notes: "",
          custom_fields: {},
        });
        if (error) throw new Error(error.message);
        created += 1;
      }
    } catch (error) {
      errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : "failed"}`);
      if (errors.length >= 15) break;
    }
  }

  await writeAudit(supabase, {
    action: "guest_import",
    entity_type: "guest",
    staff_id: user.id,
    meta: { created, updated, skipped, errorCount: errors.length, total: rows.length },
  });

  revalidatePath("/guests");
  revalidatePath("/dashboard");
  revalidatePath("/seating");
  revalidatePath("/reports");
  revalidatePath("/check-in");
  revalidatePath("/floor-plan");
  revalidatePath("/reception");

  return { created, updated, skipped, errors, total: rows.length };
}

function normalizeImportRow(row: GuestImportRow) {
  const next: GuestImportRow = {};
  for (const [key, value] of Object.entries(row)) {
    const normalized = key
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    next[normalized] = value ?? "";
  }
  return next;
}

export async function deleteGuest(id: string) {
  const { supabase, user } = await requireUser();
  const { data: before } = await supabase.from("guests").select("*").eq("id", id).single();
  const { error } = await supabase.from("guests").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit(supabase, {
    action: "guest_delete",
    entity_type: "guest",
    entity_id: id,
    staff_id: user.id,
    before_data: before,
  });
  revalidatePath("/guests");
}

/** Permanently delete every guest (and cascaded check-in events). Admin only. */
export async function wipeAllGuests(confirmation: string) {
  if (confirmation.trim().toUpperCase() !== "DELETE") {
    throw new Error('Type DELETE to confirm wiping the guest list.');
  }

  const { supabase, user } = await requireUser();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (profile?.role !== "admin") {
    throw new Error("Only admins can wipe the entire guest list.");
  }

  const { count: beforeCount, error: countError } = await supabase
    .from("guests")
    .select("id", { count: "exact", head: true });
  if (countError) throw new Error(countError.message);

  // Supabase requires a filter for deletes; match all existing rows.
  const { error: deleteError } = await supabase
    .from("guests")
    .delete()
    .neq("guest_code", "__never__");
  if (deleteError) throw new Error(deleteError.message);

  // Free seat map markers after guests are gone.
  const { error: seatsError } = await supabase
    .from("seats")
    .update({ status: "empty" })
    .neq("status", "empty");
  if (seatsError) throw new Error(seatsError.message);

  await writeAudit(supabase, {
    action: "guest_delete",
    entity_type: "guest",
    staff_id: user.id,
    meta: { wipe_all: true, deleted_count: beforeCount ?? 0 },
  });

  revalidatePath("/guests");
  revalidatePath("/dashboard");
  revalidatePath("/check-in");
  revalidatePath("/seating");
  revalidatePath("/floor-plan");
  revalidatePath("/reports");
  revalidatePath("/tables");
  revalidatePath("/settings");

  return { deleted: beforeCount ?? 0 };
}

export async function checkInGuest(opts: {
  guestId: string;
  mode?: "check_in" | "partial" | "group";
  partyCount?: number;
}) {
  const { supabase, user } = await requireUser();
  const { data: guest, error: gErr } = await supabase
    .from("guests")
    .select("*")
    .eq("id", opts.guestId)
    .single();
  if (gErr || !guest) throw new Error(gErr?.message || "Guest not found");

  const mode = opts.mode ?? "check_in";
  const partyCount = opts.partyCount ?? guest.expected_count ?? 1;
  const now = new Date().toISOString();

  if (mode === "group" && guest.group_id) {
    const { data: members, error } = await supabase
      .from("guests")
      .update({
        attendance_status: "checked_in" as AttendanceStatus,
        checked_in_at: now,
        checked_in_by: user.id,
      })
      .eq("group_id", guest.group_id)
      .neq("attendance_status", "checked_in")
      .select("*");
    if (error) throw new Error(error.message);

    const eventInsert = supabase.from("check_in_events").insert(
      (members ?? []).map((m) => ({
        guest_id: m.id,
        event_type: "group",
        party_count: m.expected_count,
        staff_id: user.id,
      })),
    );
    const audit = writeAudit(supabase, {
      action: "check_in_group",
      entity_type: "guest_group",
      entity_id: guest.group_id,
      staff_id: user.id,
      meta: { count: members?.length ?? 0 },
    });
    await Promise.all([eventInsert, audit]);
  } else {
    const { data, error } = await supabase
      .from("guests")
      .update({
        attendance_status: "checked_in" as AttendanceStatus,
        checked_in_at: now,
        checked_in_by: user.id,
      })
      .eq("id", guest.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await Promise.all([
      supabase.from("check_in_events").insert({
        guest_id: guest.id,
        event_type: mode === "partial" ? "partial" : "check_in",
        party_count: partyCount,
        staff_id: user.id,
      }),
      writeAudit(supabase, {
        action: mode === "partial" ? "check_in_partial" : "check_in",
        entity_type: "guest",
        entity_id: guest.id,
        staff_id: user.id,
        before_data: guest,
        after_data: data,
        meta: { partyCount },
      }),
    ]);
  }

  // Current page only — other routes refresh via realtime / next visit.
  revalidatePath("/check-in");
}

export async function undoCheckIn(guestId: string) {
  const { supabase, user } = await requireUser();
  const { data: before } = await supabase.from("guests").select("*").eq("id", guestId).single();
  const { data, error } = await supabase
    .from("guests")
    .update({
      attendance_status: "not_arrived" as AttendanceStatus,
      checked_in_at: null,
      checked_in_by: null,
    })
    .eq("id", guestId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await Promise.all([
    supabase.from("check_in_events").insert({
      guest_id: guestId,
      event_type: "undo",
      party_count: 0,
      staff_id: user.id,
    }),
    writeAudit(supabase, {
      action: "check_in_undo",
      entity_type: "guest",
      entity_id: guestId,
      staff_id: user.id,
      before_data: before,
      after_data: data,
    }),
  ]);

  revalidatePath("/check-in");
}

export async function assignGuestToTable(opts: {
  guestId: string;
  tableId: string | null;
  seatId?: string | null;
}) {
  const { supabase, user } = await requireUser();

  if (opts.tableId) {
    const [{ data: settings }, { data: table }, { count }] = await Promise.all([
      supabase
        .from("app_settings")
        .select("value")
        .eq("key", "attendanceSettings")
        .maybeSingle(),
      supabase
        .from("reception_tables")
        .select("id, capacity")
        .eq("id", opts.tableId)
        .single(),
      supabase
        .from("guests")
        .select("id", { count: "exact", head: true })
        .eq("table_id", opts.tableId)
        .neq("id", opts.guestId),
    ]);

    if (!table) throw new Error("Table not found");

    const allowOver =
      (settings?.value as { allowOvercapacity?: boolean } | null)?.allowOvercapacity ??
      false;

    if (!allowOver && (count ?? 0) >= table.capacity) {
      throw new Error("Table is at capacity. Enable overcapacity in Settings or add a seat.");
    }
  }

  let seatId = opts.seatId ?? null;
  if (opts.tableId && !seatId) {
    const [{ data: seats }, { data: taken }] = await Promise.all([
      supabase
        .from("seats")
        .select("id, seat_number")
        .eq("table_id", opts.tableId)
        .order("seat_number"),
      supabase
        .from("guests")
        .select("seat_id")
        .eq("table_id", opts.tableId)
        .not("seat_id", "is", null),
    ]);
    const takenSet = new Set((taken ?? []).map((t) => t.seat_id));
    const free = (seats ?? []).find((s) => !takenSet.has(s.id));
    seatId = free?.id ?? null;
  }

  const { data: before } = await supabase.from("guests").select("*").eq("id", opts.guestId).single();
  const { data, error } = await supabase
    .from("guests")
    .update({
      table_id: opts.tableId,
      seat_id: opts.tableId ? seatId : null,
    })
    .eq("id", opts.guestId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await writeAudit(supabase, {
    action: opts.tableId ? "seat_assign" : "seat_unassign",
    entity_type: "guest",
    entity_id: opts.guestId,
    staff_id: user.id,
    before_data: before,
    after_data: data,
  });

  revalidatePath("/seating");
  revalidatePath("/check-in");
  return data as Guest;
}

export async function updateRsvp(guestId: string, rsvp_status: RsvpStatus) {
  const { supabase, user } = await requireUser();
  const { data: before } = await supabase.from("guests").select("*").eq("id", guestId).single();
  const { data, error } = await supabase
    .from("guests")
    .update({ rsvp_status })
    .eq("id", guestId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await writeAudit(supabase, {
    action: "guest_update",
    entity_type: "guest",
    entity_id: guestId,
    staff_id: user.id,
    before_data: before,
    after_data: data,
    meta: { field: "rsvp_status" },
  });
  revalidatePath("/guests");
}

export async function updateRsvpBulk(guestIds: string[], rsvp_status: RsvpStatus) {
  const ids = [...new Set(guestIds.filter(Boolean))];
  if (!ids.length) throw new Error("Select at least one guest.");

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("guests")
    .update({ rsvp_status })
    .in("id", ids)
    .select("id");
  if (error) throw new Error(error.message);

  await writeAudit(supabase, {
    action: "guest_update",
    entity_type: "guest",
    staff_id: user.id,
    meta: { field: "rsvp_status", bulk: true, count: data?.length ?? ids.length, rsvp_status },
  });

  revalidatePath("/guests");
  return { updated: data?.length ?? ids.length };
}

export async function upsertTable(input: {
  id?: string;
  table_number: string;
  name: string;
  capacity: number;
  table_type?: string;
  location?: string;
  notes?: string;
  status?: string;
  pos_x?: number;
  pos_y?: number;
  sort_order?: number;
}) {
  const { supabase, user } = await requireUser();
  if (input.capacity < 1) throw new Error("Capacity must be at least 1");

  if (input.id) {
    const { data: before } = await supabase
      .from("reception_tables")
      .select("*")
      .eq("id", input.id)
      .single();
    const { data, error } = await supabase
      .from("reception_tables")
      .update(input)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(supabase, {
      action: "table_update",
      entity_type: "table",
      entity_id: data.id,
      staff_id: user.id,
      before_data: before,
      after_data: data,
    });
    revalidatePath("/tables");
    revalidatePath("/seating");
    revalidatePath("/floor-plan");
    return data;
  }

  const { data, error } = await supabase
    .from("reception_tables")
    .insert(input)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  // Create seats matching capacity
  const seats = Array.from({ length: input.capacity }, (_, i) => ({
    table_id: data.id,
    seat_number: i + 1,
  }));
  await supabase.from("seats").insert(seats);

  await writeAudit(supabase, {
    action: "table_create",
    entity_type: "table",
    entity_id: data.id,
    staff_id: user.id,
    after_data: data,
  });
  revalidatePath("/tables");
  revalidatePath("/seating");
  revalidatePath("/floor-plan");
  return data;
}

export async function addSeatToTable(tableId: string) {
  const { supabase, user } = await requireUser();
  const { data: table } = await supabase
    .from("reception_tables")
    .select("*")
    .eq("id", tableId)
    .single();
  if (!table) throw new Error("Table not found");

  const { data: seats } = await supabase
    .from("seats")
    .select("seat_number")
    .eq("table_id", tableId)
    .order("seat_number", { ascending: false })
    .limit(1);
  const next = (seats?.[0]?.seat_number ?? table.capacity) + 1;
  const newCapacity = Math.max(table.capacity + 1, next);

  await supabase
    .from("reception_tables")
    .update({ capacity: newCapacity })
    .eq("id", tableId);

  const { data: seat, error } = await supabase
    .from("seats")
    .insert({ table_id: tableId, seat_number: next })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await writeAudit(supabase, {
    action: "seat_add",
    entity_type: "table",
    entity_id: tableId,
    staff_id: user.id,
    after_data: seat,
  });
  revalidatePath("/tables");
  revalidatePath("/seating");
  return seat;
}

export async function deleteTable(id: string) {
  const { supabase, user } = await requireUser();
  const { data: before } = await supabase.from("reception_tables").select("*").eq("id", id).single();
  await supabase.from("guests").update({ table_id: null, seat_id: null }).eq("table_id", id);
  const { error } = await supabase.from("reception_tables").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit(supabase, {
    action: "table_delete",
    entity_type: "table",
    entity_id: id,
    staff_id: user.id,
    before_data: before,
  });
  revalidatePath("/tables");
  revalidatePath("/seating");
  revalidatePath("/floor-plan");
}

export async function saveSetting(key: string, value: unknown) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("app_settings").upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  });
  if (error) throw new Error(error.message);
  await writeAudit(supabase, {
    action: "settings_update",
    entity_type: "settings",
    entity_id: null,
    staff_id: user.id,
    after_data: { key, value },
  });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/reception");
}

export async function updateTablePosition(id: string, pos_x: number, pos_y: number) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("reception_tables")
    .update({ pos_x, pos_y })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/floor-plan");
}

export async function updateRedPacketAmount(guestId: string, amount: number | null) {
  const { supabase, user } = await requireUser();
  if (amount != null && (!Number.isFinite(amount) || amount < 0)) {
    throw new Error("Amount must be zero or a positive number.");
  }

  const { data: before, error: readError } = await supabase
    .from("guests")
    .select("*")
    .eq("id", guestId)
    .single();
  if (readError || !before) throw new Error(readError?.message || "Guest not found");

  const customFields = {
    ...((before.custom_fields as Record<string, unknown> | null) ?? {}),
  };
  if (amount == null) delete customFields.red_packet_amount;
  else customFields.red_packet_amount = amount;

  const payload: Record<string, unknown> = {
    custom_fields: customFields,
  };
  // Prefer dedicated column when migration is applied.
  payload.red_packet_amount = amount;

  let { data, error } = await supabase
    .from("guests")
    .update(payload)
    .eq("id", guestId)
    .select("*")
    .single();

  if (error && /red_packet_amount/i.test(error.message)) {
    const fallback = await supabase
      .from("guests")
      .update({ custom_fields: customFields })
      .eq("id", guestId)
      .select("*")
      .single();
    data = fallback.data;
    error = fallback.error;
  }
  if (error) throw new Error(error.message);

  await writeAudit(supabase, {
    action: "guest_update",
    entity_type: "guest",
    entity_id: guestId,
    staff_id: user.id,
    before_data: before,
    after_data: data,
    meta: { field: "red_packet_amount", amount },
  });
  revalidatePath("/red-packet");
  return data as Guest;
}

export async function updateRedPacketPasscode(nextPasscode: string, currentPasscode: string) {
  const { supabase, user } = await requireUser();
  if (!/^\d{4}$/.test(nextPasscode)) throw new Error("Passcode must be exactly 4 digits.");
  if (!/^\d{4}$/.test(currentPasscode)) throw new Error("Current passcode must be 4 digits.");

  const { data: row } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "redPacket")
    .maybeSingle();
  const current =
    (row?.value as { passcode?: string } | null)?.passcode?.toString() || "0000";
  if (current !== currentPasscode) throw new Error("Current passcode is incorrect.");

  const value = { passcode: nextPasscode };
  const { error } = await supabase.from("app_settings").upsert({
    key: "redPacket",
    value,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  });
  if (error) throw new Error(error.message);

  await writeAudit(supabase, {
    action: "settings_update",
    entity_type: "settings",
    entity_id: null,
    staff_id: user.id,
    after_data: { key: "redPacket", passcodeUpdated: true },
  });
  revalidatePath("/red-packet");
  return value;
}
