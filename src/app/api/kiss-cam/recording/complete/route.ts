import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  KISS_CAM_RECORDING_BUCKET,
  KISS_CAM_RECORDING_MAX_BYTES,
} from "@/lib/kiss-cam/recording";

export const dynamic = "force-dynamic";

/**
 * Mark a Kiss Cam recording as ready after a successful direct Storage upload.
 */
export async function POST(request: Request) {
  let body: {
    sessionId?: string;
    recordingId?: string;
    bytes?: number;
    mimeType?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionId = (body.sessionId || "").trim();
  const recordingId = (body.recordingId || "").trim();
  const bytes = typeof body.bytes === "number" ? body.bytes : NaN;
  const mimeType = (body.mimeType || "").split(";")[0].trim().toLowerCase() || null;

  if (!sessionId || !recordingId) {
    return NextResponse.json({ error: "Missing sessionId or recordingId" }, { status: 400 });
  }
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return NextResponse.json({ error: "Invalid byte size" }, { status: 400 });
  }
  if (bytes > KISS_CAM_RECORDING_MAX_BYTES) {
    return NextResponse.json(
      {
        error: `Recording exceeds the ${KISS_CAM_RECORDING_MAX_BYTES / (1024 * 1024)}MB limit`,
      },
      { status: 413 },
    );
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Recording storage is not configured" },
      { status: 503 },
    );
  }

  const { data: row, error: findError } = await supabase
    .from("kiss_cam_recordings")
    .select("id, session_id, storage_path, status")
    .eq("id", recordingId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (findError || !row) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }

  const { data: listed, error: listError } = await supabase.storage
    .from(KISS_CAM_RECORDING_BUCKET)
    .list(sessionId, { search: recordingId, limit: 5 });

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const fileName = row.storage_path.split("/").pop();
  const found = (listed ?? []).some((obj) => obj.name === fileName);
  if (!found) {
    await supabase
      .from("kiss_cam_recordings")
      .update({ status: "failed", bytes, mime_type: mimeType })
      .eq("id", recordingId);
    return NextResponse.json({ error: "Upload not found in storage" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("kiss_cam_recordings")
    .update({
      status: "ready",
      bytes,
      mime_type: mimeType,
    })
    .eq("id", recordingId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    id: recordingId,
    status: "ready",
    bytes,
    maxBytes: KISS_CAM_RECORDING_MAX_BYTES,
  });
}
