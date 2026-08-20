export type IceServerConfig = RTCIceServer;

const FALLBACK_STUN: IceServerConfig[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/** Sync fallback used only before /api/kiss-cam/ice responds. Prefer fetchIceServers(). */
export function getIceServers(): IceServerConfig[] {
  const servers: IceServerConfig[] = [...FALLBACK_STUN];

  const turnUrls = (process.env.NEXT_PUBLIC_TURN_URLS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const username = process.env.NEXT_PUBLIC_TURN_USERNAME || "";
  const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "";

  if (turnUrls.length && username && credential) {
    servers.push({ urls: turnUrls, username, credential });
  }

  return servers;
}

export async function fetchIceServers(): Promise<{
  iceServers: IceServerConfig[];
  turnConfigured: boolean;
}> {
  try {
    const res = await fetch("/api/kiss-cam/ice", { cache: "no-store" });
    if (!res.ok) throw new Error("ice fetch failed");
    const json = (await res.json()) as {
      iceServers: IceServerConfig[];
      turnConfigured?: boolean;
    };
    return {
      iceServers: json.iceServers?.length ? json.iceServers : FALLBACK_STUN,
      turnConfigured: Boolean(json.turnConfigured),
    };
  } catch {
    return { iceServers: getIceServers(), turnConfigured: false };
  }
}

export function hasTurnConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_TURN_URLS &&
      process.env.NEXT_PUBLIC_TURN_USERNAME &&
      process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
  );
}
