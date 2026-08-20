"use client";

import { cn } from "@/lib/utils";
import type { KissCamAnimationPhase } from "@/components/kiss-cam/kiss-cam-types";
import { poseForPhase, type CharacterPose } from "@/components/kiss-cam/kiss-cam-pose";

/**
 * Modular TableWedding Kiss Cam characters.
 * Artwork language: simple 2D wedding-invitation illustration —
 * soft dark outlines, flat pastel fills, oversized heads, minimal detail.
 *
 * Body parts are separate <g> groups so arms/hands/head can animate independently.
 * Static replaceable references also live in /public/assets/kiss-cam/.
 */

const STROKE = "#4a4038";
const STROKE_W = 2.2;
const SKIN = "#f3c9ad";
const SKIN_SOFT = "#efbfa2";
const BLUSH = "#f2a8b0";
const HAIR_GROOM = "#2a2420";
const HAIR_BRIDE = "#3a3028";
const TUX = "#1c1c1e";
const TUX_DARK = "#111114";
const SHIRT = "#f7f4ef";
const GOWN = "#fffcf8";
const GOWN_EDGE = "#efe8df";
const VEIL = "rgba(255,255,255,0.72)";
const BALLOON_PINK = "#f4b6c4";
const BALLOON_PEARL = "#f7d6de";

function HeartBalloon({
  color = BALLOON_PINK,
  x,
  y,
}: {
  sway?: number;
  color?: string;
  x: number;
  y: number;
}) {
  return (
    <g className="kiss-cam-held-balloon" style={{ transformOrigin: `${x}px ${y + 90}px` }}>
      <line
        x1={x}
        y1={y + 38}
        x2={x}
        y2={y + 110}
        stroke="#9a8b82"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d={`M${x} ${y + 28}
           C${x + 22} ${y + 8} ${x + 28} ${y - 18} ${x} ${y - 8}
           C${x - 28} ${y - 18} ${x - 22} ${y + 8} ${x} ${y + 28}Z`}
        fill={color}
        stroke={STROKE}
        strokeWidth={STROKE_W * 0.85}
      />
      <ellipse cx={x - 8} cy={y} rx={4} ry={6} fill="rgba(255,255,255,0.45)" />
    </g>
  );
}

