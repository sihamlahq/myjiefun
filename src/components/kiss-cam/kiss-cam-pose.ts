import type { KissCamAnimationPhase } from "@/components/kiss-cam/kiss-cam-types";

/**
 * Animation pose — separated from artwork so SVG assets can be swapped
 * without rewriting the Kiss Cam state machine.
 */
export type CharacterPose = {
  /** Horizontal offset from center, as % of stage width */
  x: number;
  /** Vertical nudge in % */
  y: number;
  bodyRot: number;
  headRot: number;
  scale: number;
  /** 0 = arms down/out with balloon, 1 = inner arm fully extended to hold hands */
  holdProgress: number;
  /** Outer arm holds balloon — slight sway */
  balloonSway: number;
  /** Kiss lean (extra head/body toward partner) */
  kissLean: number;
  /** Soft breathing amplitude 0–1 */
  breath: number;
  /** Mouth: smile | soft | kiss */
  mouth: "smile" | "soft" | "kiss";
  /** Eyes closed during kiss */
  eyesClosed: boolean;
};

export function poseForPhase(
  phase: KissCamAnimationPhase,
  side: "bride" | "groom",
): CharacterPose {
  // Groom on the left (−), bride on the right (+) — classic wedding composition
  const dir = side === "groom" ? -1 : 1;

  const base: CharacterPose = {
    x: dir * 34,
    y: 0,
    bodyRot: 0,
    headRot: 0,
    scale: 1,
    holdProgress: 0,
    balloonSway: 0,
    kissLean: 0,
    breath: 1,
    mouth: "smile",
    eyesClosed: false,
  };

  switch (phase) {
    case "idle":
      return { ...base, x: dir * 34, balloonSway: 1 };
    case "approach":
      return {
        ...base,
        x: dir * 16,
        bodyRot: dir * 2,
        headRot: dir * -4,
        holdProgress: 0.25,
        balloonSway: 1,
      };
    case "holdHands":
      return {
        ...base,
        x: dir * 9,
        bodyRot: dir * 3,
        headRot: dir * -6,
        holdProgress: 1,
        balloonSway: 0.85,
        mouth: "soft",
      };
    case "romanticPause":
      return {
        ...base,
        x: dir * 8.5,
        bodyRot: dir * 4,
        headRot: dir * -8,
        holdProgress: 1,
        balloonSway: 0.8,
        scale: 1.02,
        mouth: "soft",
      };
    case "moveCloser":
      return {
        ...base,
        x: dir * 5,
        y: -1,
        bodyRot: dir * 6,
        headRot: dir * -12,
        holdProgress: 1,
        balloonSway: 0.7,
        kissLean: 0.35,
        scale: 1.03,
        mouth: "soft",
      };
    case "countdown":
      return {
        ...base,
        x: dir * 4,
        y: -1.5,
        bodyRot: dir * 7,
        headRot: dir * -14,
        holdProgress: 1,
        balloonSway: 0.55,
        kissLean: 0.55,
        scale: 1.04,
        mouth: "soft",
      };
    case "kiss":
      return {
        ...base,
        x: dir * 1.8,
        y: -2,
        bodyRot: dir * 8,
        headRot: dir * -10,
        holdProgress: 1,
        balloonSway: 0.4,
        kissLean: 1,
        scale: 1.05,
        mouth: "kiss",
        eyesClosed: true,
      };
    case "celebration":
    case "final":
      return {
        ...base,
        x: dir * 3.5,
        y: -1,
        bodyRot: dir * 5,
        headRot: dir * -6,
        holdProgress: 1,
        balloonSway: 1.1,
        kissLean: 0.2,
        scale: 1.04,
        mouth: "smile",
      };
    default:
      return base;
  }
}
