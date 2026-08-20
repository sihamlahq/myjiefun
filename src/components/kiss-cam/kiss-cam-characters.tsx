"use client";

import { cn } from "@/lib/utils";
import type { KissCamAnimationPhase } from "@/components/kiss-cam/kiss-cam-types";

function poseForPhase(phase: KissCamAnimationPhase, side: "bride" | "groom") {
  const toward = side === "bride" ? -1 : 1;
  switch (phase) {
    case "idle":
      return { x: toward * 38, lean: 0, hands: 0, scale: 1 };
    case "approach":
      return { x: toward * 18, lean: toward * 2, hands: 0.2, scale: 1 };
    case "holdHands":
      return { x: toward * 10, lean: toward * 4, hands: 1, scale: 1 };
    case "romanticPause":
      return { x: toward * 9, lean: toward * 6, hands: 1, scale: 1.02 };
    case "moveCloser":
      return { x: toward * 5, lean: toward * 10, hands: 1, scale: 1.03 };
    case "countdown":
      return { x: toward * 4, lean: toward * 12, hands: 1, scale: 1.04 };
    case "kiss":
      return { x: toward * 1.5, lean: toward * 16, hands: 1, scale: 1.05 };
    case "celebration":
    case "final":
      return { x: toward * 3, lean: toward * 8, hands: 1, scale: 1.04 };
    default:
      return { x: toward * 38, lean: 0, hands: 0, scale: 1 };
  }
}

export function GroomFigure({
  phase,
  className,
}: {
  phase: KissCamAnimationPhase;
  className?: string;
}) {
  const pose = poseForPhase(phase, "groom");
  return (
    <div
      className={cn("kiss-cam-figure pointer-events-none absolute bottom-[8%] origin-bottom", className)}
      style={{
        left: `calc(50% + ${pose.x}%)`,
        transform: `translateX(-50%) rotate(${pose.lean}deg) scale(${pose.scale})`,
      }}
      aria-hidden
    >
      <svg viewBox="0 0 220 420" className="h-[min(58vh,520px)] w-auto drop-shadow-[0_18px_40px_rgba(80,50,30,.22)]">
        <ellipse cx="110" cy="404" rx="52" ry="10" fill="rgba(60,40,20,.12)" />
        {/* legs */}
        <path d="M78 250 L70 390 L98 390 L104 250 Z" fill="#1f2430" />
        <path d="M122 250 L118 390 L146 390 L140 250 Z" fill="#161a22" />
        {/* torso / tuxedo */}
        <path d="M62 118 C62 100 86 86 110 86 C134 86 158 100 158 118 L168 248 L52 248 Z" fill="#1a1f2b" />
        <path d="M110 96 L110 248" stroke="#c9a66b" strokeWidth="2" opacity=".55" />
        <path d="M96 118 L110 150 L124 118" fill="#f4efe6" />
        <circle cx="110" cy="132" r="3.5" fill="#b08d57" />
        {/* arms */}
        <path
          d={`M62 130 Q ${40 - pose.hands * 10} 180 ${70 + pose.hands * 28} 230`}
          fill="none"
          stroke="#1a1f2b"
          strokeWidth="22"
          strokeLinecap="round"
        />
        <path
          d={`M158 130 Q ${180 + pose.hands * 6} 175 ${150 - pose.hands * 18} 225`}
          fill="none"
          stroke="#12151c"
          strokeWidth="22"
          strokeLinecap="round"
        />
        {/* head */}
        <circle cx="110" cy="58" r="34" fill="#e8c4a8" />
        <path d="M78 48 C90 22 130 20 142 48 C130 40 90 40 78 48" fill="#2c241c" />
        <path d="M96 66 Q110 72 124 66" fill="none" stroke="#b07d5c" strokeWidth="2" strokeLinecap="round" />
        <circle cx="98" cy="58" r="2.2" fill="#3a2a22" />
        <circle cx="122" cy="58" r="2.2" fill="#3a2a22" />
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
  return (
    <div
      className={cn("kiss-cam-figure pointer-events-none absolute bottom-[8%] origin-bottom", className)}
      style={{
        left: `calc(50% + ${pose.x}%)`,
        transform: `translateX(-50%) rotate(${pose.lean}deg) scale(${pose.scale})`,
      }}
      aria-hidden
    >
      <svg viewBox="0 0 240 440" className="h-[min(60vh,540px)] w-auto drop-shadow-[0_18px_40px_rgba(80,50,30,.18)]">
        <ellipse cx="120" cy="422" rx="64" ry="10" fill="rgba(60,40,20,.1)" />
        {/* gown */}
        <path
          d="M78 150 C70 210 48 320 56 410 L184 410 C192 320 170 210 162 150 C150 168 90 168 78 150 Z"
          fill="#f7f1e8"
        />
        <path
          d="M88 160 C92 230 86 320 92 400 L148 400 C154 320 148 230 152 160"
          fill="#fffaf3"
          opacity=".7"
        />
        {/* bodice */}
        <path d="M86 112 C96 96 144 96 154 112 L162 168 C140 184 100 184 78 168 Z" fill="#f3ebe0" />
        <path d="M110 118 L120 150 L130 118" fill="none" stroke="#c9a66b" strokeWidth="1.4" opacity=".7" />
        {/* arms */}
        <path
          d={`M86 128 Q ${60 - pose.hands * 8} 175 ${95 + pose.hands * 22} 228`}
          fill="none"
          stroke="#e8c4a8"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d={`M154 128 Q ${185 + pose.hands * 10} 170 ${145 - pose.hands * 26} 230`}
          fill="none"
          stroke="#e2b997"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* veil */}
        <path d="M78 70 C90 20 150 18 164 72 L170 170 C140 150 100 150 72 168 Z" fill="rgba(255,255,255,.55)" />
        {/* head */}
        <circle cx="120" cy="62" r="33" fill="#f0c9ae" />
        <path d="M90 58 C100 28 145 26 152 60 C140 46 100 46 90 58" fill="#5a3d2b" />
        <path d="M108 70 Q120 76 132 70" fill="none" stroke="#c48a6a" strokeWidth="2" strokeLinecap="round" />
        <circle cx="110" cy="60" r="2.1" fill="#3a2a22" />
        <circle cx="130" cy="60" r="2.1" fill="#3a2a22" />
        <circle cx="120" cy="48" r="4" fill="#d4af37" opacity=".75" />
      </svg>
    </div>
  );
}
