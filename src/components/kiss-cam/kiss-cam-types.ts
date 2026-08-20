export type KissCamStatus = "standby" | "running" | "preview";

export type KissCamAnimationPhase =
  | "idle"
  | "approach"
  | "holdHands"
  | "romanticPause"
  | "moveCloser"
  | "countdown"
  | "kiss"
  | "celebration"
  | "final";

export type CameraConnectionState = "waiting" | "connecting" | "connected" | "disconnected" | "reconnecting";

export type CameraLayoutMode = "center" | "portrait" | "rounded" | "full";

export type ConnectionQuality = {
  score: number; // 0–100
  label: "excellent" | "good" | "fair" | "poor" | "unknown";
  bitrateKbps: number | null;
  packetLoss: number | null;
};

export type KissCamState = {
  status: KissCamStatus;
  animation: KissCamAnimationPhase;
  startedAt: number | null;
  countdownEnabled: boolean;
  cameraEnabled: boolean;
  autoReturn: boolean;
  durationScale: number;
  sessionId: string | null;
  shortCode: string | null;
  sessionExpiresAt: number | null;
  cameraState: CameraConnectionState;
  connectionQuality: ConnectionQuality | null;
  cameraLayout: CameraLayoutMode;
  fullscreen: boolean;
  countdownValue: number | null;
};

export const defaultKissCamState: KissCamState = {
  status: "standby",
  animation: "idle",
  startedAt: null,
  countdownEnabled: true,
  cameraEnabled: true,
  autoReturn: true,
  durationScale: 1,
  sessionId: null,
  shortCode: null,
  sessionExpiresAt: null,
  cameraState: "waiting",
  connectionQuality: null,
  cameraLayout: "center",
  fullscreen: false,
  countdownValue: null,
};

/** Timeline milestones in ms (base duration ≈ 16s + hold). */
export const KISS_CAM_TIMELINE = {
  appearEnd: 2000,
  approachEnd: 5000,
  holdHandsEnd: 6500,
  romanticPauseEnd: 8000,
  moveCloserEnd: 10000,
  countdownEnd: 11000,
  kissEnd: 12500,
  celebrationEnd: 16000,
  finalHold: 20000,
} as const;

export function phaseAtElapsed(elapsedMs: number, countdownEnabled: boolean): {
  phase: KissCamAnimationPhase;
  countdownValue: number | null;
} {
  const t = elapsedMs;
  if (t < KISS_CAM_TIMELINE.appearEnd) return { phase: "idle", countdownValue: null };
  if (t < KISS_CAM_TIMELINE.approachEnd) return { phase: "approach", countdownValue: null };
  if (t < KISS_CAM_TIMELINE.holdHandsEnd) return { phase: "holdHands", countdownValue: null };
  if (t < KISS_CAM_TIMELINE.romanticPauseEnd) return { phase: "romanticPause", countdownValue: null };
  if (t < KISS_CAM_TIMELINE.moveCloserEnd) return { phase: "moveCloser", countdownValue: null };
  if (countdownEnabled && t < KISS_CAM_TIMELINE.countdownEnd) {
    const into = t - KISS_CAM_TIMELINE.moveCloserEnd;
    const value = into < 333 ? 3 : into < 666 ? 2 : 1;
    return { phase: "countdown", countdownValue: value };
  }
  const kissStart = countdownEnabled ? KISS_CAM_TIMELINE.countdownEnd : KISS_CAM_TIMELINE.moveCloserEnd;
  const kissEnd = kissStart + 1500;
  const celebEnd = kissEnd + 3500;
  if (t < kissEnd) return { phase: "kiss", countdownValue: null };
  if (t < celebEnd) return { phase: "celebration", countdownValue: null };
  return { phase: "final", countdownValue: null };
}

export function totalDurationMs(countdownEnabled: boolean, scale = 1) {
  const base = countdownEnabled ? KISS_CAM_TIMELINE.finalHold : KISS_CAM_TIMELINE.finalHold - 1000;
  return Math.round(base * scale);
}
