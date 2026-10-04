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

/** Pairing session lifetime — long enough for a reception day. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** Renew when less than this remains, so phones keep working without a new QR. */
export const SESSION_RENEW_WITHIN_MS = 60 * 60 * 1000;

const SESSION_STORAGE_KEY = "kiss-cam-active-session-v1";

export type StoredKissCamSession = {
  id: string;
  shortCode: string;
  expiresAt: number;
};

export function readStoredSession(): StoredKissCamSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredKissCamSession>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.shortCode !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }
    return {
      id: parsed.id,
      shortCode: parsed.shortCode,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

export function writeStoredSession(session: StoredKissCamSession) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore quota / private mode
  }
}

export function clearStoredSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

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
