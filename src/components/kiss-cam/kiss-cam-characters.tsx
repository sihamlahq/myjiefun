"use client";

import { cn } from "@/lib/utils";
import type { KissCamAnimationPhase } from "@/components/kiss-cam/kiss-cam-types";
import { poseForPhase, type CharacterPose } from "@/components/kiss-cam/kiss-cam-pose";

/**
 * Premium semi-realistic wedding couple for Kiss Cam.
 * Inspired by the venue reference photo — luxury invitation / modern
 * Korean–Japanese wedding illustration. Animation group hooks preserved.
 */

const STROKE = "#5a4a42";
const STROKE_SOFT = "#7a6a62";
const SKIN = "#f0c4a8";
const SKIN_MID = "#e8b396";
const SKIN_SHADOW = "#d9a088";
const BLUSH = "#efb0b4";
const LIP = "#c97a82";
const LIP_FILL = "#e8a0a6";
const HAIR = "#1a1412";
const HAIR_MID = "#2a221e";
const HAIR_HL = "rgba(255,255,255,0.16)";
const TUX = "#161618";
const TUX_MID = "#222226";
const TUX_DARK = "#0c0c0e";
const TUX_HL = "rgba(255,255,255,0.08)";
const SHIRT = "#fffcf8";
const TIE = "#101012";
const GOWN = "#fffcf8";
const GOWN_MID = "#f5eee6";
const GOWN_SHADOW = "#e8dfd4";
const LACE = "#efe6dc";
const VEIL = "rgba(255,255,255,0.55)";
const TIARA = "#e8eef4";
const TIARA_GEM = "#f8fbff";
const BALLOON_PINK = "#f4b6c4";
const BALLOON_PEARL = "#f7d6de";

