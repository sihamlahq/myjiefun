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
  /**
   * Arm joints remeasured from current layered PNGs (not legacy SVG).
   * Shoulder = top upper∩torso centroid; elbow/wrist = layer overlap centroids
   * after underlap deepen — keeps sleeve→forearm→hand connected while rotating.
   */
  leftShoulder: { x: 271, y: 285 },
  leftElbow: { x: 183, y: 445 },
  leftWrist: { x: 112, y: 529 },
  rightShoulder: { x: 450, y: 284 },
  rightElbow: { x: 538, y: 445 },
  rightWrist: { x: 609, y: 528 },
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

/**
 * Measured opaque bounds on the 720×1380 canvas (not transparent padding).
 * Re-measure after regenerating artwork.
 *
 *   groom: hair top → shoes bottom  → visibleH 1003
 *   bride: hair/tiara top → dress/feet bottom → visibleH 776
 */
export const GROOM_VISIBLE = { top: 75, bottom: 1077 } as const;
export const BRIDE_VISIBLE = { top: 73, bottom: 848 } as const;

/** Feet / dress hem Y on canvas — baseline alignment */
export const GROOM_FOOT_Y = GROOM_VISIBLE.bottom;
export const BRIDE_FOOT_Y = BRIDE_VISIBLE.bottom;

/**
 * Idle horizontal offsets returned by poseForPhase() — used only to derive
 * animation deltas so base layout stays independent of the pose module.
 * Do not edit poseForPhase; adjust CHARACTER_BASE instead.
 */
export const POSE_IDLE_X = { groom: -24, bride: 24 } as const;

const GROOM_VISIBLE_H = GROOM_VISIBLE.bottom - GROOM_VISIBLE.top + 1; // 1003
const BRIDE_VISIBLE_H = BRIDE_VISIBLE.bottom - BRIDE_VISIBLE.top + 1; // 776

/**
 * Base layout (idle size/placement) — independent of animation.
 *
 * finalScale = baseScale × pose.scale   (pose.scale is a small animation multiplier)
 * finalX     = baseX + (pose.x − idleX)
 * finalY     = baseY + pose.y
 *
 * Base scales equalize on-screen visual height:
 *   baseScale × visibleHeight ≈ same for both characters.
 */
export const CHARACTER_BASE = {
  groom: {
    /** Reference height — matches existing stage fit */
    scale: 1,
    x: -24,
    y: 0,
  },
  bride: {
    /** Scale up so bride visibleH matches groom visibleH */
    scale: GROOM_VISIBLE_H / BRIDE_VISIBLE_H,
    x: 24,
    y: 0,
  },
} as const;

/** Shared CSS figure box — both characters use the same container height. */
export const FIGURE_HEIGHT_CLASS = "h-[min(58vh,540px)]";

export function pct(value: number, axis: "x" | "y"): number {
  return axis === "x" ? (value / STAGE_W) * 100 : (value / STAGE_H) * 100;
}

export function originPct(p: Vec2): string {
  return `${pct(p.x, "x")}% ${pct(p.y, "y")}%`;
}

export function footY(side: "groom" | "bride"): number {
  return side === "groom" ? GROOM_FOOT_Y : BRIDE_FOOT_Y;
}

/**
 * Vertical nudge (%) so feet / dress hem sit on the same ground line.
 * Scale uses transform-origin at the foot, so baseScale does not lift the baseline;
 * this nudge only cancels different empty padding below each character's feet.
 */
export function footAlignY(side: "groom" | "bride", _scale = 1): number {
  const foot = footY(side);
  // Shift so foot Y maps to ~96% of the figure canvas (4% pad under feet).
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
  /** Stage placement (base layout + animation deltas) */
  xPct: number;
  yPct: number;
  bodyRot: number;
  /** finalScale = baseScale × animationScale */
  scale: number;
  baseScale: number;
  animationScale: number;
  footAlignPct: number;
  /** Foot Y as % of stage — use as transform-origin so scale keeps the baseline */
  footOriginPct: number;
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
    // Joint rotations (shoulder / elbow / wrist) — nested ArmChain applies them in order.
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

  const base = CHARACTER_BASE[side];
  const idleX = POSE_IDLE_X[side];
  const animationScale = pose.scale;
  const baseScale = base.scale;
  const scale = baseScale * animationScale;
  // pose.x / pose.y remain animation intent from poseForPhase(); base layout is additive.
  const xPct = base.x + (pose.x - idleX);
  const yPct = base.y + pose.y;

  return {
    xPct,
    yPct,
    bodyRot,
    scale,
    baseScale,
    animationScale,
    footAlignPct: footAlignY(side, scale),
    footOriginPct: pct(footY(side), "y"),
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
