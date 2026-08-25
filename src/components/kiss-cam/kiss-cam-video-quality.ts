/**
 * Adaptive Kiss Cam WebRTC video quality.
 *
 * Philosophy: highest *sustainable* clarity + smooth motion — not max specs.
 * Profiles change via RTCRtpSender.setParameters() only (no reconnect).
 */

export type VideoQualityProfile = "ultra" | "high" | "medium" | "low";

export type VideoEncodingProfile = {
  id: VideoQualityProfile;
  /** Target capture/display class (for UI / diagnostics). */
  labelWidth: number;
  labelHeight: number;
  maxBitrate: number;
  maxFramerate: number;
  /** Encoder scale relative to captured track (1 = full). */
  scaleResolutionDownBy: number;
};

/** Ordered best → worst for step-wise upgrades/downgrades. */
export const VIDEO_PROFILE_ORDER: VideoQualityProfile[] = [
  "ultra",
  "high",
  "medium",
  "low",
];

export const VIDEO_ENCODING_PROFILES: Record<VideoQualityProfile, VideoEncodingProfile> = {
  ultra: {
    id: "ultra",
    labelWidth: 1920,
    labelHeight: 1080,
    maxBitrate: 6_500_000,
    maxFramerate: 30,
    scaleResolutionDownBy: 1,
  },
  high: {
    id: "high",
    labelWidth: 1280,
    labelHeight: 720,
    maxBitrate: 3_500_000,
    maxFramerate: 30,
    // 1920/1280 ≈ 1.5 when capture is 1080p
    scaleResolutionDownBy: 1.5,
  },
  medium: {
    id: "medium",
    labelWidth: 960,
    labelHeight: 540,
    maxBitrate: 1_800_000,
    maxFramerate: 24,
    scaleResolutionDownBy: 2,
  },
  low: {
    id: "low",
    labelWidth: 640,
    labelHeight: 360,
    maxBitrate: 850_000,
    maxFramerate: 20,
    scaleResolutionDownBy: 3,
  },
};

export type NetworkSample = {
  /** Round-trip seconds (candidate-pair currentRoundTripTime). */
  rttMs: number | null;
  /** Fraction 0–1. */
  packetLoss: number | null;
  /** Candidate-pair availableOutgoingBitrate (bits/s) when present. */
  availableBitrateBps: number | null;
  /** Measured send/receive media bitrate (bits/s). */
  mediaBitrateBps: number | null;
  qualityLimitationReason: string | null;
  frameWidth: number | null;
  frameHeight: number | null;
  framesPerSecond: number | null;
};

export type NetworkBand = "strong" | "good" | "weak" | "very-weak" | "unknown";

export function classifyNetworkBand(sample: NetworkSample): NetworkBand {
  const rtt = sample.rttMs;
  const loss = sample.packetLoss;
  const availKbps =
    sample.availableBitrateBps != null
      ? sample.availableBitrateBps / 1000
      : sample.mediaBitrateBps != null
        ? sample.mediaBitrateBps / 1000
        : null;

  // Prefer availableOutgoingBitrate when present; fall back to measured media rate.
  const limited =
    sample.qualityLimitationReason === "bandwidth" ||
    sample.qualityLimitationReason === "cpu";

  if (rtt == null && loss == null && availKbps == null) return "unknown";

  // Very weak — prioritize stability
  if (
    (rtt != null && rtt > 400) ||
    (loss != null && loss > 0.07) ||
    (availKbps != null && availKbps < 1000) ||
    (limited && availKbps != null && availKbps < 1500)
  ) {
    return "very-weak";
  }

  // Weak
  if (
    (rtt != null && rtt > 250) ||
    (loss != null && loss > 0.03) ||
    (availKbps != null && availKbps < 2000)
  ) {
    return "weak";
  }

  // Good
  if (
    (rtt != null && rtt > 120) ||
    (loss != null && loss > 0.01) ||
    (availKbps != null && availKbps < 4000)
  ) {
    return "good";
  }

  // Strong
  if (
    (rtt == null || rtt <= 120) &&
    (loss == null || loss <= 0.01) &&
    (availKbps == null || availKbps >= 4000)
  ) {
    return "strong";
  }

  return "good";
}