function SharedDefs() {
  return (
    <defs>
      <linearGradient id="kc-skin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f7d4bc" />
        <stop offset="45%" stopColor={SKIN} />
        <stop offset="100%" stopColor={SKIN_MID} />
      </linearGradient>
      <linearGradient id="kc-skin-shadow" x1="0.2" y1="0" x2="0.9" y2="1">
        <stop offset="0%" stopColor={SKIN} stopOpacity="0" />
        <stop offset="100%" stopColor={SKIN_SHADOW} stopOpacity="0.55" />
      </linearGradient>
      <linearGradient id="kc-tux" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={TUX_MID} />
        <stop offset="55%" stopColor={TUX} />
        <stop offset="100%" stopColor={TUX_DARK} />
      </linearGradient>
      <linearGradient id="kc-gown" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="40%" stopColor={GOWN} />
        <stop offset="100%" stopColor={GOWN_MID} />
      </linearGradient>
      <linearGradient id="kc-veil" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.75)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
      </linearGradient>
      <radialGradient id="kc-cheek" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={BLUSH} stopOpacity="0.55" />
        <stop offset="100%" stopColor={BLUSH} stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

function HeartBalloon({ color = BALLOON_PINK, x, y }: { color?: string; x: number; y: number }) {
  return (
    <g className="kiss-cam-held-balloon" style={{ transformOrigin: `${x}px ${y + 90}px` }}>
      <line
        x1={x}
        y1={y + 38}
        x2={x}
        y2={y + 110}
        stroke="#9a8b82"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d={`M${x} ${y + 26}
           C${x + 20} ${y + 8} ${x + 26} ${y - 16} ${x} ${y - 6}
           C${x - 26} ${y - 16} ${x - 20} ${y + 8} ${x} ${y + 26}Z`}
        fill={color}
        stroke={STROKE}
        strokeWidth="1.6"
      />
      <ellipse cx={x - 7} cy={y} rx={3.5} ry={5} fill="rgba(255,255,255,0.4)" />
    </g>
  );
}

/** Elegant illustrated hand (still compact for wrist attachment). */
function Hand({ cx, cy, mirror = false }: { cx: number; cy: number; mirror?: boolean }) {
  const s = mirror ? -1 : 1;
  return (
    <g transform={`translate(${cx},${cy}) scale(${s},1)`}>
      <ellipse cx={0} cy={0} rx={9.5} ry={10.5} fill="url(#kc-skin)" stroke={STROKE} strokeWidth="1.5" />
      <path
        d="M-6 -2 C-8 -10 -4 -14 0 -12 C4 -14 8 -10 6 -2"
        fill={SKIN}
        stroke={STROKE}
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <ellipse cx={-2} cy={2} rx={3} ry={2} fill={SKIN_SHADOW} opacity="0.25" />
    </g>
  );
}

/**
 * Sophisticated semi-realistic face — natural eyes, lids, brows, nose, lips.
 * Not cartoon circles.
 */
function Face({
  cx,
  cy,
  pose,
  looking,
  softer,
}: {
  cx: number;
  cy: number;
  pose: CharacterPose;
  looking: number;
  softer?: boolean;
}) {
  const eyeY = cy - 1;
  const lx = cx - 9 + looking * 0.6;
  const rx = cx + 9 + looking * 0.6;
  const brow = softer ? HAIR_MID : HAIR;
  const eyeW = softer ? 5.2 : 5.6;
  const eyeH = softer ? 3.4 : 3.6;

  return (
    <g className="kiss-cam-face">
      {/* Cheek shading */}
      <ellipse cx={cx - 12} cy={cy + 7} rx={7} ry={5} fill="url(#kc-cheek)" />
      <ellipse cx={cx + 12} cy={cy + 7} rx={7} ry={5} fill="url(#kc-cheek)" />

      {/* Soft jaw / cheek contour */}
      <path
        d={`M${cx - 18} ${cy + 4} Q${cx - 16} ${cy + 18} ${cx} ${cy + 22} Q${cx + 16} ${cy + 18} ${cx + 18} ${cy + 4}`}
        fill="none"
        stroke={SKIN_SHADOW}
        strokeWidth="1.2"
        opacity="0.28"
      />

      {/* Brows */}
      <path
        d={`M${lx - eyeW - 1} ${eyeY - 8} Q${lx} ${eyeY - 11} ${lx + eyeW} ${eyeY - 7.5}`}
        fill="none"
        stroke={brow}
        strokeWidth={softer ? 1.35 : 1.55}
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d={`M${rx - eyeW} ${eyeY - 7.5} Q${rx} ${eyeY - 11} ${rx + eyeW + 1} ${eyeY - 8}`}
        fill="none"
        stroke={brow}
        strokeWidth={softer ? 1.35 : 1.55}
        strokeLinecap="round"
        opacity="0.85"
      />

      {pose.eyesClosed ? (
        <>
          <path
            d={`M${lx - eyeW} ${eyeY} Q${lx} ${eyeY + 2.5} ${lx + eyeW} ${eyeY}`}
            fill="none"
            stroke={STROKE}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d={`M${rx - eyeW} ${eyeY} Q${rx} ${eyeY + 2.5} ${rx + eyeW} ${eyeY}`}
            fill="none"
            stroke={STROKE}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          {/* Left eye — almond */}
          <ellipse cx={lx} cy={eyeY} rx={eyeW} ry={eyeH} fill="#fff" stroke={STROKE} strokeWidth="1.15" />
          <ellipse cx={lx + looking * 0.15} cy={eyeY + 0.2} rx={2.4} ry={2.5} fill="#3a2a22" />
          <circle cx={lx + looking * 0.15} cy={eyeY + 0.2} r={1.15} fill="#1a1210" />
          <circle cx={lx + 0.9} cy={eyeY - 0.8} r={0.65} fill="#fff" />
          <path
            d={`M${lx - eyeW + 0.5} ${eyeY - 1} Q${lx} ${eyeY - eyeH - 0.8} ${lx + eyeW - 0.5} ${eyeY - 1}`}
            fill="none"
            stroke={STROKE}
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.55"
          />

          {/* Right eye */}
          <ellipse cx={rx} cy={eyeY} rx={eyeW} ry={eyeH} fill="#fff" stroke={STROKE} strokeWidth="1.15" />
          <ellipse cx={rx + looking * 0.15} cy={eyeY + 0.2} rx={2.4} ry={2.5} fill="#3a2a22" />
          <circle cx={rx + looking * 0.15} cy={eyeY + 0.2} r={1.15} fill="#1a1210" />
          <circle cx={rx + 0.9} cy={eyeY - 0.8} r={0.65} fill="#fff" />
          <path
            d={`M${rx - eyeW + 0.5} ${eyeY - 1} Q${rx} ${eyeY - eyeH - 0.8} ${rx + eyeW - 0.5} ${eyeY - 1}`}
            fill="none"
            stroke={STROKE}
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.55"
          />
        </>
      )}

      {/* Nose — bridge + tip (subtle) */}
      <path
        d={`M${cx - 0.5} ${cy - 4} Q${cx + 1.5} ${cy + 4} ${cx - 1.5} ${cy + 7}`}
        fill="none"
        stroke={SKIN_SHADOW}
        strokeWidth="1.35"
        strokeLinecap="round"
        opacity="0.7"
      />
      <ellipse cx={cx + 0.5} cy={cy + 7.5} rx={2.2} ry={1.4} fill={SKIN_SHADOW} opacity="0.28" />

      {/* Mouth */}
      {pose.mouth === "kiss" ? (
        <ellipse cx={cx} cy={cy + 15} rx={3.6} ry={2} fill={LIP} />
      ) : pose.mouth === "soft" ? (
        <>
          <path
            d={`M${cx - 6} ${cy + 14} Q${cx} ${cy + 17.5} ${cx + 6} ${cy + 14}`}
            fill={LIP_FILL}
            stroke={LIP}
            strokeWidth="1.1"
            opacity="0.9"
          />
          <path
            d={`M${cx - 5.5} ${cy + 13.5} Q${cx} ${cy + 15} ${cx + 5.5} ${cy + 13.5}`}
            fill="none"
            stroke={LIP}
            strokeWidth="1"
            opacity="0.65"
          />
        </>
      ) : (
        <>
          <path
            d={`M${cx - 7} ${cy + 13} Q${cx} ${cy + 19} ${cx + 7} ${cy + 13}`}
            fill={LIP_FILL}
            stroke={LIP}
            strokeWidth="1.15"
            opacity="0.92"
          />
          <path
            d={`M${cx - 6} ${cy + 13.2} Q${cx} ${cy + 15.5} ${cx + 6} ${cy + 13.2}`}
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="0.9"
          />
        </>
      )}
    </g>
  );
}

function GroomHair({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {/* Base silhouette — short sides */}
      <path
        d={`M${cx - 30} ${cy + 8}
           C${cx - 32} ${cy - 10} ${cx - 24} ${cy - 28} ${cx - 8} ${cy - 34}
           L${cx - 10} ${cy - 6}Z`}
        fill={HAIR}
        stroke={STROKE}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d={`M${cx + 30} ${cy + 10}
           C${cx + 32} ${cy - 8} ${cx + 22} ${cy - 26} ${cx + 6} ${cy - 32}
           L${cx + 10} ${cy - 4}Z`}
        fill={HAIR}
        stroke={STROKE}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Voluminous side-swept top (to his left / screen right) */}
      <path
        d={`M${cx - 22} ${cy - 4}
           C${cx - 28} ${cy - 36} ${cx - 6} ${cy - 48} ${cx + 12} ${cy - 46}
           C${cx + 30} ${cy - 44} ${cx + 34} ${cy - 24} ${cx + 28} ${cy - 6}
           C${cx + 18} ${cy - 18} ${cx + 2} ${cy - 22} ${cx - 12} ${cy - 14}Z`}
        fill={HAIR_MID}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Directional strands */}
      <path
        d={`M${cx - 10} ${cy - 28} Q${cx + 2} ${cy - 38} ${cx + 14} ${cy - 30}`}
        fill="none"
        stroke={HAIR}
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d={`M${cx - 4} ${cy - 22} Q${cx + 10} ${cy - 32} ${cx + 20} ${cy - 20}`}
        fill="none"
        stroke={HAIR}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d={`M${cx + 4} ${cy - 36} Q${cx + 16} ${cy - 40} ${cx + 24} ${cy - 28}`}
        fill="none"
        stroke={HAIR_HL}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 14} ${cy - 18} Q${cx - 2} ${cy - 26} ${cx + 8} ${cy - 16}`}
        fill="none"
        stroke={HAIR_HL}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.7"
      />
    </g>
  );
}

function BrideHairAndTiara({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {/* Soft side volume into updo */}
      <path
        d={`M${cx - 29} ${cy + 10}
           C${cx - 32} ${cy - 14} ${cx - 16} ${cy - 34} ${cx} ${cy - 36}
           C${cx + 16} ${cy - 34} ${cx + 32} ${cy - 14} ${cx + 29} ${cy + 10}
           C${cx + 20} ${cy - 6} ${cx + 8} ${cy - 12} ${cx} ${cy - 12}
           C${cx - 8} ${cy - 12} ${cx - 20} ${cy - 6} ${cx - 29} ${cy + 10}Z`}
        fill={HAIR}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Structured bun */}
      <ellipse cx={cx} cy={cy - 32} rx={13} ry={11} fill={HAIR_MID} stroke={STROKE} strokeWidth="1.5" />
      <ellipse cx={cx - 3} cy={cy - 34} rx={4.5} ry={3} fill={HAIR_HL} />
      <path
        d={`M${cx - 8} ${cy - 30} Q${cx} ${cy - 38} ${cx + 8} ${cy - 30}`}
        fill="none"
        stroke={HAIR}
        strokeWidth="1.4"
        opacity="0.7"
      />
      {/* Soft face-framing wisps */}
      <path
        d={`M${cx - 26} ${cy + 2} Q${cx - 22} ${cy + 14} ${cx - 18} ${cy + 18}`}
        fill="none"
        stroke={HAIR_MID}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d={`M${cx + 26} ${cy + 2} Q${cx + 22} ${cy + 14} ${cx + 18} ${cy + 18}`}
        fill="none"
        stroke={HAIR_MID}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* Delicate crystal tiara */}
      <path
        d={`M${cx - 18} ${cy - 24}
           Q${cx - 8} ${cy - 40} ${cx} ${cy - 44}
           Q${cx + 8} ${cy - 40} ${cx + 18} ${cy - 24}
           Q${cx + 6} ${cy - 30} ${cx} ${cy - 32}
           Q${cx - 6} ${cy - 30} ${cx - 18} ${cy - 24}Z`}
        fill={TIARA}
        stroke={STROKE_SOFT}
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <circle cx={cx} cy={cy - 42} r={2.2} fill={TIARA_GEM} stroke={STROKE_SOFT} strokeWidth="0.7" />
      <circle cx={cx - 8} cy={cy - 34} r={1.6} fill={TIARA_GEM} stroke={STROKE_SOFT} strokeWidth="0.65" />
      <circle cx={cx + 8} cy={cy - 34} r={1.6} fill={TIARA_GEM} stroke={STROKE_SOFT} strokeWidth="0.65" />
      <circle cx={cx - 13} cy={cy - 27} r={1.2} fill={TIARA_GEM} stroke={STROKE_SOFT} strokeWidth="0.55" />
      <circle cx={cx + 13} cy={cy - 27} r={1.2} fill={TIARA_GEM} stroke={STROKE_SOFT} strokeWidth="0.55" />
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
        className="h-[min(62vh,560px)] w-auto drop-shadow-[0_14px_28px_rgba(60,50,40,.2)]"
        style={{ overflow: "visible" }}
      >
        <SharedDefs />
        <ellipse cx="120" cy="444" rx="46" ry="8" fill="rgba(70,60,50,.14)" />

        {/* Legs + polished shoes — elegant adult proportions */}
        <g className="kiss-cam-legs">
          <path
            d="M94 275 C92 330 88 380 90 412 L114 412 C116 380 116 330 118 275Z"
            fill="url(#kc-tux)"
            stroke={STROKE}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M122 275 C124 330 126 380 126 412 L150 412 C152 380 148 330 146 275Z"
            fill={TUX_DARK}
            stroke={STROKE}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M88 412 L86 424 C90 426 110 426 114 424 L114 412Z"
            fill={TUX_DARK}
            stroke={STROKE}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M126 412 L126 424 C130 426 150 426 154 424 L152 412Z"
            fill={TUX_DARK}
            stroke={STROKE}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M90 418 H112" stroke={TUX_HL} strokeWidth="1.2" opacity="0.5" />
          <path d="M128 418 H150" stroke={TUX_HL} strokeWidth="1.2" opacity="0.5" />
        </g>

        {/* Double-breasted suit body */}
        <g className="kiss-cam-body kiss-cam-breathe">
          <path
            d="M78 132
               C78 112 96 100 120 100
               C144 100 162 112 162 132
               L170 275 L70 275Z"
            fill="url(#kc-tux)"
            stroke={STROKE}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          {/* Soft fabric fold */}
          <path
            d="M100 160 Q110 200 104 250"
            fill="none"
            stroke={TUX_HL}
            strokeWidth="2"
            opacity="0.45"
          />
          {/* Shirt */}
          <path d="M112 112 L120 210 L128 112Z" fill={SHIRT} stroke={STROKE} strokeWidth="1.2" />
          <path
            d="M108 106 L120 120 L132 106 L127 102 L120 110 L113 102Z"
            fill={SHIRT}
            stroke={STROKE}
            strokeWidth="1.15"
          />
          {/* Slim black tie */}
          <path d="M116 118 L120 126 L124 118 L122 114 L120 116 L118 114Z" fill={TIE} stroke={STROKE} strokeWidth="0.9" />
          <path d="M117.5 126 L120 208 L122.5 126Z" fill={TIE} stroke={STROKE} strokeWidth="0.9" />
          {/* Peak / notched lapels */}
          <path
            d="M110 110 L86 152 L104 160 L118 124Z"
            fill={TUX_DARK}
            stroke={STROKE}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M130 110 L154 152 L136 160 L122 124Z"
            fill={TUX_DARK}
            stroke={STROKE}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M110 112 L100 140" stroke={TUX_HL} strokeWidth="1" opacity="0.35" />
          <path d="M130 112 L140 140" stroke={TUX_HL} strokeWidth="1" opacity="0.35" />
          {/* Double-breasted buttons */}
          {[168, 198].map((y) => (
            <g key={y}>
              <circle cx="108" cy={y} r="2.8" fill={TUX_DARK} stroke={STROKE} strokeWidth="1" />
              <circle cx="132" cy={y} r="2.8" fill={TUX_DARK} stroke={STROKE} strokeWidth="1" />
              <circle cx="108" cy={y} r="1" fill="#c8ccd4" />
              <circle cx="132" cy={y} r="1" fill="#c8ccd4" />
            </g>
          ))}
        </g>

        {/* Outer arm (balloon) — transform origin preserved */}
        <g
          className="kiss-cam-arm-left"
          style={{
            transformOrigin: "78px 140px",
            transform: `rotate(${leftArmRot}deg)`,
          }}
        >
          <path d="M78 138 Q52 190 62 250" fill="none" stroke="url(#kc-tux)" strokeWidth="15" strokeLinecap="butt" />
          <path
            d="M78 138 Q52 190 62 250"
            fill="none"
            stroke={STROKE}
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.35"
          />
          <rect x="55" y="242" width="14" height="7" rx="1.5" fill={SHIRT} stroke={STROKE} strokeWidth="1" />
          <g className="kiss-cam-hand-left">
            <Hand cx={62} cy={258} />
          </g>
          <HeartBalloon color={BALLOON_PINK} x={54} y={120} />
        </g>

        {/* Inner arm (hold hands) — transform origin preserved */}
        <g
          className="kiss-cam-arm-right"
          style={{
            transformOrigin: "162px 140px",
            transform: `rotate(${rightArmRot}deg)`,
          }}
        >
          <path d="M162 138 Q198 185 188 248" fill="none" stroke={TUX_DARK} strokeWidth="15" strokeLinecap="butt" />
          <path
            d="M162 138 Q198 185 188 248"
            fill="none"
            stroke={STROKE}
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.35"
          />
          <rect x="181" y="240" width="14" height="7" rx="1.5" fill={SHIRT} stroke={STROKE} strokeWidth="1" />
          <g className="kiss-cam-hand-right">
            <Hand cx={188} cy={256} mirror />
          </g>
        </g>

        {/* Head — adult proportions (smaller than old cartoon head) */}
        <g
          className="kiss-cam-head"
          style={{
            transformOrigin: "120px 78px",
            transform: `rotate(${pose.headRot + pose.kissLean * -6}deg)`,
          }}
        >
          {/* Neck */}
          <path d="M110 96 L114 112 L126 112 L130 96Z" fill="url(#kc-skin)" stroke={STROKE} strokeWidth="1.2" />
          {/* Oval face — not a flat circle */}
          <ellipse cx="120" cy="72" rx="30" ry="34" fill="url(#kc-skin)" stroke={STROKE} strokeWidth="1.6" />
          <ellipse cx="120" cy="72" rx="30" ry="34" fill="url(#kc-skin-shadow)" />
          <ellipse cx="112" cy="64" rx="8" ry="6" fill="rgba(255,255,255,0.22)" />
          <GroomHair cx={120} cy={72} />
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
        viewBox="0 0 280 500"
        className="h-[min(64vh,580px)] w-auto drop-shadow-[0_14px_28px_rgba(60,50,40,.16)]"
        style={{ overflow: "visible" }}
      >
        <SharedDefs />
        <ellipse cx="140" cy="482" rx="70" ry="9" fill="rgba(70,60,50,.12)" />

        {/* Layered ball gown */}
        <g className="kiss-cam-dress">
          <path
            d="M104 190
               C72 255 52 365 66 472
               L214 472
               C228 365 208 255 176 190
               C162 212 118 212 104 190Z"
            fill="url(#kc-gown)"
            stroke={STROKE}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Hip volume / structured folds */}
          <path
            d="M98 200
               C80 222 76 248 92 262
               C112 248 128 234 140 224
               C152 234 168 248 188 262
               C204 248 200 222 182 200
               C166 218 152 224 140 220
               C128 224 114 218 98 200Z"
            fill={GOWN_MID}
            stroke={STROKE}
            strokeWidth="1.35"
            strokeLinejoin="round"
            opacity="0.95"
          />
          <path
            d="M110 265 C102 340 98 410 106 465 L174 465 C182 410 178 340 170 265"
            fill={GOWN_SHADOW}
            opacity="0.35"
          />
          {/* Soft tulle rings */}
          <path d="M86 310 Q140 292 194 310" fill="none" stroke={GOWN_MID} strokeWidth="5" opacity="0.5" />
          <path d="M78 370 Q140 350 202 370" fill="none" stroke={GOWN_MID} strokeWidth="7" opacity="0.38" />
          <path d="M72 420 Q140 402 208 420" fill="none" stroke={LACE} strokeWidth="4" opacity="0.45" />
        </g>

        {/* Lace square-neck bodice */}
        <g className="kiss-cam-body kiss-cam-breathe">
          <path
            d="M108 124 L172 124 L178 188 C158 206 122 206 102 188Z"
            fill="url(#kc-gown)"
            stroke={STROKE}
            strokeWidth="1.55"
            strokeLinejoin="round"
          />
          {/* Square neckline */}
          <path d="M116 124 L116 140 L164 140 L164 124" fill="none" stroke={STROKE} strokeWidth="1.2" opacity="0.4" />
          {/* Embroidery / lace motif */}
          <path
            d="M122 150 Q140 140 158 150 Q140 162 122 150Z"
            fill={LACE}
            stroke={STROKE_SOFT}
            strokeWidth="0.9"
            opacity="0.85"
          />
          <circle cx="140" cy="150" r="2.2" fill={TIARA_GEM} stroke={STROKE_SOFT} strokeWidth="0.6" />
          <circle cx="128" cy="164" r="1.6" fill={LACE} stroke={STROKE_SOFT} strokeWidth="0.55" />
          <circle cx="140" cy="168" r="1.8" fill={LACE} stroke={STROKE_SOFT} strokeWidth="0.55" />
          <circle cx="152" cy="164" r="1.6" fill={LACE} stroke={STROKE_SOFT} strokeWidth="0.55" />
          <path d="M120 176 Q140 168 160 176" fill="none" stroke={LACE} strokeWidth="1.2" />
          <path d="M118 184 Q140 176 162 184" fill="none" stroke={LACE} strokeWidth="1" opacity="0.8" />
        </g>

        {/* Sheer lace sleeves — origins preserved */}
        <g
          className="kiss-cam-arm-left"
          style={{
            transformOrigin: "104px 130px",
            transform: `rotate(${leftArmRot}deg)`,
          }}
        >
          <path
            d="M104 132 Q64 182 76 250"
            fill="none"
            stroke="rgba(255,252,248,0.78)"
            strokeWidth="14"
            strokeLinecap="butt"
          />
          <path
            d="M104 132 Q64 182 76 250"
            fill="none"
            stroke={STROKE_SOFT}
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.45"
            strokeDasharray="2.5 4"
          />
          <circle cx="90" cy="158" r="1.2" fill={LACE} />
          <circle cx="82" cy="188" r="1.2" fill={LACE} />
          <circle cx="78" cy="218" r="1.2" fill={LACE} />
          <g className="kiss-cam-hand-left">
            <Hand cx={76} cy={258} />
          </g>
        </g>

        <g
          className="kiss-cam-arm-right"
          style={{
            transformOrigin: "176px 130px",
            transform: `rotate(${rightArmRot}deg)`,
          }}
        >
          <path
            d="M176 132 Q216 180 206 250"
            fill="none"
            stroke="rgba(255,252,248,0.78)"
            strokeWidth="14"
            strokeLinecap="butt"
          />
          <path
            d="M176 132 Q216 180 206 250"
            fill="none"
            stroke={STROKE_SOFT}
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.45"
            strokeDasharray="2.5 4"
          />
          <circle cx="190" cy="158" r="1.2" fill={LACE} />
          <circle cx="198" cy="188" r="1.2" fill={LACE} />
          <circle cx="202" cy="218" r="1.2" fill={LACE} />
          <g className="kiss-cam-hand-right">
            <Hand cx={206} cy={258} mirror />
          </g>
          <HeartBalloon color={BALLOON_PEARL} x={214} y={122} />
        </g>

        {/* Translucent veil */}
        <g
          className="kiss-cam-veil"
          style={{
            transformOrigin: "140px 70px",
            transform: `rotate(${pose.headRot * 0.4}deg)`,
          }}
        >
          <path
            d="M100 78 C112 16 176 14 188 78 L200 248 C168 220 116 220 86 246Z"
            fill="url(#kc-veil)"
            stroke={STROKE_SOFT}
            strokeWidth="1"
            opacity="0.9"
          />
        </g>

        {/* Head — adult proportions */}
        <g
          className="kiss-cam-head"
          style={{
            transformOrigin: "140px 72px",
            transform: `rotate(${pose.headRot + pose.kissLean * 6}deg)`,
          }}
        >
          <path d="M130 96 L134 112 L146 112 L150 96Z" fill="url(#kc-skin)" stroke={STROKE} strokeWidth="1.15" />
          <ellipse cx="140" cy="72" rx="28" ry="32" fill="url(#kc-skin)" stroke={STROKE} strokeWidth="1.55" />
          <ellipse cx="140" cy="72" rx="28" ry="32" fill="url(#kc-skin-shadow)" />
          <ellipse cx="132" cy="64" rx="7" ry="5" fill="rgba(255,255,255,0.25)" />
          <BrideHairAndTiara cx={140} cy={72} />
          <Face cx={140} cy={76} pose={pose} looking={headLooking} softer />
        </g>
      </svg>
    </div>
  );
}
