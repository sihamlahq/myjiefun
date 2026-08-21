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
 * Layered 2D puppets — POSE → RIG → LAYER TRANSFORMS.
 *
 * Hierarchy (legs planted; lean around bodyPivot):
 *   figure (x / scale / footAlign)
 *     legs + shoes
 *     [bride skirt — mostly planted]
 *     upperBody @ bodyPivot (bodyRot)
 *       torso / bodice
 *       arms (shoulder → elbow → wrist)
 *       head @ headPivot (headRot) + hair [/ tiara]
 *     [bride veil @ veilPivot — secondary]
 */

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
      className={cn("pointer-events-none absolute inset-0 h-full w-full select-none object-fill", className)}
      style={style}
    />
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
  const handClass = which === "left" ? "kiss-cam-hand-left" : "kiss-cam-hand-right";

  return (
    <div
      className={cn("absolute inset-0", armClass)}
      style={{
        transformOrigin: originPct(shoulder),
        transform: `rotate(${angles.upper}deg)`,
      }}
    >
      <LayerImg src={`${base}/${which}-upper-arm.png`} />
      <div
        className="absolute inset-0"
        style={{
          transformOrigin: originPct(elbow),
          transform: `rotate(${angles.forearm}deg)`,
        }}
      >
        <LayerImg src={`${base}/${which}-forearm.png`} />
        <div
          className={cn("absolute inset-0", handClass)}
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

  return (
    <div
      className={cn("kiss-cam-figure pointer-events-none absolute bottom-[2%] origin-bottom", className)}
      style={{
        left: `calc(50% + ${resolved.xPct}%)`,
        transform: `translateX(-50%) translateY(calc(${resolved.yPct}% + ${resolved.footAlignPct}%)) scale(${resolved.scale})`,
      }}
      aria-hidden
    >
      <div className="relative h-[min(62vh,580px)] w-auto" style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}>
        <div className="absolute inset-0 drop-shadow-[0_14px_28px_rgba(60,50,40,.22)]">
          {/* Legs planted — do not take body lean */}
          <div className="kiss-cam-legs absolute inset-0">
            <LayerImg src={`${base}/shoes.png`} />
            <LayerImg src={`${base}/legs.png`} />
          </div>

          {/* Upper body leans around measured bodyPivot */}
          <div
            className="kiss-cam-body absolute inset-0"
            style={{
              transformOrigin: originPct(rig.bodyPivot),
              transform: `rotate(${resolved.bodyRot}deg)`,
            }}
          >
            <div className="kiss-cam-breathe absolute inset-0">
              <LayerImg src={`${base}/torso.png`} />
            </div>

            <ArmChain which="left" base={base} rig={rig} angles={resolved.left} balloon={{ color: "#f4b6c4" }} handMode="separate" />
            <ArmChain which="right" base={base} rig={rig} angles={resolved.right} handMode="separate" />

            <div
              className="kiss-cam-head absolute inset-0"
              style={{
                transformOrigin: originPct(rig.headPivot),
                transform: `rotate(${resolved.headRot}deg)`,
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
      className={cn("kiss-cam-figure pointer-events-none absolute bottom-[2%] origin-bottom", className)}
      style={{
        left: `calc(50% + ${resolved.xPct}%)`,
        transform: `translateX(-50%) translateY(calc(${resolved.yPct}% + ${resolved.footAlignPct}%)) scale(${resolved.scale})`,
      }}
      aria-hidden
    >
      <div className="relative h-[min(64vh,600px)] w-auto" style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}>
        <div className="absolute inset-0 drop-shadow-[0_14px_28px_rgba(60,50,40,.18)]">
          {/* Veil behind, subtle secondary motion from head */}
          <div
            className="kiss-cam-veil absolute inset-0"
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
            <div className="kiss-cam-breathe absolute inset-0">
              <LayerImg src={`${base}/bodice.png`} />
            </div>

            {/* Bride hand pixels are painted into the forearm masters; mounting *-hand.png duplicated them. */}
            <ArmChain which="left" base={base} rig={rig} angles={resolved.left} handMode="baked" />
            <ArmChain which="right" base={base} rig={rig} angles={resolved.right} balloon={{ color: "#f7d6de" }} handMode="baked" />

            <div
              className="kiss-cam-head absolute inset-0"
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
