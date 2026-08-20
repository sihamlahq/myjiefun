const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `kc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createShortCode(length = 6) {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

export const SESSION_TTL_MS = 15 * 60 * 1000;

export function cameraPagePath(sessionId: string, siteUrl?: string) {
  const base = (siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://tablewedding.com").replace(
    /\/$/,
    "",
  );
  return `${base}/reception/kiss-cam/camera?session=${encodeURIComponent(sessionId)}`;
}

export function cameraCodePath(shortCode: string, siteUrl?: string) {
  const base = (siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://tablewedding.com").replace(
    /\/$/,
    "",
  );
  return `${base}/reception/kiss-cam/camera?code=${encodeURIComponent(shortCode)}`;
}

export function signalingChannelName(sessionId: string) {
  return `kiss-cam-${sessionId}`;
}
