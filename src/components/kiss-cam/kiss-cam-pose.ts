import type { KissCamAnimationPhase } from "@/components/kiss-cam/kiss-cam-types";

/**
 * Animation pose — INTENT ONLY.
 * Mapping to layer transforms happens in kiss-cam-rig.ts.
 */
export type CharacterPose = {
  x: number;
  y: number;
  bodyRot: number;
  headRot: number;
  scale: number;
  holdProgress: number;
  balloonSway: number;
  kissProgress: number;
  /** @deprecated use kissProgress */
  kissLean: number;
  breath: number;
  mouth: "smile" | "soft" | "kiss";
  eyesClosed: boolean;
};

/**
 * The groom torso is deliberately kept rigid during the animation.
 *
 * The groom artwork is built from separate torso/trouser PNG masters. Rotating
 * that composite around the hip changes the jacket hem geometry relative to
 * the trouser waistband and exposes the asset seam. The romantic movement is
 * already carried naturally by the groom's head and arms, so the torso itself
 * should stay upright.
 */
const GROOM_BODY_LEAN_DEG: Partial<Record<KissCamAnimationPhase, number>> = {
  approach: 0,
  approachClose: 0,
  holdHands: 0,
  holdHandsSettle: 0,
  romanticPause: 0,
  moveCloser: 0,
  kissPrep: 0,
  countdown: 0,
  kiss: 0,
  celebration: 0,
  final: 0,
};

function applyGroomTorsoGuard(phase: KissCamAnimationPhase, pose: CharacterPose): CharacterPose {
  const lean = GROOM_BODY_LEAN_DEG[phase];
  return { ...pose, bodyRot: lean != null ? lean : 0, scale: 1 };
}

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

  let pose: CharacterPose;
  switch (phase) {
    case "idle":
      pose = { ...base, x: dir * 24, balloonSway: 1 };
      break;

    case "approach":
      pose = {
        ...base,
        x: dir * 19,
        bodyRot: dir * -0.6,
        headRot: dir * -1.8,
        holdProgress: 0.2,
        balloonSway: 1,
      };
      break;

    case "approachClose":
      pose = {
        ...base,
        x: dir * 14,
        bodyRot: dir * -0.9,
        headRot: dir * -2.8,
        holdProgress: 0.55,
        balloonSway: 0.95,
        mouth: "soft",
      };
      break;

    case "holdHands":
      pose = {
        ...base,
        x: dir * 10.5,
        bodyRot: dir * -1.1,
        headRot: dir * -3.4,
        holdProgress: 0.9,
        balloonSway: 0.88,
        mouth: "soft",
      };
      break;

    case "holdHandsSettle":
      pose = {
        ...base,
        x: dir * 9.7,
        bodyRot: dir * -1.25,
        headRot: dir * -3.7,
        holdProgress: 1,
        balloonSway: 0.82,
        mouth: "soft",
      };
      break;

    case "romanticPause":
      pose = {
        ...base,
        x: dir * 8.8,
        bodyRot: dir * -1.35,
        headRot: dir * -4.2,
        holdProgress: 1,
        balloonSway: 0.78,
        scale: 1.006,
        mouth: "soft",
      };
      break;

    case "moveCloser":
      pose = {
        ...base,
        x: dir * 7,
        y: -0.15,
        bodyRot: dir * -1.7,
        headRot: dir * -5,
        holdProgress: 1,
        balloonSway: 0.68,
        kissProgress: 0.25,
        kissLean: 0.25,
        scale: 1.008,
        mouth: "soft",
      };
      break;

    case "kissPrep":
      pose = {
        ...base,
        x: dir * 5.2,
        y: -0.35,
        bodyRot: dir * -2,
        headRot: dir * -6.2,
        holdProgress: 1,
        balloonSway: 0.58,
        kissProgress: 0.55,
        kissLean: 0.55,
        scale: 1.01,
        mouth: "soft",
      };
      break;

    case "countdown":
      pose = {
        ...base,
        x: dir * 4.5,
        y: -0.5,
        bodyRot: dir * -2.2,
        headRot: dir * -6.8,
        holdProgress: 1,
        balloonSway: 0.5,
        kissProgress: 0.7,
        kissLean: 0.7,
        scale: 1.012,
        mouth: "soft",
      };
      break;

    case "kiss":
      pose = {
        ...base,
        x: dir * 4,
        y: -0.75,
        bodyRot: dir * -2.5,
        headRot: dir * -6.2,
        holdProgress: 1,
        balloonSway: 0.35,
        kissProgress: 1,
        kissLean: 1,
        scale: 1.015,
        mouth: "kiss",
        eyesClosed: true,
      };
      break;

    case "celebration":
    case "final":
      pose = {
        ...base,
        x: dir * 12,
        y: -0.25,
        bodyRot: dir * -1.3,
        headRot: dir * -2.3,
        holdProgress: 1,
        balloonSway: 1.05,
        kissProgress: 0.1,
        kissLean: 0.1,
        scale: 1.008,
        mouth: "smile",
      };
      break;

    default:
      pose = base;
      break;
  }

  return side === "groom" ? applyGroomTorsoGuard(phase, pose) : pose;
}
