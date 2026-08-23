import { NextResponse } from "next/server";
import { requireAuthedDataClient } from "@/lib/supabase/data-client";
import { isJwtClockSkewError, JWT_CLOCK_SKEW_HELP } from "@/lib/supabase/errors";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Auth-protected live snapshot for the dashboard command center. */
export async function GET() {
  try {
    const { supabase } = await requireAuthedDataClient();

    const [guests, tables, checkInEvents] = await Promise.all([
      supabase
        .from("guests")
        .select(
          "id, guest_code, name_en, name_zh, phone, table_id, group_id, rsvp_status, attendance_status, expected_count, is_vip, dietary, relationship, category, notes, checked_in_at, guest_groups(id, name), reception_tables(id, table_number, name, capacity, table_type, status, location)",
        )
        .order("name_en", { ascending: true }),
      supabase
        .from("reception_tables")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("table_number", { ascending: true }),
      supabase
        .from("check_in_events")
        .select("*, guests(id, name_en, name_zh, guest_code, table_id)")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (guests.error) {
      throw new Error(
        isJwtClockSkewError(guests.error.message)
          ? JWT_CLOCK_SKEW_HELP
          : guests.error.message,
      );
    }
    if (tables.error) throw new Error(tables.error.message);
    if (checkInEvents.error) throw new Error(checkInEvents.error.message);

    return NextResponse.json(
      {
        ok: true,
        fetchedAt: new Date().toISOString(),
        guests: guests.data ?? [],
        tables: tables.data ?? [],
        checkInEvents: checkInEvents.data ?? [],
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load dashboard data";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status },
    );
  }
}
