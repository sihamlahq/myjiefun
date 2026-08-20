import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

async function db() {
  try {
    return createServiceClient();
  } catch {
    return createClient();
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") || "").trim().toUpperCase();
  const id = (searchParams.get("id") || "").trim();

  if (!code && !id) {
    return NextResponse.json({ error: "Missing code or id" }, { status: 400 });
  }

  try {
    const supabase = await db();
    let query = supabase
      .from("kiss_cam_sessions")
      .select("id, short_code, expires_at")
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    query = id ? query.eq("id", id) : query.eq("short_code", code);

    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "Session expired or not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: data.id,
      shortCode: data.short_code,
      expiresAt: data.expires_at,
    });
  } catch {
    return NextResponse.json({ error: "Session lookup unavailable" }, { status: 503 });
  }
}
