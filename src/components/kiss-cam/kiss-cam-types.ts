export type KissCamStatus = "standby" | "running" | "preview";

export type KissCamAnimationPhase =
  | "idle"
  | "approach"
  | "approachClose"
  | "holdHands"
  | "holdHandsSettle"
  | "romanticPause"
  | "moveCloser"
  | "kissPrep"
  | "countdown"
  | "kiss"
  | "celebration"
  | "final";

export type CameraConnectionState = "waiting" | "connecting" | "connected" | "disconnected" | "reconnecting";

export type CameraLayoutMode = "center" | "portrait" | "rounded" | "full";

export type ConnectionQuality = {
  score: number;
  label: "excellent" | "good" | "fair" | "poor" | "unknown";
  bitrateKbps: number | null;
  packetLoss: number | null;
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

export const COUNTDOWN_BEAT_MS = 1000;

/** More, shorter motion beats make the couple travel continuously instead of jumping between large poses. */
export const KISS_CAM_TIMELINE = {
  appearEnd: 1500,
  approachEnd: 3000,
  approachCloseEnd: 4500,
  holdHandsEnd: 5800,
  holdHandsSettleEnd: 6800,
  romanticPauseEnd: 8000,
  moveCloserEnd: 9000,
  kissPrepEnd: 10000,
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
  if (t < KISS_CAM_TIMELINE.approachCloseEnd) return { phase: "approachClose", countdownValue: null };
  if (t < KISS_CAM_TIMELINE.holdHandsEnd) return { phase: "holdHands", countdownValue: null };
  if (t < KISS_CAM_TIMELINE.holdHandsSettleEnd) return { phase: "holdHandsSettle", countdownValue: null };
  if (t < KISS_CAM_TIMELINE.romanticPauseEnd) return { phase: "romanticPause", countdownValue: null };
  if (t < KISS_CAM_TIMELINE.moveCloserEnd) return { phase: "moveCloser", countdownValue: null };

  if (t < KISS_CAM_TIMELINE.kissPrepEnd) return { phase: "kissPrep", countdownValue: null };

  if (countdownEnabled && t < KISS_CAM_TIMELINE.countdownEnd) {
    const into = t - KISS_CAM_TIMELINE.kissPrepEnd;
    const beat = COUNTDOWN_BEAT_MS;
    const value = into < beat ? 3 : into < beat * 2 ? 2 : 1;
    return { phase: "countdown", countdownValue: value };
  }

  const kissStart = countdownEnabled ? KISS_CAM_TIMELINE.countdownEnd : KISS_CAM_TIMELINE.kissPrepEnd;
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