function Face({
  cx,
  cy,
  pose,
  looking,
}: {
  cx: number;
  cy: number;
  pose: CharacterPose;
  looking: number;
}) {
  const eyeY = cy - 2;
  const lx = cx - 11 + looking;
  const rx = cx + 11 + looking;
  return (
    <g className="kiss-cam-face">
      <circle cx={cx - 14} cy={cy + 6} r={5.5} fill={BLUSH} opacity={0.45} />
      <circle cx={cx + 14} cy={cy + 6} r={5.5} fill={BLUSH} opacity={0.45} />
      {pose.eyesClosed ? (
        <>
          <path
            d={`M${lx - 5} ${eyeY} Q${lx} ${eyeY + 3} ${lx + 5} ${eyeY}`}
            fill="none"
            stroke={STROKE}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d={`M${rx - 5} ${eyeY} Q${rx} ${eyeY + 3} ${rx + 5} ${eyeY}`}
            fill="none"
            stroke={STROKE}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx={lx} cy={eyeY} r={2.4} fill={STROKE} />
          <circle cx={rx} cy={eyeY} r={2.4} fill={STROKE} />
          <circle cx={lx + 0.7} cy={eyeY - 0.7} r={0.7} fill="#fff" />
          <circle cx={rx + 0.7} cy={eyeY - 0.7} r={0.7} fill="#fff" />
        </>
      )}
      {pose.mouth === "kiss" ? (
        <ellipse cx={cx} cy={cy + 14} rx={4} ry={2.2} fill="#d4878f" />
      ) : pose.mouth === "soft" ? (
        <path
          d={`M${cx - 7} ${cy + 13} Q${cx} ${cy + 17} ${cx + 7} ${cy + 13}`}
          fill="none"
          stroke="#c47a82"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d={`M${cx - 8} ${cy + 12} Q${cx} ${cy + 20} ${cx + 8} ${cy + 12}`}
          fill="none"
          stroke="#c47a82"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

export function GroomFigure({
  phase,
  className,
}: {
  phase: KissCamAnimationPhase;
  className?: string;
}) {
  const pose = poseForPhase(phase, "groom");
  // Inner arm = right arm (toward bride on the right)
  const innerReach = pose.holdProgress;
  const rightArmRot = -25 + innerReach * 55;
  const leftArmRot = 18 - pose.balloonSway * 4;
  const headLooking = pose.holdProgress * 3 + pose.kissLean * 4;

  return (
    <div
      className={cn("kiss-cam-figure pointer-events-none absolute bottom-[6%] origin-bottom", className)}
      style={{
        left: `calc(50% + ${pose.x}%)`,
        transform: `translateX(-50%) translateY(${pose.y}%) rotate(${pose.bodyRot}deg) scale(${pose.scale})`,
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 240 460"
        className="h-[min(62vh,560px)] w-auto drop-shadow-[0_14px_28px_rgba(60,50,40,.18)]"
        style={{ overflow: "visible" }}
      >
        {/* shadow */}
        <ellipse cx="120" cy="444" rx="48" ry="9" fill="rgba(70,60,50,.12)" />

        {/* legs */}
        <g className="kiss-cam-legs">
          <path
            d="M92 268 L86 420 L112 420 L118 268Z"
            fill={TUX}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path
            d="M122 268 L128 420 L154 420 L148 268Z"
            fill={TUX_DARK}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
        </g>

        {/* body / tuxedo */}
        <g className="kiss-cam-body kiss-cam-breathe">
          <path
            d="M78 130 C78 112 96 98 120 98 C144 98 162 112 162 130 L172 270 L68 270Z"
            fill={TUX}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M108 112 L120 168 L132 112Z" fill={SHIRT} stroke={STROKE} strokeWidth="1.6" />
          <path d="M112 112 L120 128 L128 112Z" fill={TUX_DARK} />
          <circle cx="120" cy="148" r="2.8" fill="#c9a66b" stroke={STROKE} strokeWidth="1" />
          <line x1="120" y1="160" x2="120" y2="268" stroke="#c9a66b" strokeWidth="1.4" opacity="0.5" />
        </g>

        {/* left arm + hand (outer — balloon) */}
        <g
          className="kiss-cam-arm-left"
          style={{
            transformOrigin: "78px 140px",
            transform: `rotate(${leftArmRot}deg)`,
          }}
        >
          <path
            d="M78 138 Q52 190 62 250"
            fill="none"
            stroke={TUX}
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M78 138 Q52 190 62 250"
            fill="none"
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinecap="round"
            opacity="0.35"
          />
          <g className="kiss-cam-hand-left">
            <circle cx="62" cy="258" r="11" fill={SKIN} stroke={STROKE} strokeWidth={STROKE_W} />
          </g>
          <HeartBalloon color={BALLOON_PINK} x={54} y={120} />
        </g>

        {/* right arm + hand (inner — hold hands) */}
        <g
          className="kiss-cam-arm-right"
          style={{
            transformOrigin: "162px 140px",
            transform: `rotate(${rightArmRot}deg)`,
          }}
        >
          <path
            d="M162 138 Q198 185 188 248"
            fill="none"
            stroke={TUX_DARK}
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M162 138 Q198 185 188 248"
            fill="none"
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinecap="round"
            opacity="0.35"
          />
          <g
            className="kiss-cam-hand-right"
            style={{
              transform: `translate(${innerReach * 8}px, ${innerReach * -6}px)`,
            }}
          >
            <circle cx="188" cy="256" r="11" fill={SKIN} stroke={STROKE} strokeWidth={STROKE_W} />
          </g>
        </g>

        {/* head + hair + face */}
        <g
          className="kiss-cam-head"
          style={{
            transformOrigin: "120px 78px",
            transform: `rotate(${pose.headRot + pose.kissLean * -6}deg)`,
          }}
        >
          <circle cx="120" cy="70" r="42" fill={SKIN} stroke={STROKE} strokeWidth={STROKE_W} />
          <path
            d="M82 62 C88 28 120 22 152 36 C158 52 150 58 142 54 C130 42 100 44 86 58Z"
            fill={HAIR_GROOM}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <Face cx={120} cy={74} pose={pose} looking={headLooking} />
        </g>
      </svg>
    </div>
  );
}

export function BrideFigure({
  phase,
  className,
}: {
  phase: KissCamAnimationPhase;
  className?: string;
}) {
  const pose = poseForPhase(phase, "bride");
  // Inner arm = left arm (toward groom on the left)
  const innerReach = pose.holdProgress;
  const leftArmRot = 25 - innerReach * 55;
  const rightArmRot = -18 + pose.balloonSway * 4;
  const headLooking = -pose.holdProgress * 3 - pose.kissLean * 4;

  return (
    <div
      className={cn("kiss-cam-figure pointer-events-none absolute bottom-[6%] origin-bottom", className)}
      style={{
        left: `calc(50% + ${pose.x}%)`,
        transform: `translateX(-50%) translateY(${pose.y}%) rotate(${pose.bodyRot}deg) scale(${pose.scale})`,
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 260 480"
        className="h-[min(64vh,580px)] w-auto drop-shadow-[0_14px_28px_rgba(60,50,40,.14)]"
        style={{ overflow: "visible" }}
      >
        <ellipse cx="130" cy="462" rx="58" ry="9" fill="rgba(70,60,50,.1)" />

        {/* dress + legs suggestion */}
        <g className="kiss-cam-dress">
          <path
            d="M96 168 C88 230 68 340 78 450 L182 450 C192 340 172 230 164 168 C152 186 108 186 96 168Z"
            fill={GOWN}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path
            d="M108 180 C112 260 106 360 112 440 L148 440 C154 360 148 260 152 180"
            fill={GOWN_EDGE}
            opacity="0.55"
          />
        </g>

        {/* bodice */}
        <g className="kiss-cam-body kiss-cam-breathe">
          <path
            d="M100 118 C110 100 150 100 160 118 L168 178 C148 194 112 194 92 178Z"
            fill={GOWN}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path
            d="M118 122 L130 152 L142 122"
            fill="none"
            stroke="#d4af37"
            strokeWidth="1.5"
            opacity="0.65"
          />
        </g>

        {/* left arm (inner — hold hands) */}
        <g
          className="kiss-cam-arm-left"
          style={{
            transformOrigin: "96px 130px",
            transform: `rotate(${leftArmRot}deg)`,
          }}
        >
          <path
            d="M96 132 Q58 180 70 246"
            fill="none"
            stroke={SKIN_SOFT}
            strokeWidth="15"
            strokeLinecap="round"
          />
          <path
            d="M96 132 Q58 180 70 246"
            fill="none"
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinecap="round"
            opacity="0.3"
          />
          <g
            className="kiss-cam-hand-left"
            style={{
              transform: `translate(${innerReach * -8}px, ${innerReach * -6}px)`,
            }}
          >
            <circle cx="70" cy="254" r="10.5" fill={SKIN} stroke={STROKE} strokeWidth={STROKE_W} />
          </g>
        </g>

        {/* right arm (outer — balloon) */}
        <g
          className="kiss-cam-arm-right"
          style={{
            transformOrigin: "164px 130px",
            transform: `rotate(${rightArmRot}deg)`,
          }}
        >
          <path
            d="M164 132 Q202 178 192 246"
            fill="none"
            stroke={SKIN}
            strokeWidth="15"
            strokeLinecap="round"
          />
          <path
            d="M164 132 Q202 178 192 246"
            fill="none"
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinecap="round"
            opacity="0.3"
          />
          <g className="kiss-cam-hand-right">
            <circle cx="192" cy="254" r="10.5" fill={SKIN} stroke={STROKE} strokeWidth={STROKE_W} />
          </g>
          <HeartBalloon color={BALLOON_PEARL} x={200} y={118} />
        </g>

        {/* veil behind head */}
        <g
          className="kiss-cam-veil"
          style={{
            transformOrigin: "130px 70px",
            transform: `rotate(${pose.headRot * 0.4}deg)`,
          }}
        >
          <path
            d="M88 78 C100 20 165 18 178 78 L186 210 C160 188 110 188 78 208Z"
            fill={VEIL}
            stroke={STROKE}
            strokeWidth="1.4"
            opacity="0.9"
          />
        </g>

        {/* head + hair + face */}
        <g
          className="kiss-cam-head"
          style={{
            transformOrigin: "130px 72px",
            transform: `rotate(${pose.headRot + pose.kissLean * 6}deg)`,
          }}
        >
          <circle cx="130" cy="72" r="40" fill={SKIN} stroke={STROKE} strokeWidth={STROKE_W} />
          <path
            d="M94 68 C102 28 150 24 168 62 C158 48 120 46 98 64Z"
            fill={HAIR_BRIDE}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <circle cx="130" cy="42" r="7" fill={HAIR_BRIDE} stroke={STROKE} strokeWidth="1.5" />
          <circle cx="130" cy="40" r="3.2" fill="#e8c97a" stroke={STROKE} strokeWidth="1" />
          <Face cx={130} cy={76} pose={pose} looking={headLooking} />
        </g>
      </svg>
    </div>
  );
}

/** Clasped hands accent — appears when holdProgress is full, centered between couple */
export function HeldHandsAccent({
  phase,
  className,
}: {
  phase: KissCamAnimationPhase;
  className?: string;
}) {
  const show =
    phase === "holdHands" ||
    phase === "romanticPause" ||
    phase === "moveCloser" ||
    phase === "countdown" ||
    phase === "kiss" ||
    phase === "celebration" ||
    phase === "final";
  if (!show) return null;
  return (
    <div
      className={cn(
        "kiss-cam-held-hands pointer-events-none absolute bottom-[28%] left-1/2 z-[5] -translate-x-1/2",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 64 40" className="h-10 w-16 opacity-95">
        <circle cx="24" cy="22" r="11" fill={SKIN} stroke={STROKE} strokeWidth="2" />
        <circle cx="40" cy="22" r="11" fill={SKIN_SOFT} stroke={STROKE} strokeWidth="2" />
      </svg>
    </div>
  );
}
