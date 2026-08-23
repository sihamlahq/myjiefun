/** PostgREST PGRST303 — access token `iat` is ahead of the validator clock. */
export function isJwtClockSkewError(message: string | null | undefined): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("jwt issued at future") ||
    normalized.includes("issued at future") ||
    normalized.includes("issued in the future") ||
    normalized.includes("pgrst303")
  );
}

export const JWT_CLOCK_SKEW_HELP =
  "JWT issued at future — your session token looks newer than the database clock. Sync this device’s date & time (automatic / NTP), then sign out and sign in again. If it persists, wait a minute and retry (temporary Auth ↔ database clock skew).";
