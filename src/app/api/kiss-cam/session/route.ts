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

type SessionBody = {
  /** Force a brand-new QR / pairing session. */
  refresh?: boolean;
  /** Reuse / extend this existing session id (keeps the same QR). */
  sessionId?: string;
  /** Kept with sessionId so ephemeral renew can preserve the QR text. */
  shortCode?: string;
};

function ephemeralPayload(
  id: string,
  shortCode: string,
  opts: { reused: boolean; warning?: string },
) {
  return {
    id,
    shortCode,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    ephemeral: true,
    reused: opts.reused,
    ...(opts.warning ? { warning: opts.warning } : null),
  };
}

/**
 * Create or reuse a Kiss Cam pairing session.
 * - { refresh: true }: mint a new QR (id + short code).
 * - { sessionId, shortCode? }: extend / keep that session; QR stays the same.
 */
export async function POST(request: Request) {
  let body: SessionBody = {};
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      body = (await request.json()) as SessionBody;
    }
  } catch {
    body = {};
  }

  const wantRefresh = body.refresh === true;
  const reuseId = (body.sessionId || "").trim();
  const reuseCode = (body.shortCode || "").trim().toUpperCase();

  try {
    const supabase = await db();
    const expires_at = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    // Keep the same QR: extend an existing pairing session.
    if (!wantRefresh && reuseId) {
      const { data: existing, error: findError } = await supabase
        .from("kiss_cam_sessions")
        .select("id, short_code, expires_at")
        .eq("id", reuseId)
        .maybeSingle();

      if (!findError && existing) {
        const { data: renewed, error: renewError } = await supabase
          .from("kiss_cam_sessions")
          .update({ expires_at })
          .eq("id", reuseId)
          .select("id, short_code, expires_at")
          .maybeSingle();

        if (!renewError && renewed) {
          return NextResponse.json({
            id: renewed.id,
            shortCode: renewed.short_code,
            expiresAt: renewed.expires_at,
            ephemeral: false,
            reused: true,
          });
        }

        return NextResponse.json({
          id: existing.id,
          shortCode: existing.short_code,
          expiresAt: existing.expires_at,
          ephemeral: false,
          reused: true,
        });
      }

      // Row gone from DB but LED still has the QR — keep serving the same pairing ids.
      if (reuseCode) {
        const { error: reinsertError } = await supabase.from("kiss_cam_sessions").insert({
          id: reuseId,
          short_code: reuseCode,
          expires_at,
        });
        if (!reinsertError) {
          return NextResponse.json({
            id: reuseId,
            shortCode: reuseCode,
            expiresAt: expires_at,
            ephemeral: false,
            reused: true,
          });
        }
      }
      // Fall through to mint only when we cannot preserve the QR.
    }

    const id = createSessionId();
    const short_code = createShortCode(6);

    const { error } = await supabase.from("kiss_cam_sessions").insert({
      id,
      short_code,
      expires_at,
    });

    if (error) {
      console.warn("[kiss-cam] session insert failed, using ephemeral:", error.message);
      return NextResponse.json(
        ephemeralPayload(id, short_code, {
          reused: false,
          warning: error.message,
        }),
      );
    }

    void supabase.from("kiss_cam_sessions").delete().lt("expires_at", new Date().toISOString());

    return NextResponse.json({
      id,
      shortCode: short_code,
      expiresAt: expires_at,
      ephemeral: false,
      reused: false,
    });
  } catch (error) {
    const warning = error instanceof Error ? error.message : "Session store unavailable";
    // Offline / misconfigured: still honor reuse so the LED QR does not flip.
    if (!wantRefresh && reuseId && reuseCode) {
      return NextResponse.json(
        ephemeralPayload(reuseId, reuseCode, { reused: true, warning }),
      );
    }
    return NextResponse.json(
      ephemeralPayload(createSessionId(), createShortCode(6), {
        reused: false,
        warning,
      }),
    );
  }
}
