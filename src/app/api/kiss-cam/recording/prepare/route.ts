import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  KISS_CAM_RECORDING_BUCKET,
  KISS_CAM_RECORDING_MAX_BYTES,
  KISS_CAM_RECORDING_MIME,
} from "@/lib/kiss-cam/recording";

export const dynamic = "force-dynamic";

const ALLOWED_MIME = new Set<string>(KISS_CAM_RECORDING_MIME);

async function db() {
  try {
    return createServiceClient();
  } catch {
    return createClient();
  }
}

async function requireActiveSession(sessionId: string) {
  const supabase = await db();
  const { data, error } = await supabase
    .from("kiss_cam_sessions")
    .select("id")
    .eq("id", sessionId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;
  return data.id as string;
}

/**
 * Prepare a signed upload for a Kiss Cam recording.
 * Phone uploads directly to Supabase Storage (not through Next) so 50MB fits.
 */
export async function POST(request: Request) {
  let body: { sessionId?: string; mimeType?: string };
  try {
    body = (await request.json()) as { sessionId?: string; mimeType?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionId = (body.sessionId || "").trim();
  const mimeType = (body.mimeType || "video/webm").split(";")[0].trim().toLowerCase();

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json(
      { error: "Unsupported video type. Use webm or mp4." },
      { status: 400 },
    );
  }

  const activeId = await requireActiveSession(sessionId);
  if (!activeId) {
    return NextResponse.json({ error: "Session expired or not found" }, { status: 404 });
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

  const recordingId = crypto.randomUUID();
  const ext = mimeType === "video/mp4" || mimeType === "video/quicktime" ? "mp4" : "webm";
  const storagePath = `${activeId}/${recordingId}.${ext}`;

  const { error: insertError } = await supabase.from("kiss_cam_recordings").insert({
    id: recordingId,
    session_id: activeId,
    storage_path: storagePath,
    mime_type: mimeType,
    status: "pending",
  });
  if (insertError) {
    return NextResponse.json(
      { error: insertError.message || "Unable to create recording" },
      { status: 500 },
    );
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(KISS_CAM_RECORDING_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (signError || !signed) {
    await supabase
      .from("kiss_cam_recordings")
      .update({ status: "failed" })
      .eq("id", recordingId);
    return NextResponse.json(
      { error: signError?.message || "Unable to create upload URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    recordingId,
    path: signed.path ?? storagePath,
    token: signed.token,
    signedUrl: signed.signedUrl,
    maxBytes: KISS_CAM_RECORDING_MAX_BYTES,
    bucket: KISS_CAM_RECORDING_BUCKET,
  });
}
