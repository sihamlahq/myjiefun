/**
 * Kiss Cam character rig — artwork coordinate system for the premium PNG puppets.
 *
 * Architecture:
 *   poseForPhase()  →  CharacterPose (animation intent only)
 *        ↓
 *   resolveCharacterRig()  →  layer transforms from MEASURED joints
 *        ↓
 *   GroomFigure / BrideFigure  →  nested CSS transforms
 *
 * Joints are measured from public/assets/kiss-cam/{groom|bride}/*.png
 * (see masters/joints.json). They are NOT the legacy SVG origins.
 */

import type { CharacterPose } from "@/components/kiss-cam/kiss-cam-pose";

export const STAGE_W = 720;
export const STAGE_H = 1380;

export type Vec2 = { x: number; y: number };

export type ArmSide = "left" | "right";

export type CharacterRigJoints = {
  headPivot: Vec2;
  leftShoulder: Vec2;
  leftElbow: Vec2;
  leftWrist: Vec2;
  rightShoulder: Vec2;
  rightElbow: Vec2;
  rightWrist: Vec2;
  bodyPivot: Vec2;
  hipPivot: Vec2;
  /** Rest (painted) hand centers */
  handRest: { left: Vec2; right: Vec2 };
  /** Face center for kiss aiming */
  faceCenter: Vec2;
  /** Character-local hold target for the INNER hand */
  innerHandHold: Vec2;
  /** Bride only */
  veilPivot?: Vec2;
};

/**
 * Measured from photo-v3 A-pose layer PNGs on the 720×1380 canvas.
 * Re-measure after regenerating artwork — do not reuse SVG coords.
 */
/**
 * Joints measured from reference-couple illustrated masters on the 720×1380 canvas
 * (see masters/joints.json). Re-measure after regenerating artwork.
 */
export const GROOM_RIG: CharacterRigJoints = {
  headPivot: { x: 360, y: 247 },
  leftShoulder: { x: 215, y: 307 },
  leftElbow: { x: 180, y: 447 },
  leftWrist: { x: 93, y: 530 },
  rightShoulder: { x: 504, y: 306 },
  rightElbow: { x: 539, y: 446 },
  rightWrist: { x: 627, y: 529 },
  bodyPivot: { x: 359, y: 365 },
  hipPivot: { x: 359, y: 613 },
  handRest: {
    left: { x: 93, y: 554 },
    right: { x: 627, y: 553 },
  },
  faceCenter: { x: 360, y: 159 },
  /** Inner (right) hand — toward bride / stage center */
  innerHandHold: { x: 663, y: 535 },
};

export const BRIDE_RIG: CharacterRigJoints = {
  headPivot: { x: 361, y: 207 },
  veilPivot: { x: 361, y: 86 },
  leftShoulder: { x: 239, y: 281 },
  leftElbow: { x: 216, y: 360 },
  leftWrist: { x: 160, y: 390 },
  rightShoulder: { x: 479, y: 275 },
  rightElbow: { x: 504, y: 360 },
  rightWrist: { x: 560, y: 389 },
  bodyPivot: { x: 360, y: 279 },
  hipPivot: { x: 360, y: 422 },
  handRest: {
    left: { x: 160, y: 399 },
    right: { x: 560, y: 398 },
  },
  faceCenter: { x: 361, y: 141 },
  /** Inner (left) hand — toward groom / stage center */
  innerHandHold: { x: 124, y: 381 },
};

/** Feet Y on canvas — used to align characters on the stage floor */
export const GROOM_FOOT_Y = 1077;
export const BRIDE_FOOT_Y = 848;

export function pct(value: number, axis: "x" | "y"): number {
  return axis === "x" ? (value / STAGE_W) * 100 : (value / STAGE_H) * 100;
}

export function originPct(p: Vec2): string {
  return `${pct(p.x, "x")}% ${pct(p.y, "y")}%`;
}

/** Vertical nudge (%) so feet sit on the same ground line */
export function footAlignY(side: "groom" | "bride"): number {
  const foot = side === "groom" ? GROOM_FOOT_Y : BRIDE_FOOT_Y;
  // Shift so foot Y maps to ~96% of stage height
  const target = 0.96;
  const current = foot / STAGE_H;
  return (target - current) * 100;
}

export type ArmAngles = {
  upper: number;
  forearm: number;
  hand: number;
};

