"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { KissCamAnimationPhase } from "@/components/kiss-cam/kiss-cam-types";
import { poseForPhase } from "@/components/kiss-cam/kiss-cam-pose";
import {
  STAGE_W,
  STAGE_H,
  GROOM_RIG,
  BRIDE_RIG,
  FIGURE_HEIGHT_CLASS,
  originPct,
  pct,
  resolveCharacterRig,
  armBonePercents,
  type CharacterRigJoints,
  type ArmAngles,
} from "@/components/kiss-cam/kiss-cam-rig";
import {
  KissCamRigDebugOverlay,
  type RigLayerBox,
  type RigPivot,
  type RigBone,
} from "@/components/kiss-cam/kiss-cam-rig-debug";

/**
 * When true, GroomFigure ignores pose arm/body/head motion so artwork can be
 * inspected as a static composite. Keep false for production animation.
 * Toggle only while debugging PNG layer cleanliness — do not use as a fix.
 */
/**
 * Set true to freeze groom pose (0° arms/body/head, no breathe) for artwork QC.
 * Keep false in production — animation uses existing poseForPhase / resolveCharacterRig.
 */
const GROOM_STATIC_ARTWORK_DEBUG = false;

type LayerImgProps = {
  src: string;
  className?: string;
  style?: CSSProperties;
};

function LayerImg({ src, className, style }: LayerImgProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      draggable={false}
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full select-none object-fill",
        className,
      )}
      style={style}
    />
  );
}

/** Dev-only: confirm bride arm DOM has one upper→forearm→hand chain per side. */
function BrideLayerTreeDebug({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    <pre
      className="pointer-events-none absolute left-1 top-1 z-[70] max-w-[min(100%,220px)] rounded bg-black/70 px-2 py-1 font-mono text-[9px] leading-tight text-emerald-200"
      data-bride-layer-tree="1"
    >
      {`Bride
 ├── leftUpperArm
 │    └── leftForearm
 │         └── leftHand (baked in forearm)
 └── rightUpperArm
      └── rightForearm
           └── rightHand (baked in forearm)`}
    </pre>
  );
}

function Balloon({ xPct, yPct, color }: { xPct: number; yPct: number; color: string }) {
  return (
    <div
      className="kiss-cam-held-balloon pointer-events-none absolute"
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        width: "14%",
        height: "17%",
        transform: "translate(-50%, -100%)",
        transformOrigin: "50% 100%",
      }}
    >
      <svg viewBox="0 0 60 90" className="h-full w-full overflow-visible">
        <line x1="30" y1="38" x2="30" y2="88" stroke="#9a8b82" strokeWidth="1.4" strokeLinecap="round" />
        <path
          d="M30 32 C50 12 56 -8 30 2 C4 -8 10 12 30 32Z"
          fill={color}
          stroke="#5a4a42"
          strokeWidth="1.5"
        />
        <ellipse cx="22" cy="12" rx="4" ry="6" fill="rgba(255,255,255,0.4)" />
      </svg>
    </div>
  );
}

type PuppetProps = {
  phase: KissCamAnimationPhase;
  className?: string;
  /** Dev-only rig overlay */
  rigDebug?: boolean;
};

/**
 * Nested 2D arm rig (full-canvas layers):
 *   upperArm @ shoulder  →  forearm @ elbow  →  hand @ wrist
 *
 * All three joint wrappers share the same CSS transition so parent/child
 * rotations ease together — mismatched transitions were splitting the arm.
 * Only CSS `transform: rotate()` is applied here (no Framer / dual systems).
 */
