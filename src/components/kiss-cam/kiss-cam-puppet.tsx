"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { KissCamAnimationPhase } from "@/components/kiss-cam/kiss-cam-types";
import { poseForPhase } from "@/components/kiss-cam/kiss-cam-pose";
import {
  KissCamRigDebugOverlay,
  type RigLayerBox,
  type RigPivot,
} from "@/components/kiss-cam/kiss-cam-rig-debug";

/**
 * Layered 2D puppet characters for Kiss Cam.
 * Artwork: /public/assets/kiss-cam/{groom|bride}/*.png (480×920 canvas).
 * Pose state machine: kiss-cam-pose.ts (unchanged).
 */

const STAGE_W = 480;
const STAGE_H = 920;

type LayerImgProps = {
  src: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
};

function LayerImg({ src, alt = "", className, style }: LayerImgProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={cn("pointer-events-none absolute inset-0 h-full w-full select-none object-fill", className)}
      style={style}
    />
  );
}

/** Convert canvas px → % of stage */
function pct(value: number, axis: "x" | "y") {
  return axis === "x" ? (value / STAGE_W) * 100 : (value / STAGE_H) * 100;
}

// Joints in master canvas coordinates (must match generate-kiss-cam-layers.cjs)
const GROOM_JOINTS = {
  neck: { x: 240, y: 188 },
  leftShoulder: { x: 168, y: 250 },
  leftElbow: { x: 148, y: 370 },
  leftWrist: { x: 150, y: 490 },
  rightShoulder: { x: 312, y: 250 },
  rightElbow: { x: 332, y: 370 },
  rightWrist: { x: 330, y: 490 },
  /** Target for inner hand when holdProgress = 1 (toward bride) */
  holdHandTarget: { x: 400, y: 500 },
};

const BRIDE_JOINTS = {
  neck: { x: 240, y: 188 },
  veilAttach: { x: 240, y: 160 },
  leftShoulder: { x: 190, y: 260 },
  leftElbow: { x: 165, y: 385 },
  leftWrist: { x: 166, y: 505 },
  rightShoulder: { x: 290, y: 260 },
  rightElbow: { x: 315, y: 385 },
  rightWrist: { x: 314, y: 505 },
  holdHandTarget: { x: 80, y: 500 },
};