export function targetProfileForBand(band: NetworkBand): VideoQualityProfile {
  switch (band) {
    case "strong":
      return "ultra";
    case "good":
      return "high";
    case "weak":
      return "medium";
    case "very-weak":
      return "low";
    default:
      return "high";
  }
}

export function profileRank(profile: VideoQualityProfile): number {
  return VIDEO_PROFILE_ORDER.indexOf(profile);
}

/** Step one profile toward target (never jump ultra↔low in one tick). */
export function stepTowardProfile(
  current: VideoQualityProfile,
  target: VideoQualityProfile,
): VideoQualityProfile {
  const cur = profileRank(current);
  const tgt = profileRank(target);
  if (cur === tgt) return current;
  if (tgt < cur) return VIDEO_PROFILE_ORDER[cur - 1]!; // upgrade (toward better)
  return VIDEO_PROFILE_ORDER[cur + 1]!; // downgrade
}

export type AdaptiveControllerOptions = {
  /** Samples of bad band required before downgrade (~2–3s at 1Hz). */
  downgradeHoldSamples?: number;
  /** Samples of good band required before upgrade (~5–8s at 1Hz). */
  upgradeHoldSamples?: number;
  initialProfile?: VideoQualityProfile;
};

/**
 * Hysteresis quality controller — one profile step at a time, sustained conditions only.
 */
export class AdaptiveVideoQualityController {
  private profile: VideoQualityProfile;
  private pendingTarget: VideoQualityProfile | null = null;
  private pendingCount = 0;
  private readonly downgradeHold: number;
  private readonly upgradeHold: number;

  constructor(opts: AdaptiveControllerOptions = {}) {
    this.profile = opts.initialProfile ?? "high";
    this.downgradeHold = opts.downgradeHoldSamples ?? 3;
    this.upgradeHold = opts.upgradeHoldSamples ?? 6;
  }

  get current(): VideoQualityProfile {
    return this.profile;
  }

  get encoding(): VideoEncodingProfile {
    return VIDEO_ENCODING_PROFILES[this.profile];
  }

  /** Feed one ~1s network sample. Returns new profile when it changes. */
  observe(sample: NetworkSample): VideoQualityProfile | null {
    const band = classifyNetworkBand(sample);
    const desired = targetProfileForBand(band);
    if (desired === this.profile) {
      this.pendingTarget = null;
      this.pendingCount = 0;
      return null;
    }

    if (this.pendingTarget !== desired) {
      this.pendingTarget = desired;
      this.pendingCount = 1;
      return null;
    }

    this.pendingCount += 1;
    const upgrading = profileRank(desired) < profileRank(this.profile);
    const need = upgrading ? this.upgradeHold : this.downgradeHold;
    if (this.pendingCount < need) return null;

    const next = stepTowardProfile(this.profile, desired);
    this.profile = next;
    // Keep pending toward ultimate desired so multi-step climbs continue.
    if (next === desired) {
      this.pendingTarget = null;
      this.pendingCount = 0;
    } else {
      this.pendingCount = 0;
    }
    return next;
  }

  reset(profile: VideoQualityProfile = "high") {
    this.profile = profile;
    this.pendingTarget = null;
    this.pendingCount = 0;
  }
}

/** Capture constraints: 1080p30 ideal — never force 60fps for wedding WebRTC. */
export const KISS_CAM_CAPTURE_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1920, max: 1920 },
  height: { ideal: 1080, max: 1080 },
  frameRate: { ideal: 30, max: 30 },
};

export function formatProfileResolution(profile: VideoQualityProfile): string {
  const p = VIDEO_ENCODING_PROFILES[profile];
  return `${p.labelHeight}p${p.maxFramerate}`;
}

export function scoreFromNetwork(
  band: NetworkBand,
  profile: VideoQualityProfile,
  sample: NetworkSample,
): { score: number; label: "excellent" | "good" | "fair" | "poor" | "unknown" } {
  // Align label with *actual* sustained profile so UI isn't "Excellent" at 360p.
  if (band === "unknown" && sample.mediaBitrateBps == null) {
    return { score: 0, label: "unknown" };
  }

  switch (profile) {
    case "ultra":
      return { score: band === "strong" ? 96 : 90, label: "excellent" };
    case "high":
      return { score: 82, label: "good" };
    case "medium":
      return { score: 58, label: "fair" };
    case "low":
      return { score: 32, label: "poor" };
    default:
      return { score: 50, label: "fair" };
  }
}
