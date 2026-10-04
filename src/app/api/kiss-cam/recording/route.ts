import { NextResponse } from "next/server";
import { requireAuthedDataClient } from "@/lib/supabase/data-client";
import { createServiceClient } from "@/lib/supabase/service";
import type { KissCamRecordingListItem } from "@/lib/kiss-cam/recording";

export const dynamic = "force-dynamic";

/**
 * Staff: list Kiss Cam recordings (newest first).
 * Auth required — middleware allows /api/kiss-cam/* through for phone uploads,
 * so this handler enforces login itself.
 */
export async function GET() {
  try {
    await requireAuthedDataClient();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabase;
  try {
    // Service role so expired pairing sessions still resolve for labels.
    supabase = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Recording storage is not configured" },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("kiss_cam_recordings")
    .select("id, session_id, storage_path, bytes, mime_type, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sessionIds = Array.from(
    new Set((data ?? []).map((row) => row.session_id as string).filter(Boolean)),
  );

  const shortBySession = new Map<string, string>();
  if (sessionIds.length) {
    const { data: sessions } = await supabase
      .from("kiss_cam_sessions")
      .select("id, short_code")
      .in("id", sessionIds);
    for (const session of sessions ?? []) {
      shortBySession.set(session.id as string, session.short_code as string);
    }
  }

  const recordings: KissCamRecordingListItem[] = (data ?? []).map((row) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    shortCode: shortBySession.get(row.session_id as string) ?? null,
    storagePath: row.storage_path as string,
    bytes: typeof row.bytes === "number" ? row.bytes : null,
    mimeType: (row.mime_type as string | null) ?? null,
    status: row.status as KissCamRecordingListItem["status"],
    createdAt: row.created_at as string,
  }));

  return NextResponse.json({ recordings });
}
