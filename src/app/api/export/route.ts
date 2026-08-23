import { NextRequest, NextResponse } from "next/server";
import { guestsToCsv } from "@/lib/csv";
import { requireAuthedDataClient } from "@/lib/supabase/data-client";
import type { GuestWithRelations } from "@/types/wedding";

export async function GET(request: NextRequest) {
  let supabase: Awaited<ReturnType<typeof requireAuthedDataClient>>["supabase"];
  try {
    ({ supabase } = await requireAuthedDataClient());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase is not configured.";
    const status = message === "Unauthorized" ? 401 : 503;
    return NextResponse.json({ error: message }, { status });
  }

  const type = request.nextUrl.searchParams.get("type") ?? "guests";
  if (type !== "guests") {
    return NextResponse.json({ error: "Unsupported export type." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("guests")
    .select("*, guest_groups(*), reception_tables(*), seats(*)")
    .order("name_en", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(guestsToCsv((data ?? []) as GuestWithRelations[]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="myjiefun-guests-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