function Balloon({ xPct, yPct, color }: { xPct: number; yPct: number; color: string }) {
  return (
    <div
      className="kiss-cam-held-balloon pointer-events-none absolute"
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        width: "18%",
        height: "22%",
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
  /** Development-only rig overlay */
  rigDebug?: boolean;
};

function ArmChain({
  which,
  upperSrc,
  forearmSrc,
  handSrc,
  shoulder,
  elbow,
  wrist,
  upperRot,
  forearmRot,
  handRot,
  balloon,
}: {
  which: "left" | "right";
  upperSrc: string;
  forearmSrc: string;
  handSrc: string;
  shoulder: { x: number; y: number };
  elbow: { x: number; y: number };
  wrist: { x: number; y: number };
  upperRot: number;
  forearmRot: number;
  handRot: number;
  balloon?: { color: string };
}) {
  const armClass = which === "left" ? "kiss-cam-arm-left" : "kiss-cam-arm-right";
  const handClass = which === "left" ? "kiss-cam-hand-left" : "kiss-cam-hand-right";

  return (
    <div
      className={cn("absolute inset-0", armClass)}
      style={{
        transformOrigin: `${pct(shoulder.x, "x")}% ${pct(shoulder.y, "y")}%`,
        transform: `rotate(${upperRot}deg)`,
      }}
    >
      <LayerImg src={upperSrc} />
      <div
        className="absolute inset-0"
        style={{
          transformOrigin: `${pct(elbow.x, "x")}% ${pct(elbow.y, "y")}%`,
          transform: `rotate(${forearmRot}deg)`,
        }}
      >
        <LayerImg src={forearmSrc} />
        <div
          className={cn("absolute inset-0", handClass)}
          style={{
            transformOrigin: `${pct(wrist.x, "x")}% ${pct(wrist.y, "y")}%`,
            transform: `rotate(${handRot}deg)`,
          }}
        >
          <LayerImg src={handSrc} />
          {balloon ? (
            <Balloon xPct={pct(wrist.x, "x")} yPct={pct(wrist.y, "y") - 2} color={balloon.color} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function GroomFigure({ phase, className, rigDebug = false }: PuppetProps) {
  const pose = poseForPhase(phase, "groom");
  const hold = pose.holdProgress;
  // Outer arm (left) sways with balloon; inner arm (right) reaches to hold.
  const leftUpper = 18 - pose.balloonSway * 4;
  const leftFore = -6 - pose.balloonSway * 2;
  const rightUpper = -25 + hold * 55;
  const rightFore = 8 - hold * 18;
  const rightHand = hold * -6;
  const headRot = pose.headRot + pose.kissLean * -6;
  const j = GROOM_JOINTS;
  const base = "/assets/kiss-cam/groom";

  const debugLayers: RigLayerBox[] = [
    { id: "torso", label: "torso", left: 28, top: 20, width: 44, height: 38, color: "#67e8f9" },
    { id: "legs", label: "legs", left: 36, top: 55, width: 28, height: 32, color: "#86efac" },
    { id: "head", label: "head", left: 36, top: 8, width: 28, height: 16, color: "#fde68a" },
    { id: "L-arm", label: "left arm", left: 18, top: 24, width: 22, height: 36, color: "#fda4af" },
    { id: "R-arm", label: "right arm", left: 58, top: 24, width: 22, height: 36, color: "#c4b5fd" },
  ];
  const debugPivots: RigPivot[] = [
    { id: "neck", label: "neck", x: pct(j.neck.x, "x"), y: pct(j.neck.y, "y"), color: "#fbbf24" },
    {
      id: "Lsh",
      label: "L shoulder",
      x: pct(j.leftShoulder.x, "x"),
      y: pct(j.leftShoulder.y, "y"),
      color: "#fb7185",
    },
    {
      id: "Lel",
      label: "L elbow",
      x: pct(j.leftElbow.x, "x"),
      y: pct(j.leftElbow.y, "y"),
      color: "#fb7185",
    },
    {
      id: "Lwr",
      label: "L wrist",
      x: pct(j.leftWrist.x, "x"),
      y: pct(j.leftWrist.y, "y"),
      color: "#fb7185",
    },
    {
      id: "Rsh",
      label: "R shoulder",
      x: pct(j.rightShoulder.x, "x"),
      y: pct(j.rightShoulder.y, "y"),
      color: "#a78bfa",
    },
    {
      id: "Rel",
      label: "R elbow",
      x: pct(j.rightElbow.x, "x"),
      y: pct(j.rightElbow.y, "y"),
      color: "#a78bfa",
    },
    {
      id: "Rwr",
      label: "R wrist",
      x: pct(j.rightWrist.x, "x"),
      y: pct(j.rightWrist.y, "y"),
      color: "#a78bfa",
    },
  ];
  const handTargets: RigPivot[] =
    hold > 0.5
      ? [
          {
            id: "hold",
            label: "hold target",
            x: pct(j.holdHandTarget.x, "x"),
            y: pct(j.holdHandTarget.y, "y"),
            color: "#e879f9",
          },
        ]
      : [];

  return (
    <div
      className={cn("kiss-cam-figure pointer-events-none absolute bottom-[4%] origin-bottom", className)}
      style={{
        left: `calc(50% + ${pose.x}%)`,
        transform: `translateX(-50%) translateY(${pose.y}%) rotate(${pose.bodyRot}deg) scale(${pose.scale})`,
      }}
      aria-hidden
    >
      <div
        className="relative h-[min(64vh,600px)] w-auto"
        style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}
      >
        <div className="absolute inset-0 drop-shadow-[0_14px_28px_rgba(60,50,40,.22)]">
          <div className="kiss-cam-legs absolute inset-0">
            <LayerImg src={`${base}/shoes.png`} />
            <LayerImg src={`${base}/legs.png`} />
          </div>

          <div className="kiss-cam-body kiss-cam-breathe absolute inset-0">
            <LayerImg src={`${base}/torso.png`} />
          </div>

          <ArmChain
            which="left"
            upperSrc={`${base}/left-upper-arm.png`}
            forearmSrc={`${base}/left-forearm.png`}
            handSrc={`${base}/left-hand.png`}
            shoulder={j.leftShoulder}
            elbow={j.leftElbow}
            wrist={j.leftWrist}
            upperRot={leftUpper}
            forearmRot={leftFore}
            handRot={0}
            balloon={{ color: "#f4b6c4" }}
          />

          <ArmChain
            which="right"
            upperSrc={`${base}/right-upper-arm.png`}
            forearmSrc={`${base}/right-forearm.png`}
            handSrc={`${base}/right-hand.png`}
            shoulder={j.rightShoulder}
            elbow={j.rightElbow}
            wrist={j.rightWrist}
            upperRot={rightUpper}
            forearmRot={rightFore}
            handRot={rightHand}
          />

          <div
            className="kiss-cam-head absolute inset-0"
            style={{
              transformOrigin: `${pct(j.neck.x, "x")}% ${pct(j.neck.y, "y")}%`,
              transform: `rotate(${headRot}deg)`,
            }}
          >
            <LayerImg src={`${base}/head.png`} className="kiss-cam-face" />
            <LayerImg src={`${base}/hair.png`} />
          </div>
        </div>

        <KissCamRigDebugOverlay
          enabled={rigDebug}
          title="Groom rig"
          layers={debugLayers}
          pivots={debugPivots}
          handTargets={handTargets}
        />
      </div>
    </div>
  );
}

export function BrideFigure({ phase, className, rigDebug = false }: PuppetProps) {
  const pose = poseForPhase(phase, "bride");
  const hold = pose.holdProgress;
  // Inner arm = left (toward groom); outer = right (balloon)
  const leftUpper = 25 - hold * 55;
  const leftFore = -8 + hold * 16;
  const leftHand = hold * 6;
  const rightUpper = -18 + pose.balloonSway * 4;
  const rightFore = 6 + pose.balloonSway * 2;
  const headRot = pose.headRot + pose.kissLean * 6;
  const veilRot = pose.headRot * 0.35 + pose.balloonSway * 1.5;
  const j = BRIDE_JOINTS;
  const base = "/assets/kiss-cam/bride";

  const debugLayers: RigLayerBox[] = [
    { id: "veil", label: "veil", left: 28, top: 4, width: 44, height: 50, color: "#e0e7ff" },
    { id: "skirt", label: "skirt", left: 22, top: 40, width: 56, height: 52, color: "#fbcfe8" },
    { id: "bodice", label: "bodice", left: 36, top: 26, width: 28, height: 20, color: "#67e8f9" },
    { id: "head", label: "head/hair/tiara", left: 36, top: 7, width: 28, height: 18, color: "#fde68a" },
    { id: "L-arm", label: "left arm", left: 22, top: 26, width: 20, height: 36, color: "#fda4af" },
    { id: "R-arm", label: "right arm", left: 58, top: 26, width: 20, height: 36, color: "#c4b5fd" },
  ];
  const debugPivots: RigPivot[] = [
    { id: "neck", label: "neck", x: pct(j.neck.x, "x"), y: pct(j.neck.y, "y"), color: "#fbbf24" },
    {
      id: "veil",
      label: "veil attach",
      x: pct(j.veilAttach.x, "x"),
      y: pct(j.veilAttach.y, "y"),
      color: "#93c5fd",
    },
    {
      id: "Lsh",
      label: "L shoulder",
      x: pct(j.leftShoulder.x, "x"),
      y: pct(j.leftShoulder.y, "y"),
      color: "#fb7185",
    },
    {
      id: "Lel",
      label: "L elbow",
      x: pct(j.leftElbow.x, "x"),
      y: pct(j.leftElbow.y, "y"),
      color: "#fb7185",
    },
    {
      id: "Lwr",
      label: "L wrist",
      x: pct(j.leftWrist.x, "x"),
      y: pct(j.leftWrist.y, "y"),
      color: "#fb7185",
    },
    {
      id: "Rsh",
      label: "R shoulder",
      x: pct(j.rightShoulder.x, "x"),
      y: pct(j.rightShoulder.y, "y"),
      color: "#a78bfa",
    },
    {
      id: "Rel",
      label: "R elbow",
      x: pct(j.rightElbow.x, "x"),
      y: pct(j.rightElbow.y, "y"),
      color: "#a78bfa",
    },
    {
      id: "Rwr",
      label: "R wrist",
      x: pct(j.rightWrist.x, "x"),
      y: pct(j.rightWrist.y, "y"),
      color: "#a78bfa",
    },
  ];
  const handTargets: RigPivot[] =
    hold > 0.5
      ? [
          {
            id: "hold",
            label: "hold target",
            x: pct(j.holdHandTarget.x, "x"),
            y: pct(j.holdHandTarget.y, "y"),
            color: "#e879f9",
          },
        ]
      : [];

  return (
    <div
      className={cn("kiss-cam-figure pointer-events-none absolute bottom-[4%] origin-bottom", className)}
      style={{
        left: `calc(50% + ${pose.x}%)`,
        transform: `translateX(-50%) translateY(${pose.y}%) rotate(${pose.bodyRot}deg) scale(${pose.scale})`,
      }}
      aria-hidden
    >
      <div
        className="relative h-[min(66vh,620px)] w-auto"
        style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}
      >
        <div className="absolute inset-0 drop-shadow-[0_14px_28px_rgba(60,50,40,.18)]">
          <div
            className="kiss-cam-veil absolute inset-0"
            style={{
              transformOrigin: `${pct(j.veilAttach.x, "x")}% ${pct(j.veilAttach.y, "y")}%`,
              transform: `rotate(${veilRot}deg)`,
            }}
          >
            <LayerImg src={`${base}/veil.png`} />
          </div>

          <div className="kiss-cam-legs absolute inset-0">
            <LayerImg src={`${base}/shoes.png`} />
            <LayerImg src={`${base}/legs.png`} />
          </div>

          <div className="kiss-cam-dress absolute inset-0">
            <LayerImg src={`${base}/skirt.png`} />
          </div>

          <div className="kiss-cam-body kiss-cam-breathe absolute inset-0">
            <LayerImg src={`${base}/bodice.png`} />
          </div>

          <ArmChain
            which="left"
            upperSrc={`${base}/left-upper-arm.png`}
            forearmSrc={`${base}/left-forearm.png`}
            handSrc={`${base}/left-hand.png`}
            shoulder={j.leftShoulder}
            elbow={j.leftElbow}
            wrist={j.leftWrist}
            upperRot={leftUpper}
            forearmRot={leftFore}
            handRot={leftHand}
          />

          <ArmChain
            which="right"
            upperSrc={`${base}/right-upper-arm.png`}
            forearmSrc={`${base}/right-forearm.png`}
            handSrc={`${base}/right-hand.png`}
            shoulder={j.rightShoulder}
            elbow={j.rightElbow}
            wrist={j.rightWrist}
            upperRot={rightUpper}
            forearmRot={rightFore}
            handRot={0}
            balloon={{ color: "#f7d6de" }}
          />

          <div
            className="kiss-cam-head absolute inset-0"
            style={{
              transformOrigin: `${pct(j.neck.x, "x")}% ${pct(j.neck.y, "y")}%`,
              transform: `rotate(${headRot}deg)`,
            }}
          >
            <LayerImg src={`${base}/head.png`} className="kiss-cam-face" />
            <LayerImg src={`${base}/hair.png`} />
            <LayerImg src={`${base}/tiara.png`} />
          </div>
        </div>

        <KissCamRigDebugOverlay
          enabled={rigDebug}
          title="Bride rig"
          layers={debugLayers}
          pivots={debugPivots}
          handTargets={handTargets}
        />
      </div>
    </div>
  );
}
