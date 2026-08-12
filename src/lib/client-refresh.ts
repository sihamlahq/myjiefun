/** Soften double refreshes after local mutations (actions already update UI optimistically). */
let suppressUntil = 0;

export function suppressRealtimeRefresh(ms = 1500) {
  suppressUntil = Math.max(suppressUntil, Date.now() + ms);
}

export function isRealtimeRefreshSuppressed() {
  return Date.now() < suppressUntil;
}
