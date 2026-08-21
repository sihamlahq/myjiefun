import type { KissCamAnimationPhase } from "@/components/kiss-cam/kiss-cam-types";

/**
 * Animation pose — INTENT ONLY.
 *
 * This module must not contain artwork pixel coordinates or SVG origins.
 * Mapping to layer transforms happens in kiss-cam-rig.ts.
 */
export type CharacterPose = {
  /** Horizontal offset from center, as % of stage width */
  x: number;
  /** Vertical nudge in % */
  y: number;
  bodyRot: number;
  headRot: number;
  scale: number;
  /** 0 = arms idle, 1 = inner hands at hold target */
  holdProgress: number;
  /** Outer arm balloon sway 0–1+ */
  balloonSway: number;
  /**
   * Kiss progress 0–1 — drives lean toward shared kiss target on the rig.
   * Prefer this over legacy kissLean; kissLean kept as alias for compatibility.
   */
  kissProgress: number;
  /** @deprecated use kissProgress — still accepted by the rig resolver */
  kissLean: number;
  /** Soft breathing amplitude 0–1 */
  breath: number;
  mouth: "smile" | "soft" | "kiss";
  eyesClosed: boolean;
};

/**
 * Couple composition for A-pose masters — wide center gap.
 * Idle ~±24%. Hold ~±10%. Kiss ~±4%. Celebration ~±12%.
 * Body lean kept small; heads do most of the kiss motion.
 */
export function poseForPhase(
  phase: KissCamAnimationPhase,
  side: "bride" | "groom",
): CharacterPose {
  const dir = side === "groom" ? -1 : 1;

  const base: CharacterPose = {
    x: dir * 24,
    y: 0,
    bodyRot: 0,
    headRot: 0,
    scale: 1,
    holdProgress: 0,
    balloonSway: 0,
    kissProgress: 0,
    kissLean: 0,
    breath: 1,
    mouth: "smile",
    eyesClosed: false,
  };

  switch (phase) {
    case "idle":
      return { ...base, x: dir * 24, balloonSway: 1 };
    case "approach":
      return {
        ...base,
        x: dir * 16,
        bodyRot: dir * -0.8,
        headRot: dir * -2.5,
        holdProgress: 0.35,
        balloonSway: 1,
      };
    case "holdHands":
      return {
        ...base,
        x: dir * 10,
        bodyRot: dir * -1.2,
        headRot: dir * -3.5,
        holdProgress: 1,
        balloonSway: 0.85,
        mouth: "soft",
      };
    case "romanticPause":
      return {
        ...base,
        x: dir * 9,
        bodyRot: dir * -1.5,
        headRot: dir * -4,
        holdProgress: 1,
        balloonSway: 0.8,
        scale: 1.008,
        mouth: "soft",
      };
    case "moveCloser":
      return {
        ...base,
        x: dir * 6.5,
        y: -0.3,
        bodyRot: dir * -2,
        headRot: dir * -5.5,
        holdProgress: 1,
        balloonSway: 0.7,
        kissProgress: 0.35,
        kissLean: 0.35,
        scale: 1.01,
        mouth: "soft",
      };
    case "countdown":
      return {
        ...base,
        x: dir * 5,
        y: -0.6,
        bodyRot: dir * -2.5,
        headRot: dir * -7,
        holdProgress: 1,
        balloonSway: 0.55,
        kissProgress: 0.6,
        kissLean: 0.6,
        scale: 1.014,
        mouth: "soft",
      };
    case "kiss":
      return {
        ...base,
        x: dir * 4,
        y: -0.9,
        bodyRot: dir * -3,
        headRot: dir * -6,
        holdProgress: 1,
        balloonSway: 0.4,
        kissProgress: 1,
        kissLean: 1,
        scale: 1.018,
        mouth: "kiss",
        eyesClosed: true,
      };
    case "celebration":
    case "final":
      return {
        ...base,
        x: dir * 12,
        y: -0.3,
        bodyRot: dir * -1.5,
        headRot: dir * -2.5,
        holdProgress: 1,
        balloonSway: 1.1,
        kissProgress: 0.1,
        kissLean: 0.1,
        scale: 1.01,
        mouth: "smile",
      };
    default:
      return base;
  }
}
