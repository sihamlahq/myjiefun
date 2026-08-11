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
  const guestCode =
    input.guest_code ||
    `G-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const row = {
    ...input,
    guest_code: guestCode,
    name_en: input.name_en.trim(),
    expected_count: input.expected_count ?? 1,
  };

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
    revalidatePath("/dashboard");
    return data as Guest;
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
  revalidatePath("/dashboard");
  return data as Guest;
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
  revalidatePath("/dashboard");
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

    await supabase.from("check_in_events").insert(
      (members ?? []).map((m) => ({
        guest_id: m.id,
        event_type: "group",
        party_count: m.expected_count,
        staff_id: user.id,
      })),
    );
    await writeAudit(supabase, {
      action: "check_in_group",
      entity_type: "guest_group",
      entity_id: guest.group_id,
      staff_id: user.id,
      meta: { count: members?.length ?? 0 },
    });
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

    await supabase.from("check_in_events").insert({
      guest_id: guest.id,
      event_type: mode === "partial" ? "partial" : "check_in",
      party_count: partyCount,
      staff_id: user.id,
    });
    await writeAudit(supabase, {
      action: mode === "partial" ? "check_in_partial" : "check_in",
      entity_type: "guest",
      entity_id: guest.id,
      staff_id: user.id,
      before_data: guest,
      after_data: data,
      meta: { partyCount },
    });
  }

  revalidatePath("/check-in");
  revalidatePath("/dashboard");
  revalidatePath("/seating");
  revalidatePath("/floor-plan");
  revalidatePath("/guests");
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

  await supabase.from("check_in_events").insert({
    guest_id: guestId,
    event_type: "undo",
    party_count: 0,
    staff_id: user.id,
  });
  await writeAudit(supabase, {
    action: "check_in_undo",
    entity_type: "guest",
    entity_id: guestId,
    staff_id: user.id,
    before_data: before,
    after_data: data,
  });

  revalidatePath("/check-in");
  revalidatePath("/dashboard");
  revalidatePath("/seating");
  revalidatePath("/floor-plan");
}

export async function assignGuestToTable(opts: {
  guestId: string;
  tableId: string | null;
  seatId?: string | null;
}) {
  const { supabase, user } = await requireUser();

  if (opts.tableId) {
    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "attendanceSettings")
      .maybeSingle();
    const allowOver =
      (settings?.value as { allowOvercapacity?: boolean } | null)?.allowOvercapacity ??
      false;

    const { data: table } = await supabase
      .from("reception_tables")
      .select("id, capacity")
      .eq("id", opts.tableId)
      .single();
    if (!table) throw new Error("Table not found");

    const { count } = await supabase
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("table_id", opts.tableId)
      .neq("id", opts.guestId);

    if (!allowOver && (count ?? 0) >= table.capacity) {
      throw new Error("Table is at capacity. Enable overcapacity in Settings or add a seat.");
    }
  }

  let seatId = opts.seatId ?? null;
  if (opts.tableId && !seatId) {
    const { data: seats } = await supabase
      .from("seats")
      .select("id, seat_number")
      .eq("table_id", opts.tableId)
      .order("seat_number");
    const { data: taken } = await supabase
      .from("guests")
      .select("seat_id")
      .eq("table_id", opts.tableId)
      .not("seat_id", "is", null);
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
  revalidatePath("/floor-plan");
  revalidatePath("/guests");
  revalidatePath("/dashboard");
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
  revalidatePath("/dashboard");
}

export async function createWalkIn(input: {
  name_en: string;
  expected_count?: number;
  table_id?: string | null;
  phone?: string;
}) {
  const { supabase, user } = await requireUser();
  const guest = await upsertGuest({
    name_en: input.name_en,
    expected_count: input.expected_count ?? 1,
    table_id: input.table_id ?? null,
    phone: input.phone ?? "",
    is_walk_in: true,
    attendance_status: "checked_in",
    rsvp_status: "confirmed",
    checked_in_at: new Date().toISOString(),
    checked_in_by: user.id,
  });
  await writeAudit(supabase, {
    action: "walk_in_create",
    entity_type: "guest",
    entity_id: guest.id,
    staff_id: user.id,
    after_data: guest,
  });
  return guest;
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
  revalidatePath("/floor-plan");
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
