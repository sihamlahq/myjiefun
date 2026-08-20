import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Returns ICE servers for WebRTC. TURN credentials stay server-side
 * (TURN_URLS / TURN_USERNAME / TURN_CREDENTIAL) with optional NEXT_PUBLIC_* fallbacks.
 */
export async function GET() {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrls = (process.env.TURN_URLS || process.env.NEXT_PUBLIC_TURN_URLS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const username = process.env.TURN_USERNAME || process.env.NEXT_PUBLIC_TURN_USERNAME || "";
  const credential = process.env.TURN_CREDENTIAL || process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "";

  if (turnUrls.length && username && credential) {
    servers.push({ urls: turnUrls, username, credential });
  }

  return NextResponse.json({
    iceServers: servers,
    turnConfigured: Boolean(turnUrls.length && username && credential),
  });
}
