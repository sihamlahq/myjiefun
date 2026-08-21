"use client";

import { cn } from "@/lib/utils";
import type { KissCamAnimationPhase } from "@/components/kiss-cam/kiss-cam-types";
import { poseForPhase, type CharacterPose } from "@/components/kiss-cam/kiss-cam-pose";

/**
 * Modular TableWedding Kiss Cam characters.
 * Styled after the couple’s wedding look: groom pompadour + black double-breasted
 * suit; bride updo + crystal tiara + lace ball gown with sheer sleeves.
 * Artwork language stays simple 2D wedding-invitation illustration.
 */

const STROKE = "#4a4038";
const STROKE_W = 2.2;
/** Fairer skin to match the couple photo */
const SKIN = "#f6d2bc";
const SKIN_SOFT = "#f0c4aa";
const BLUSH = "#f2a8b0";
const LIP = "#e8a0a8";
const LIP_SOFT = "#d4878f";
const HAIR_GROOM = "#2c211c";
const HAIR_BRIDE = "#2f241f";
const TUX = "#141416";
const TUX_DARK = "#0a0a0c";
const SHIRT = "#fffcf8";
const TIE = "#101012";
const GOWN = "#fffcf8";
const GOWN_EDGE = "#f3ebe3";
const GOWN_LACE = "#efe6dc";
const VEIL = "rgba(255,255,255,0.78)";
const TIARA = "#d8e0ea";
const TIARA_SHINE = "#f4f7fb";
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
      {/* Soft brows */}
      <path
        d={`M${lx - 7} ${eyeY - 9} Q${lx} ${eyeY - 12} ${lx + 7} ${eyeY - 8}`}
        fill="none"
        stroke={STROKE}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d={`M${rx - 7} ${eyeY - 8} Q${rx} ${eyeY - 12} ${rx + 7} ${eyeY - 9}`}
        fill="none"
        stroke={STROKE}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx={cx - 14} cy={cy + 6} r={5.5} fill={BLUSH} opacity={0.42} />
      <circle cx={cx + 14} cy={cy + 6} r={5.5} fill={BLUSH} opacity={0.42} />
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
          <circle cx={lx} cy={eyeY} r={2.5} fill={STROKE} />
          <circle cx={rx} cy={eyeY} r={2.5} fill={STROKE} />
          <circle cx={lx + 0.7} cy={eyeY - 0.7} r={0.7} fill="#fff" />
          <circle cx={rx + 0.7} cy={eyeY - 0.7} r={0.7} fill="#fff" />
        </>
      )}
      {pose.mouth === "kiss" ? (
        <ellipse cx={cx} cy={cy + 14} rx={4} ry={2.2} fill={LIP_SOFT} />
      ) : pose.mouth === "soft" ? (
        <path
          d={`M${cx - 7} ${cy + 13} Q${cx} ${cy + 17} ${cx + 7} ${cy + 13}`}
          fill="none"
          stroke={LIP}
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        /* Warm open smile */
        <path
          d={`M${cx - 9} ${cy + 11} Q${cx} ${cy + 21} ${cx + 9} ${cy + 11}`}
          fill="none"
          stroke={LIP}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

/** Voluminous pompadour — swept up, shorter sides (from couple photo). */
function GroomHair({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g className="kiss-cam-hair-groom">
      {/* Side fade / short temples */}
      <path
        d={`M${cx - 40} ${cy + 2}
           C${cx - 42} ${cy - 18} ${cx - 28} ${cy - 34} ${cx - 12} ${cy - 38}
           L${cx - 18} ${cy - 8}Z`}
        fill={HAIR_GROOM}
        stroke={STROKE}
        strokeWidth={STROKE_W}
        strokeLinejoin="round"
      />
      <path
        d={`M${cx + 40} ${cy + 4}
           C${cx + 42} ${cy - 16} ${cx + 30} ${cy - 32} ${cx + 14} ${cy - 36}
           L${cx + 20} ${cy - 6}Z`}
        fill={HAIR_GROOM}
        stroke={STROKE}
        strokeWidth={STROKE_W}
        strokeLinejoin="round"
      />
      {/* Tall swept pompadour volume (slightly to his left / our right) */}
      <path
        d={`M${cx - 28} ${cy - 6}
           C${cx - 34} ${cy - 48} ${cx - 8} ${cy - 62} ${cx + 10} ${cy - 58}
           C${cx + 36} ${cy - 52} ${cx + 42} ${cy - 28} ${cx + 34} ${cy - 8}
           C${cx + 22} ${cy - 22} ${cx + 4} ${cy - 28} ${cx - 14} ${cy - 18}Z`}
        fill={HAIR_GROOM}
        stroke={STROKE}
        strokeWidth={STROKE_W}
        strokeLinejoin="round"
      />
      {/* Soft highlight in the lift */}
      <path
        d={`M${cx - 6} ${cy - 40} Q${cx + 8} ${cy - 48} ${cx + 18} ${cy - 36}`}
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  );
}

/** Smooth dark updo + crystal tiara. */
function BrideHairAndTiara({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g className="kiss-cam-hair-bride">
      {/* Soft crown / swept sides into updo */}
      <path
        d={`M${cx - 38} ${cy + 6}
           C${cx - 40} ${cy - 22} ${cx - 18} ${cy - 40} ${cx} ${cy - 42}
           C${cx + 18} ${cy - 40} ${cx + 40} ${cy - 22} ${cx + 38} ${cy + 6}
           C${cx + 28} ${cy - 10} ${cx + 12} ${cy - 16} ${cx} ${cy - 14}
           C${cx - 12} ${cy - 16} ${cx - 28} ${cy - 10} ${cx - 38} ${cy + 6}Z`}
        fill={HAIR_BRIDE}
        stroke={STROKE}
        strokeWidth={STROKE_W}
        strokeLinejoin="round"
      />
      {/* High bun */}
      <ellipse
        cx={cx}
        cy={cy - 36}
        rx={16}
        ry={13}
        fill={HAIR_BRIDE}
        stroke={STROKE}
        strokeWidth={STROKE_W}
      />
      <ellipse cx={cx - 4} cy={cy - 38} rx={5} ry={3.5} fill="rgba(255,255,255,0.12)" />
      {/* Crystal / silver tiara */}
      <path
        d={`M${cx - 22} ${cy - 28}
           Q${cx - 10} ${cy - 46} ${cx} ${cy - 50}
           Q${cx + 10} ${cy - 46} ${cx + 22} ${cy - 28}
           Q${cx + 8} ${cy - 34} ${cx} ${cy - 36}
           Q${cx - 8} ${cy - 34} ${cx - 22} ${cy - 28}Z`}
        fill={TIARA}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx={cx} cy={cy - 48} r={2.6} fill={TIARA_SHINE} stroke={STROKE} strokeWidth="0.9" />
      <circle cx={cx - 10} cy={cy - 40} r={2} fill={TIARA_SHINE} stroke={STROKE} strokeWidth="0.8" />
      <circle cx={cx + 10} cy={cy - 40} r={2} fill={TIARA_SHINE} stroke={STROKE} strokeWidth="0.8" />
      <circle cx={cx - 16} cy={cy - 32} r={1.5} fill={TIARA_SHINE} stroke={STROKE} strokeWidth="0.7" />
      <circle cx={cx + 16} cy={cy - 32} r={1.5} fill={TIARA_SHINE} stroke={STROKE} strokeWidth="0.7" />
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
        className="h-[min(62vh,560px)] w-auto drop-shadow-[0_14px_28px_rgba(60,50,40,.18)]"
        style={{ overflow: "visible" }}
      >
        <ellipse cx="120" cy="444" rx="48" ry="9" fill="rgba(70,60,50,.12)" />

        {/* legs + dress shoes */}
        <g className="kiss-cam-legs">
          <path
            d="M92 268 L86 412 L114 412 L118 268Z"
            fill={TUX}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path
            d="M122 268 L128 412 L156 412 L148 268Z"
            fill={TUX_DARK}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path
            d="M84 412 L86 424 L116 424 L114 412Z"
            fill={TUX_DARK}
            stroke={STROKE}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M126 412 L128 424 L158 424 L156 412Z"
            fill={TUX_DARK}
            stroke={STROKE}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </g>

        {/* Double-breasted black suit + white shirt + slim black tie */}
        <g className="kiss-cam-body kiss-cam-breathe">
          <path
            d="M76 128 C76 108 96 96 120 96 C144 96 164 108 164 128 L174 272 L66 272Z"
            fill={TUX}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          {/* Shirt placket */}
          <path
            d="M112 108 L120 200 L128 108Z"
            fill={SHIRT}
            stroke={STROKE}
            strokeWidth="1.5"
          />
          {/* Collar */}
          <path d="M108 104 L120 118 L132 104 L126 100 L120 108 L114 100Z" fill={SHIRT} stroke={STROKE} strokeWidth="1.4" />
          {/* Slim black necktie */}
          <path
            d="M116 116 L120 124 L124 116 L122 112 L120 114 L118 112Z"
            fill={TIE}
            stroke={STROKE}
            strokeWidth="1.1"
          />
          <path
            d="M117 124 L120 198 L123 124Z"
            fill={TIE}
            stroke={STROKE}
            strokeWidth="1.1"
          />
          {/* Notched lapels */}
          <path
            d="M108 108 L88 150 L104 156 L116 122Z"
            fill={TUX_DARK}
            stroke={STROKE}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M132 108 L152 150 L136 156 L124 122Z"
            fill={TUX_DARK}
            stroke={STROKE}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Double-breasted buttons (4) */}
          <circle cx="108" cy="168" r="3.2" fill={TUX_DARK} stroke={STROKE} strokeWidth="1.1" />
          <circle cx="132" cy="168" r="3.2" fill={TUX_DARK} stroke={STROKE} strokeWidth="1.1" />
          <circle cx="108" cy="198" r="3.2" fill={TUX_DARK} stroke={STROKE} strokeWidth="1.1" />
          <circle cx="132" cy="198" r="3.2" fill={TUX_DARK} stroke={STROKE} strokeWidth="1.1" />
          <circle cx="108" cy="168" r="1.1" fill="#c9cdd4" />
          <circle cx="132" cy="168" r="1.1" fill="#c9cdd4" />
          <circle cx="108" cy="198" r="1.1" fill="#c9cdd4" />
          <circle cx="132" cy="198" r="1.1" fill="#c9cdd4" />
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
            strokeLinecap="butt"
          />
          <path
            d="M78 138 Q52 190 62 250"
            fill="none"
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinecap="round"
            opacity="0.35"
          />
          {/* Shirt cuff peek */}
          <rect x="54" y="242" width="16" height="8" rx="2" fill={SHIRT} stroke={STROKE} strokeWidth="1.2" />
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
            strokeLinecap="butt"
          />
          <path
            d="M162 138 Q198 185 188 248"
            fill="none"
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinecap="round"
            opacity="0.35"
          />
          <rect x="180" y="240" width="16" height="8" rx="2" fill={SHIRT} stroke={STROKE} strokeWidth="1.2" />
          <g className="kiss-cam-hand-right">
            <circle cx="188" cy="256" r="11" fill={SKIN} stroke={STROKE} strokeWidth={STROKE_W} />
          </g>
        </g>

        {/* head + pompadour + face */}
        <g
          className="kiss-cam-head"
          style={{
            transformOrigin: "120px 78px",
            transform: `rotate(${pose.headRot + pose.kissLean * -6}deg)`,
          }}
        >
          <circle cx="120" cy="70" r="42" fill={SKIN} stroke={STROKE} strokeWidth={STROKE_W} />
          <GroomHair cx={120} cy={70} />
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
        className="h-[min(64vh,580px)] w-auto drop-shadow-[0_14px_28px_rgba(60,50,40,.14)]"
        style={{ overflow: "visible" }}
      >
        <ellipse cx="140" cy="482" rx="72" ry="10" fill="rgba(70,60,50,.1)" />

        {/* Voluminous ball-gown skirt with hip ruffles */}
        <g className="kiss-cam-dress">
          <path
            d="M102 188
               C70 250 48 360 62 470
               L218 470
               C232 360 210 250 178 188
               C164 208 116 208 102 188Z"
            fill={GOWN}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          {/* Structured hip ruffles / peplum folds */}
          <path
            d="M96 198
               C78 220 72 248 88 262
               C108 248 126 232 140 220
               C154 232 172 248 192 260
               C208 248 202 220 184 198
               C168 214 152 220 140 216
               C128 220 112 214 96 198Z"
            fill={GOWN_EDGE}
            stroke={STROKE}
            strokeWidth="1.7"
            strokeLinejoin="round"
            opacity="0.95"
          />
          <path
            d="M108 260 C100 330 96 400 104 460 L176 460 C184 400 180 330 172 260"
            fill={GOWN_LACE}
            opacity="0.45"
          />
          {/* Soft tulle layers */}
          <path
            d="M88 300 Q140 280 192 300"
            fill="none"
            stroke={GOWN_EDGE}
            strokeWidth="6"
            opacity="0.55"
          />
          <path
            d="M78 360 Q140 338 202 360"
            fill="none"
            stroke={GOWN_EDGE}
            strokeWidth="8"
            opacity="0.4"
          />
        </g>

        {/* Lace-embellished square-neck bodice */}
        <g className="kiss-cam-body kiss-cam-breathe">
          <path
            d="M106 122
               L174 122
               L180 186
               C160 204 120 204 100 186Z"
            fill={GOWN}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          {/* Square neckline inset */}
          <path
            d="M114 122 L114 138 L166 138 L166 122"
            fill="none"
            stroke={STROKE}
            strokeWidth="1.5"
            opacity="0.45"
          />
          {/* Floral lace / bead sparkles on bodice */}
          <circle cx="128" cy="148" r="2.2" fill={GOWN_LACE} stroke={STROKE} strokeWidth="0.8" />
          <circle cx="140" cy="156" r="2.6" fill={GOWN_LACE} stroke={STROKE} strokeWidth="0.8" />
          <circle cx="152" cy="148" r="2.2" fill={GOWN_LACE} stroke={STROKE} strokeWidth="0.8" />
          <circle cx="134" cy="168" r="1.8" fill={GOWN_LACE} stroke={STROKE} strokeWidth="0.7" />
          <circle cx="146" cy="168" r="1.8" fill={GOWN_LACE} stroke={STROKE} strokeWidth="0.7" />
          <path
            d="M124 158 Q140 148 156 158"
            fill="none"
            stroke={GOWN_LACE}
            strokeWidth="1.4"
            opacity="0.9"
          />
          <path
            d="M122 174 Q140 166 158 174"
            fill="none"
            stroke={GOWN_LACE}
            strokeWidth="1.3"
            opacity="0.8"
          />
        </g>

        {/* Sheer lace long sleeves (inner — hold hands) */}
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
            stroke="rgba(255,252,248,0.72)"
            strokeWidth="16"
            strokeLinecap="butt"
          />
          <path
            d="M104 132 Q64 182 76 250"
            fill="none"
            stroke={STROKE}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.35"
            strokeDasharray="3 5"
          />
          {/* Lace sleeve dots */}
          <circle cx="90" cy="160" r="1.4" fill={GOWN_LACE} stroke={STROKE} strokeWidth="0.5" />
          <circle cx="82" cy="190" r="1.4" fill={GOWN_LACE} stroke={STROKE} strokeWidth="0.5" />
          <circle cx="78" cy="220" r="1.4" fill={GOWN_LACE} stroke={STROKE} strokeWidth="0.5" />
          <g className="kiss-cam-hand-left">
            <circle cx="76" cy="258" r="10.5" fill={SKIN} stroke={STROKE} strokeWidth={STROKE_W} />
          </g>
        </g>

        {/* Sheer lace long sleeve (outer — balloon) */}
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
            stroke="rgba(255,252,248,0.72)"
            strokeWidth="16"
            strokeLinecap="butt"
          />
          <path
            d="M176 132 Q216 180 206 250"
            fill="none"
            stroke={STROKE}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.35"
            strokeDasharray="3 5"
          />
          <circle cx="190" cy="160" r="1.4" fill={GOWN_LACE} stroke={STROKE} strokeWidth="0.5" />
          <circle cx="198" cy="190" r="1.4" fill={GOWN_LACE} stroke={STROKE} strokeWidth="0.5" />
          <circle cx="202" cy="220" r="1.4" fill={GOWN_LACE} stroke={STROKE} strokeWidth="0.5" />
          <g className="kiss-cam-hand-right">
            <circle cx="206" cy="258" r="10.5" fill={SKIN} stroke={STROKE} strokeWidth={STROKE_W} />
          </g>
          <HeartBalloon color={BALLOON_PEARL} x={214} y={122} />
        </g>

        {/* Long sheer veil behind head */}
        <g
          className="kiss-cam-veil"
          style={{
            transformOrigin: "140px 70px",
            transform: `rotate(${pose.headRot * 0.4}deg)`,
          }}
        >
          <path
            d="M96 78 C110 12 178 10 190 78 L204 240 C170 214 116 214 82 238Z"
            fill={VEIL}
            stroke={STROKE}
            strokeWidth="1.3"
            opacity="0.92"
          />
        </g>

        {/* head + updo + tiara + face */}
        <g
          className="kiss-cam-head"
          style={{
            transformOrigin: "140px 72px",
            transform: `rotate(${pose.headRot + pose.kissLean * 6}deg)`,
          }}
        >
          <circle cx="140" cy="72" r="40" fill={SKIN} stroke={STROKE} strokeWidth={STROKE_W} />
          <BrideHairAndTiara cx={140} cy={72} />
          <Face cx={140} cy={76} pose={pose} looking={headLooking} />
        </g>
      </svg>
    </div>
  );
}
