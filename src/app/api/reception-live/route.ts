import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Lightweight public snapshot for the reception TV display. */
export async function GET() {
  try {
    const supabase = createServiceClient();
    const [guests, tables, settings] = await Promise.all([
      supabase
        .from("guests")
        .select(
          "id, guest_code, name_en, name_zh, phone, table_id, rsvp_status, attendance_status, expected_count, is_vip, is_walk_in, guest_groups(name), reception_tables(id, table_number, name, capacity, table_type, status)",
        )
        .order("name_en", { ascending: true }),
      supabase
        .from("reception_tables")
        .select("id, table_number, name, capacity, table_type, status, sort_order")
        .order("sort_order", { ascending: true })
        .order("table_number", { ascending: true }),
      supabase.from("app_settings").select("key, value").eq("key", "wedding").maybeSingle(),
    ]);

    if (guests.error) throw new Error(guests.error.message);
    if (tables.error) throw new Error(tables.error.message);

    return NextResponse.json(
      {
        ok: true,
        fetchedAt: new Date().toISOString(),
        guests: guests.data ?? [],
        tables: tables.data ?? [],
        wedding: settings.data?.value ?? null,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to load reception data",
      },
      { status: 500 },
    );
  }
}
