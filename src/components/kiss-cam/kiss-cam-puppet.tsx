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

function GroomLocalArmChain({ which, base, rig, angles, balloon }: { which: "left" | "right"; base: string; rig: CharacterRigJoints; angles: ArmAngles; balloon?: { color: string } }) {
  const shoulder = which === "left" ? rig.leftShoulder : rig.rightShoulder;
  const elbow = which === "left" ? rig.leftElbow : rig.rightElbow;
  const wrist = which === "left" ? rig.leftWrist : rig.rightWrist;
  return (
    <div className="kiss-cam-joint absolute inset-0" style={{ transformOrigin: originPct(shoulder), transform: `rotate(${angles.upper}deg)` }}>
      <LayerImg src={`${base}/${which}-upper-arm.png`} />
      <div className="kiss-cam-joint absolute inset-0" style={{ transformOrigin: originPct(elbow), transform: `rotate(${angles.forearm}deg)` }}>
        <LayerImg src={`${base}/${which}-forearm.png`} />
        <div className="kiss-cam-joint absolute inset-0" style={{ transformOrigin: originPct(wrist), transform: `rotate(${angles.hand}deg)` }}>
          <LayerImg src={`${base}/${which}-hand.png`} />
          {balloon ? <Balloon xPct={rig.handRest[which].x} yPct={rig.handRest[which].y} color={balloon.color} /> : null}
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
  if (rig.veilPivot) pivots.push({ id: "veil", label: "veil", x: pct(rig.veilPivot.x, "x"), y: pct(rig.veilPivot.y, "y"), color: "#93c5fd" });
  const layers: RigLayerBox[] = side === "groom"
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
  const handTargets: RigPivot[] = showHold ? [{ id: "hold", label: "hand hold", x: pct(holdTarget.x, "x"), y: pct(holdTarget.y, "y"), color: "#e879f9" }] : [];
  const kissTargets: RigPivot[] = [{ id: "kiss", label: "kiss", x: pct(kissTarget.x, "x"), y: pct(kissTarget.y, "y"), color: "#f472b6" }];
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
  const waistOrigin = originPct(rig.hipPivot);

  return (
    <div className={cn("kiss-cam-figure pointer-events-none absolute bottom-0 h-full origin-bottom", className)} style={{ height: "100%", width: "auto", left: `calc(50% + ${resolved.xPct}%)`, transformOrigin: `50% ${resolved.footOriginPct}%`, transform: `translateX(-50%) translateY(calc(${resolved.yPct}% + ${resolved.footAlignPct}%)) scale(${resolved.scale})` }} aria-hidden data-kiss-figure="groom">
      <div className={cn("relative w-auto overflow-visible", FIGURE_HEIGHT_CLASS)} style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}`, containerType: "size" }}>
        <div className="absolute inset-0 overflow-visible drop-shadow-[0_14px_28px_rgba(60,50,40,.22)]">
          <div className="kiss-cam-body absolute inset-0" style={{ transformOrigin: waistOrigin, transform: `rotate(${bodyRot}deg)` }}>
            <div className={breatheClass}>
              {/* The trouser master starts slightly under the jacket hem. Hiding its upper waistband removes the hard horizontal cut where the two generated PNGs meet. */}
              <div className="kiss-cam-legs absolute inset-0 overflow-visible">
                <LayerImg src={`${base}/shoes.png`} />
                <LayerImg src={`${base}/legs.png`} style={{ clipPath: "inset(53.5% 0 0 0)" }} />
              </div>
              <GroomLocalArmChain which="left" base={base} rig={rig} angles={leftAngles} balloon={{ color: "#f4b6c4" }} />
              <GroomLocalArmChain which="right" base={base} rig={rig} angles={rightAngles} />
              <div className="absolute inset-0 z-[1]">
                <LayerImg src={`${base}/torso.png`} />
                {/* Extend the jacket hem past the trouser master. The previous seam patch stopped above the actual visible cut, so it could not cover it. */}
                <div className="pointer-events-none absolute inset-0 overflow-visible" style={{ clipPath: "inset(42% 0 42% 0)" }} aria-hidden>
                  <LayerImg src={`${base}/torso.png`} style={{ transformOrigin: `${pct(rig.hipPivot.x, "x")}% ${pct(rig.hipPivot.y, "y")}%`, transform: "scaleY(1.012)" }} />
                </div>
              </div>
            </div>
            <div className="kiss-cam-head absolute inset-0 z-[2]" style={{ transformOrigin: originPct(rig.headPivot), transform: `rotate(${headRot}deg)` }}>
              <LayerImg src={`${base}/head.png`} className="kiss-cam-face" />
              <LayerImg src={`${base}/hair.png`} />
            </div>
          </div>
        </div>
        <KissCamRigDebugOverlay enabled={rigDebug} title="Groom rig" layers={debug.layers} pivots={debug.pivots} bones={debug.bones} handTargets={debug.handTargets} kissTargets={debug.kissTargets} />
      </div>
    </div>
  );
}
