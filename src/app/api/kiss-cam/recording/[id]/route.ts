import { NextResponse } from "next/server";
import { requireAuthedDataClient } from "@/lib/supabase/data-client";
import { createServiceClient } from "@/lib/supabase/service";
import { KISS_CAM_RECORDING_BUCKET } from "@/lib/kiss-cam/recording";

export const dynamic = "force-dynamic";

const SIGNED_URL_TTL_SEC = 60 * 30; // 30 minutes

type RouteContext = { params: Promise<{ id: string }> };

async function requireStaffService() {
  try {
    await requireAuthedDataClient();
  } catch {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  try {
    return { supabase: createServiceClient() };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Recording storage is not configured" },
        { status: 503 },
      ),
    };
  }
}

/**
 * Staff: signed URL to view / download a Kiss Cam recording.
 * Pass `?download=1` to force Content-Disposition: attachment (needed for cross-origin download).
 */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const recordingId = (id || "").trim();
  if (!recordingId) {
    return NextResponse.json({ error: "Missing recording id" }, { status: 400 });
  }

  const wantDownload =
    new URL(request.url).searchParams.get("download") === "1" ||
    new URL(request.url).searchParams.get("download") === "true";

  const gated = await requireStaffService();
  if ("error" in gated) return gated.error;
  const { supabase } = gated;

  const { data: row, error } = await supabase
    .from("kiss_cam_recordings")
    .select("id, storage_path, mime_type, status, bytes, created_at")
    .eq("id", recordingId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }
  if (row.status !== "ready") {
    return NextResponse.json(
      { error: `Recording is ${row.status}, not ready to play` },
      { status: 409 },
    );
  }

  const fileName =
    (row.storage_path as string).split("/").pop() || `kiss-cam-${recordingId}.webm`;

  const { data: signed, error: signError } = await supabase.storage
    .from(KISS_CAM_RECORDING_BUCKET)
    .createSignedUrl(
      row.storage_path as string,
      SIGNED_URL_TTL_SEC,
      wantDownload ? { download: fileName } : undefined,
    );

  if (signError || !signed?.signedUrl) {
    return NextResponse.json(
      { error: signError?.message || "Unable to create download URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: row.id,
    url: signed.signedUrl,
    expiresIn: SIGNED_URL_TTL_SEC,
    mimeType: row.mime_type,
    bytes: row.bytes,
    fileName,
    createdAt: row.created_at,
    download: wantDownload,
  });
}

/**
 * Staff: delete a Kiss Cam recording (storage object + metadata row).
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const recordingId = (id || "").trim();
  if (!recordingId) {
    return NextResponse.json({ error: "Missing recording id" }, { status: 400 });
  }

  const gated = await requireStaffService();
  if ("error" in gated) return gated.error;
  const { supabase } = gated;

  const { data: row, error } = await supabase
    .from("kiss_cam_recordings")
    .select("id, storage_path")
    .eq("id", recordingId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }

  const storagePath = row.storage_path as string;
  const { error: removeError } = await supabase.storage
    .from(KISS_CAM_RECORDING_BUCKET)
    .remove([storagePath]);

  if (removeError) {
    // Still try to drop the metadata row if the object is already gone.
    const missing =
      /not found|does not exist|No such file/i.test(removeError.message || "");
    if (!missing) {
      return NextResponse.json({ error: removeError.message }, { status: 500 });
    }
  }

  const { error: deleteError } = await supabase
    .from("kiss_cam_recordings")
    .delete()
    .eq("id", recordingId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: recordingId });
}
