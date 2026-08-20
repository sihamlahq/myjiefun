import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createSessionId, createShortCode, SESSION_TTL_MS } from "@/components/kiss-cam/kiss-cam-session";

export const dynamic = "force-dynamic";

async function db() {
  try {
    return createServiceClient();
  } catch {
    return createClient();
  }
}

export async function POST() {
  try {
    const supabase = await db();
    const id = createSessionId();
    const short_code = createShortCode(6);
    const expires_at = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    const { error } = await supabase.from("kiss_cam_sessions").insert({
      id,
      short_code,
      expires_at,
    });

    if (error) {
      // Table may not exist yet — still return ephemeral session for local/dev.
      console.warn("[kiss-cam] session insert failed, using ephemeral:", error.message);
      return NextResponse.json({
        id,
        shortCode: short_code,
        expiresAt: expires_at,
        ephemeral: true,
      });
    }

    // Best-effort cleanup of expired rows
    void supabase.from("kiss_cam_sessions").delete().lt("expires_at", new Date().toISOString());

    return NextResponse.json({
      id,
      shortCode: short_code,
      expiresAt: expires_at,
      ephemeral: false,
    });
  } catch (error) {
    const id = createSessionId();
    const shortCode = createShortCode(6);
    return NextResponse.json({
      id,
      shortCode,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      ephemeral: true,
      warning: error instanceof Error ? error.message : "Session store unavailable",
    });
  }
}