function ArmChain({
  which,
  base,
  rig,
  angles,
  balloon,
  /** When "baked", the hand is already painted into the forearm asset — do not mount a second hand image. */
  handMode = "separate",
}: {
  which: "left" | "right";
  base: string;
  rig: CharacterRigJoints;
  angles: ArmAngles;
  balloon?: { color: string };
  handMode?: "separate" | "baked";
}) {
  const shoulder = which === "left" ? rig.leftShoulder : rig.rightShoulder;
  const elbow = which === "left" ? rig.leftElbow : rig.rightElbow;
  const wrist = which === "left" ? rig.leftWrist : rig.rightWrist;
  const armClass = which === "left" ? "kiss-cam-arm-left" : "kiss-cam-arm-right";
  const forearmClass = which === "left" ? "kiss-cam-forearm-left" : "kiss-cam-forearm-right";
  const handClass = which === "left" ? "kiss-cam-hand-left" : "kiss-cam-hand-right";

  const upperLabel = which === "left" ? "leftUpperArm" : "rightUpperArm";
  const foreLabel = which === "left" ? "leftForearm" : "rightForearm";
  const handLabel = which === "left" ? "leftHand" : "rightHand";

  return (
    <div
      className={cn("kiss-cam-joint absolute inset-0 overflow-visible", armClass)}
      data-kiss-layer={upperLabel}
      data-kiss-joint="shoulder"
      style={{
        transformOrigin: originPct(shoulder),
        transform: `rotate(${angles.upper}deg)`,
      }}
    >
      <LayerImg src={`${base}/${which}-upper-arm.png`} />
      <div
        className={cn("kiss-cam-joint absolute inset-0 overflow-visible", forearmClass)}
        data-kiss-layer={foreLabel}
        data-kiss-joint="elbow"
        style={{
          transformOrigin: originPct(elbow),
          transform: `rotate(${angles.forearm}deg)`,
        }}
      >
        <LayerImg src={`${base}/${which}-forearm.png`} />
        <div
          className={cn("kiss-cam-joint absolute inset-0 overflow-visible", handClass)}
          data-kiss-layer={handLabel}
          data-kiss-joint="wrist"
          data-hand-mode={handMode}
          style={{
            transformOrigin: originPct(wrist),
            transform: `rotate(${angles.hand}deg)`,
          }}
        >
          {handMode === "separate" ? <LayerImg src={`${base}/${which}-hand.png`} /> : null}
          {balloon ? (
            <Balloon
              xPct={pct(rig.handRest[which].x, "x")}
              yPct={pct(rig.handRest[which].y, "y") - 1}
              color={balloon.color}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Stage-relative length → CSS container units (figure must set container-type: size). */
function cqw(px: number): string {
  return `calc(${px} / ${STAGE_W} * 100cqw)`;
}
function cqh(px: number): string {
  return `calc(${px} / ${STAGE_H} * 100cqh)`;
}

/**
 * Groom arm rig with LOCAL joint coordinates.
 *
 * Full-canvas PNGs keep their artwork, but each joint is a zero-size hinge in
 * the parent joint's local space. Artwork is offset so the joint pixel sits at
 * the hinge origin — children rotate about a true local origin.
 *
 *   ArmContainer
 *     └── UpperArm @ shoulder (0,0)
 *          └── Forearm @ elbow local
 *               └── Hand @ wrist local
 */
function GroomLocalArmChain({
  which,
  base,
  rig,
  angles,
  balloon,
}: {
  which: "left" | "right";
  base: string;
  rig: CharacterRigJoints;
  angles: ArmAngles;
  balloon?: { color: string };
}) {
  const shoulder = which === "left" ? rig.leftShoulder : rig.rightShoulder;
  const elbow = which === "left" ? rig.leftElbow : rig.rightElbow;
  const wrist = which === "left" ? rig.leftWrist : rig.rightWrist;

  const elbowLocal = { x: elbow.x - shoulder.x, y: elbow.y - shoulder.y };
  const wristLocal = { x: wrist.x - elbow.x, y: wrist.y - elbow.y };

  const armClass = which === "left" ? "kiss-cam-arm-left" : "kiss-cam-arm-right";
  const forearmClass = which === "left" ? "kiss-cam-forearm-left" : "kiss-cam-forearm-right";
  const handClass = which === "left" ? "kiss-cam-hand-left" : "kiss-cam-hand-right";

  const stageImgStyle: CSSProperties = {
    position: "absolute",
    width: cqw(STAGE_W),
    height: cqh(STAGE_H),
    maxWidth: "none",
    pointerEvents: "none",
    userSelect: "none",
  };

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" data-kiss-arm={which}>
      <div
        className={cn("kiss-cam-joint absolute overflow-visible", armClass)}
        data-kiss-layer={which === "left" ? "leftUpperArm" : "rightUpperArm"}
        data-kiss-joint="shoulder"
        style={{
          left: cqw(shoulder.x),
          top: cqh(shoulder.y),
          width: 0,
          height: 0,
          transformOrigin: "0 0",
          transform: `rotate(${angles.upper}deg)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${base}/${which}-upper-arm.png`}
          alt=""
          draggable={false}
          className="select-none"
          style={{
            ...stageImgStyle,
            left: cqw(-shoulder.x),
            top: cqh(-shoulder.y),
          }}
        />

        <div
          className={cn("kiss-cam-joint absolute overflow-visible", forearmClass)}
          data-kiss-layer={which === "left" ? "leftForearm" : "rightForearm"}
          data-kiss-joint="elbow"
          style={{
            left: cqw(elbowLocal.x),
            top: cqh(elbowLocal.y),
            width: 0,
            height: 0,
            transformOrigin: "0 0",
            transform: `rotate(${angles.forearm}deg)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${base}/${which}-forearm.png`}
            alt=""
            draggable={false}
            className="select-none"
            style={{
              ...stageImgStyle,
              left: cqw(-elbow.x),
              top: cqh(-elbow.y),
            }}
          />

          <div
            className={cn("kiss-cam-joint absolute overflow-visible", handClass)}
            data-kiss-layer={which === "left" ? "leftHand" : "rightHand"}
            data-kiss-joint="wrist"
            data-hand-mode="separate"
            style={{
              left: cqw(wristLocal.x),
              top: cqh(wristLocal.y),
              width: 0,
              height: 0,
              transformOrigin: "0 0",
              transform: `rotate(${angles.hand}deg)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${base}/${which}-hand.png`}
              alt=""
              draggable={false}
              className="select-none"
              style={{
                ...stageImgStyle,
                left: cqw(-wrist.x),
                top: cqh(-wrist.y),
              }}
            />
            {balloon ? (
              <div
                className="kiss-cam-held-balloon pointer-events-none absolute"
                style={{
                  left: cqw(rig.handRest[which].x - wrist.x),
                  top: cqh(rig.handRest[which].y - wrist.y),
                  width: cqw(Math.round(STAGE_W * 0.14)),
                  height: cqh(Math.round(STAGE_H * 0.17)),
                  transform: "translate(-50%, -100%)",
                  transformOrigin: "50% 100%",
                }}
              >
                <svg viewBox="0 0 60 90" className="h-full w-full overflow-visible" aria-hidden>
                  <line x1="30" y1="38" x2="30" y2="88" stroke="#9a8b82" strokeWidth="1.4" strokeLinecap="round" />
                  <path
                    d="M30 32 C50 12 56 -8 30 2 C4 -8 10 12 30 32Z"
                    fill={balloon.color}
                    stroke="#5a4a42"
                    strokeWidth="1.5"
                  />
                  <ellipse cx="22" cy="12" rx="4" ry="6" fill="rgba(255,255,255,0.4)" />
                </svg>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildDebug(
  side: "groom" | "bride",
  rig: CharacterRigJoints,
  holdTarget: { x: number; y: number },
  kissTarget: { x: number; y: number },
  showHold: boolean,
) {
  const pivots: RigPivot[] = [
    { id: "head", label: "head", x: pct(rig.headPivot.x, "x"), y: pct(rig.headPivot.y, "y"), color: "#fbbf24" },
    { id: "body", label: "body", x: pct(rig.bodyPivot.x, "x"), y: pct(rig.bodyPivot.y, "y"), color: "#67e8f9" },
    { id: "hip", label: "hip", x: pct(rig.hipPivot.x, "x"), y: pct(rig.hipPivot.y, "y"), color: "#86efac" },
    { id: "Lsh", label: "L sh", x: pct(rig.leftShoulder.x, "x"), y: pct(rig.leftShoulder.y, "y"), color: "#fb7185" },
    { id: "Lel", label: "L el", x: pct(rig.leftElbow.x, "x"), y: pct(rig.leftElbow.y, "y"), color: "#fb7185" },
    { id: "Lwr", label: "L wr", x: pct(rig.leftWrist.x, "x"), y: pct(rig.leftWrist.y, "y"), color: "#fb7185" },
    { id: "Rsh", label: "R sh", x: pct(rig.rightShoulder.x, "x"), y: pct(rig.rightShoulder.y, "y"), color: "#a78bfa" },
    { id: "Rel", label: "R el", x: pct(rig.rightElbow.x, "x"), y: pct(rig.rightElbow.y, "y"), color: "#a78bfa" },
    { id: "Rwr", label: "R wr", x: pct(rig.rightWrist.x, "x"), y: pct(rig.rightWrist.y, "y"), color: "#a78bfa" },
  ];
  if (rig.veilPivot) {
    pivots.push({
      id: "veil",
      label: "veil",
      x: pct(rig.veilPivot.x, "x"),
      y: pct(rig.veilPivot.y, "y"),
      color: "#93c5fd",
    });
  }

  const layers: RigLayerBox[] =
    side === "groom"
      ? [
          { id: "torso", label: "torso", left: 30, top: 16, width: 40, height: 38, color: "#67e8f9" },
          { id: "legs", label: "legs", left: 36, top: 48, width: 28, height: 45, color: "#86efac" },
          { id: "head", label: "head", left: 38, top: 2, width: 24, height: 18, color: "#fde68a" },
        ]
      : [
          { id: "skirt", label: "skirt", left: 8, top: 28, width: 84, height: 48, color: "#fbcfe8" },
          { id: "bodice", label: "bodice", left: 28, top: 14, width: 44, height: 24, color: "#67e8f9" },
          { id: "head", label: "head", left: 36, top: 2, width: 28, height: 14, color: "#fde68a" },
        ];

  const bones: RigBone[] = [
    { id: "L-arm", points: armBonePercents(rig, "left"), color: "#fb7185" },
    { id: "R-arm", points: armBonePercents(rig, "right"), color: "#a78bfa" },
  ];

  const handTargets: RigPivot[] = showHold
    ? [
        {
          id: "hold",
          label: "hand hold",
          x: pct(holdTarget.x, "x"),
          y: pct(holdTarget.y, "y"),
          color: "#e879f9",
        },
      ]
    : [];

  const kissTargets: RigPivot[] = [
    {
      id: "kiss",
      label: "kiss",
      x: pct(kissTarget.x, "x"),
      y: pct(kissTarget.y, "y"),
      color: "#f472b6",
    },
  ];

  return { pivots, layers, bones, handTargets, kissTargets };
}

export function GroomFigure({ phase, className, rigDebug = false }: PuppetProps) {
  const pose = poseForPhase(phase, "groom");
  const resolved = resolveCharacterRig("groom", pose);
  const rig = GROOM_RIG;
  const base = "/assets/kiss-cam/groom";
  const debug = buildDebug("groom", rig, resolved.holdTarget, resolved.kissTarget, pose.holdProgress > 0.45);

  const leftAngles = GROOM_STATIC_ARTWORK_DEBUG ? { upper: 0, forearm: 0, hand: 0 } : resolved.left;
  const rightAngles = GROOM_STATIC_ARTWORK_DEBUG ? { upper: 0, forearm: 0, hand: 0 } : resolved.right;
  const bodyRot = GROOM_STATIC_ARTWORK_DEBUG ? 0 : resolved.bodyRot;
  const headRot = GROOM_STATIC_ARTWORK_DEBUG ? 0 : resolved.headRot;
  const breatheClass = GROOM_STATIC_ARTWORK_DEBUG ? "absolute inset-0" : "kiss-cam-breathe absolute inset-0";
  /**
   * Shared waist/hip pivot — jacket and trousers must rotate/breathe together.
   * Rotating the torso alone around bodyPivot (chest) flared the jacket hem
   * away from planted legs; hipPivot keeps the waist geometrically fixed.
   */
  const waistOrigin = originPct(rig.hipPivot);

  return (
    <div
      className={cn(
        // h-full requires a sized containing block (character stage is absolute inset-0).
        "kiss-cam-figure pointer-events-none absolute bottom-0 h-full origin-bottom",
        className,
      )}
      style={{
        height: "100%",
        width: "auto",
        left: `calc(50% + ${resolved.xPct}%)`,
        // Scale around the feet so baseScale equalizes height without lifting the baseline.
        transformOrigin: `50% ${resolved.footOriginPct}%`,
        transform: `translateX(-50%) translateY(calc(${resolved.yPct}% + ${resolved.footAlignPct}%)) scale(${resolved.scale})`,
      }}
      aria-hidden
      data-kiss-figure="groom"
    >
      <div
        className={cn("relative w-auto overflow-visible", FIGURE_HEIGHT_CLASS)}
        style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}`, containerType: "size" }}
      >
        <div className="absolute inset-0 overflow-visible drop-shadow-[0_14px_28px_rgba(60,50,40,.22)]">
          {/* One body root: lean + breathe apply to jacket AND trousers together
              so the waist never separates. Arms keep their nested shoulder rig;
              head keeps its subtle independent rotation on top of body lean. */}
          <div
            className="kiss-cam-body absolute inset-0"
            style={{
              transformOrigin: waistOrigin,
              transform: `rotate(${bodyRot}deg)`,
            }}
          >
            <div className={breatheClass}>
              <div className="kiss-cam-legs absolute inset-0 overflow-visible">
                <LayerImg src={`${base}/shoes.png`} />
                <LayerImg src={`${base}/legs.png`} />
              </div>

              {/* Arms under torso so jacket shoulders cover sleeve roots. */}
              <GroomLocalArmChain which="left" base={base} rig={rig} angles={leftAngles} balloon={{ color: "#f4b6c4" }} />
              <GroomLocalArmChain which="right" base={base} rig={rig} angles={rightAngles} />

              <div className="absolute inset-0 z-[1]">
                <LayerImg src={`${base}/torso.png`} />
              </div>
            </div>

            <div
              className="kiss-cam-head absolute inset-0 z-[2]"
              style={{
                transformOrigin: originPct(rig.headPivot),
                transform: `rotate(${headRot}deg)`,
              }}
            >
              <LayerImg src={`${base}/head.png`} className="kiss-cam-face" />
              <LayerImg src={`${base}/hair.png`} />
            </div>
          </div>
        </div>

        <KissCamRigDebugOverlay
          enabled={rigDebug}
          title="Groom rig"
          layers={debug.layers}
          pivots={debug.pivots}
          bones={debug.bones}
          handTargets={debug.handTargets}
          kissTargets={debug.kissTargets}
        />
      </div>
    </div>
  );
}

export function BrideFigure({ phase, className, rigDebug = false }: PuppetProps) {
  const pose = poseForPhase(phase, "bride");
  const resolved = resolveCharacterRig("bride", pose);
  const rig = BRIDE_RIG;
  const base = "/assets/kiss-cam/bride";
  const debug = buildDebug("bride", rig, resolved.holdTarget, resolved.kissTarget, pose.holdProgress > 0.45);
  const veilPivot = rig.veilPivot ?? rig.headPivot;

  return (
    <div
      className={cn(
        // h-full requires a sized containing block (character stage is absolute inset-0).
        "kiss-cam-figure pointer-events-none absolute bottom-0 h-full origin-bottom",
        className,
      )}
      style={{
        height: "100%",
        width: "auto",
        left: `calc(50% + ${resolved.xPct}%)`,
        transformOrigin: `50% ${resolved.footOriginPct}%`,
        transform: `translateX(-50%) translateY(calc(${resolved.yPct}% + ${resolved.footAlignPct}%)) scale(${resolved.scale})`,
      }}
      aria-hidden
      data-kiss-figure="bride"
    >
      <div
        className={cn("relative w-auto overflow-visible", FIGURE_HEIGHT_CLASS)}
        style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}`, containerType: "size" }}
      >
        <div className="absolute inset-0 overflow-visible drop-shadow-[0_14px_28px_rgba(60,50,40,.18)]">
          <BrideLayerTreeDebug enabled={rigDebug} />
          {/* Veil behind, subtle secondary motion from head */}
          <div
            className="kiss-cam-veil absolute inset-0 overflow-visible"
            style={{
              transformOrigin: originPct(veilPivot),
              transform: `rotate(${resolved.veilRot}deg)`,
            }}
          >
            <LayerImg src={`${base}/veil.png`} />
          </div>

          <div className="kiss-cam-legs absolute inset-0">
            <LayerImg src={`${base}/shoes.png`} />
            <LayerImg src={`${base}/legs.png`} />
          </div>

          {/* Skirt stays mostly planted; tiny follow of body lean */}
          <div
            className="kiss-cam-dress absolute inset-0"
            style={{
              transformOrigin: originPct(rig.hipPivot),
              transform: `rotate(${resolved.bodyRot * 0.25}deg)`,
            }}
          >
            <LayerImg src={`${base}/skirt.png`} />
          </div>

          <div
            className="kiss-cam-body absolute inset-0"
            style={{
              transformOrigin: originPct(rig.bodyPivot),
              transform: `rotate(${resolved.bodyRot}deg)`,
            }}
          >
            {/* Arms under bodice; breathe moves sleeves+bodice together. */}
            <div className="kiss-cam-breathe absolute inset-0">
              <ArmChain which="left" base={base} rig={rig} angles={resolved.left} handMode="baked" />
              <ArmChain which="right" base={base} rig={rig} angles={resolved.right} balloon={{ color: "#f7d6de" }} handMode="baked" />

              <div className="absolute inset-0 z-[1]">
                <LayerImg src={`${base}/bodice.png`} />
              </div>
            </div>

            <div
              className="kiss-cam-head absolute inset-0 z-[2]"
              style={{
                transformOrigin: originPct(rig.headPivot),
                transform: `rotate(${resolved.headRot}deg)`,
              }}
            >
              <LayerImg src={`${base}/head.png`} className="kiss-cam-face" />
              <LayerImg src={`${base}/hair.png`} />
              <LayerImg src={`${base}/tiara.png`} />
            </div>
          </div>
        </div>

        <KissCamRigDebugOverlay
          enabled={rigDebug}
          title="Bride rig"
          layers={debug.layers}
          pivots={debug.pivots}
          bones={debug.bones}
          handTargets={debug.handTargets}
          kissTargets={debug.kissTargets}
        />
      </div>
    </div>
  );
}
