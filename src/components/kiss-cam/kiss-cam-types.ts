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
  /** Active adaptive encode profile (camera) or inferred receive class (display). */
  profile?: "ultra" | "high" | "medium" | "low" | null;
  frameWidth?: number | null;
  frameHeight?: number | null;
  framesPerSecond?: number | null;
  rttMs?: number | null;
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

/** One beat per countdown digit (3 → 2 → 1). Keep in sync with CSS. */
export const COUNTDOWN_BEAT_MS = 1000;

/** Timeline milestones in ms (base duration ≈ 24s with countdown). */
export const KISS_CAM_TIMELINE = {
  appearEnd: 2000,
  approachEnd: 5000,
  holdHandsEnd: 6500,
  romanticPauseEnd: 8000,
  moveCloserEnd: 10000,
  /** 3s smooth 3-2-1 (1s each). */
  countdownEnd: 10000 + COUNTDOWN_BEAT_MS * 3,
  kissDuration: 2400,
  celebrationDuration: 4500,
  finalHold: 24000,
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
    const beat = COUNTDOWN_BEAT_MS;
    const value = into < beat ? 3 : into < beat * 2 ? 2 : 1;
    return { phase: "countdown", countdownValue: value };
  }

  const kissStart = countdownEnabled ? KISS_CAM_TIMELINE.countdownEnd : KISS_CAM_TIMELINE.moveCloserEnd;
  const kissEnd = kissStart + KISS_CAM_TIMELINE.kissDuration;
  const celebEnd = kissEnd + KISS_CAM_TIMELINE.celebrationDuration;
  if (t < kissEnd) return { phase: "kiss", countdownValue: null };
  if (t < celebEnd) return { phase: "celebration", countdownValue: null };
  return { phase: "final", countdownValue: null };
}

export function totalDurationMs(countdownEnabled: boolean, scale = 1) {
  const base = countdownEnabled
    ? KISS_CAM_TIMELINE.finalHold
    : KISS_CAM_TIMELINE.finalHold - COUNTDOWN_BEAT_MS * 3;
  return Math.round(base * scale);
}