export type ResolvedRigPose = {
  /** Stage placement */
  xPct: number;
  yPct: number;
  bodyRot: number;
  scale: number;
  footAlignPct: number;
  /** Head */
  headRot: number;
  veilRot: number;
  /** Arms */
  left: ArmAngles;
  right: ArmAngles;
  /** Debug / meet points in character canvas px */
  holdTarget: Vec2;
  kissTarget: Vec2;
  faceCenter: Vec2;
};

/**
 * Map animation pose → layer rotations for the measured rig.
 *
 * Groom: outer=left (balloon), inner=right (hold)
 * Bride: outer=right (balloon), inner=left (hold)
 *
 * Hold uses calibrated angles that move wrists toward innerHandHold.
 * Kiss adds head/body lean toward a shared kiss point (via kissProgress).
 */
export function resolveCharacterRig(
  side: "groom" | "bride",
  pose: CharacterPose,
): ResolvedRigPose {
  const rig = side === "groom" ? GROOM_RIG : BRIDE_RIG;
  const hold = clamp01(pose.holdProgress);
  const kiss = clamp01(pose.kissProgress ?? pose.kissLean);
  const sway = pose.balloonSway;

  // Outer arm: gentle raised/open pose + balloon sway (photo-like welcome)
  // Inner arm: idle near rest → reach to hold target
  let left: ArmAngles;
  let right: ArmAngles;

  if (side === "groom") {
    // Artwork is already A-pose — keep idle near 0°. Small outer raise + hold reach.
    const outerIdle: ArmAngles = { upper: -8, forearm: 10, hand: -2 };
    const outerSway: ArmAngles = {
      upper: outerIdle.upper - sway * 3,
      forearm: outerIdle.forearm + sway * 2,
      hand: outerIdle.hand,
    };
    // Inner right: lift slightly toward bride (A-pose already reaches sideways)
    const innerIdle: ArmAngles = { upper: 0, forearm: 0, hand: 0 };
    const innerHold: ArmAngles = { upper: 14, forearm: -12, hand: -6 };
    left = outerSway;
    right = lerpArm(innerIdle, innerHold, hold);
  } else {
    const outerIdle: ArmAngles = { upper: 8, forearm: -10, hand: 2 };
    const outerSway: ArmAngles = {
      upper: outerIdle.upper + sway * 3,
      forearm: outerIdle.forearm - sway * 2,
      hand: outerIdle.hand,
    };
    const innerIdle: ArmAngles = { upper: 0, forearm: 0, hand: 0 };
    const innerHold: ArmAngles = { upper: -14, forearm: 12, hand: 6 };
    right = outerSway;
    left = lerpArm(innerIdle, innerHold, hold);
  }

  // Head / kiss — keep lean modest so neck stays attached
  const towardPartner = side === "groom" ? 1 : -1;
  const kissHeadExtra = kiss * towardPartner * 6;
  const headRot = pose.headRot + kissHeadExtra;
  const veilRot = headRot * 0.28 + sway * 0.8;
  const bodyRot = pose.bodyRot + kiss * towardPartner * 1.5;

  const kissTarget: Vec2 = {
    x: rig.faceCenter.x + towardPartner * kiss * 28,
    y: rig.faceCenter.y + kiss * 8,
  };

  return {
    xPct: pose.x,
    yPct: pose.y,
    bodyRot,
    scale: pose.scale,
    footAlignPct: footAlignY(side),
    headRot,
    veilRot,
    left,
    right,
    holdTarget: rig.innerHandHold,
    kissTarget,
    faceCenter: rig.faceCenter,
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpArm(a: ArmAngles, b: ArmAngles, t: number): ArmAngles {
  return {
    upper: lerp(a.upper, b.upper, t),
    forearm: lerp(a.forearm, b.forearm, t),
    hand: lerp(a.hand, b.hand, t),
  };
}

/** Bone polyline for debug overlay (percent coords) */
export function armBonePercents(rig: CharacterRigJoints, side: ArmSide) {
  const sh = side === "left" ? rig.leftShoulder : rig.rightShoulder;
  const el = side === "left" ? rig.leftElbow : rig.rightElbow;
  const wr = side === "left" ? rig.leftWrist : rig.rightWrist;
  const hand = rig.handRest[side];
  return [
    { x: pct(sh.x, "x"), y: pct(sh.y, "y") },
    { x: pct(el.x, "x"), y: pct(el.y, "y") },
    { x: pct(wr.x, "x"), y: pct(wr.y, "y") },
    { x: pct(hand.x, "x"), y: pct(hand.y, "y") },
  ];
}
