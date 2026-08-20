"use client";

import { useEffect, useRef, useState } from "react";
import { BrideFigure, GroomFigure, HeldHandsAccent } from "@/components/kiss-cam/kiss-cam-characters";
import {
  KissCamBackground,
  KissCamBalloons,
  KissCamConfetti,
  KissCamHearts,
} from "@/components/kiss-cam/kiss-cam-atmosphere";
import { KissCamCanvasCompositor } from "@/components/kiss-cam/kiss-cam-canvas-compositor";
import type { CameraLayoutMode, KissCamAnimationPhase } from "@/components/kiss-cam/kiss-cam-types";

type KissCamDisplayProps = {
  phase: KissCamAnimationPhase;
  countdownValue: number | null;
  coupleNames: string;
  tagline?: string;
  cameraEnabled: boolean;
  cameraLayout: CameraLayoutMode;
  remoteStream: MediaStream | null;
  celebrate: boolean;
  showCharacters: boolean;
  /** Fill the parent completely (true fullscreen) — no 16:9 letterboxing. */
  fillViewport?: boolean;
  className?: string;
};

export function KissCamDisplay({
  phase,
  countdownValue,
  coupleNames,
  tagline = "A Moment to Remember",
  cameraEnabled,
  cameraLayout,
  remoteStream,
  celebrate,
  showCharacters,
  fillViewport = false,
  className = "",
}: KissCamDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [fadeIn, setFadeIn] = useState(true);
  const hadStream = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setVideoEl(video);
    if (remoteStream) {
      if (!hadStream.current) setFadeIn(true);
      else setFadeIn(true);
      hadStream.current = true;
      video.srcObject = remoteStream;
      void video.play().catch(() => undefined);
    } else {
      video.srcObject = null;
    }
  }, [remoteStream]);

  const finalFrame = phase === "final" || phase === "celebration";

  return (
    <div
      className={
        fillViewport
          ? `kiss-cam-stage relative h-full w-full overflow-hidden bg-[#e8f2f8] ${className}`
          : `kiss-cam-stage relative aspect-video w-full overflow-hidden bg-[#e8f2f8] ${className}`
      }
      style={fillViewport ? undefined : { aspectRatio: "16 / 9" }}
    >
      <KissCamBackground active />

      <video
        ref={videoRef}
        className="pointer-events-none absolute h-px w-px opacity-0"
        muted
        playsInline
        autoPlay
        aria-hidden
      />

      <KissCamCanvasCompositor
        video={videoEl}
        enabled={cameraEnabled && Boolean(remoteStream)}
        layout={cameraLayout}
        fadeIn={fadeIn}
      />

      <KissCamBalloons active celebrate={celebrate} />

      {showCharacters ? (
        <>
          <GroomFigure phase={phase} className="z-[3]" />
          <BrideFigure phase={phase} className="z-[4]" />
          <HeldHandsAccent phase={phase} />
        </>
      ) : null}

      <KissCamHearts active={celebrate} />
      <KissCamConfetti active={celebrate} />

      {phase === "countdown" && countdownValue != null ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span
            key={countdownValue}
            className="kiss-cam-countdown font-heading text-[min(28vw,220px)] font-semibold leading-none text-[#5a2f38]/90 drop-shadow-[0_8px_30px_rgba(90,40,50,.25)]"
          >
            {countdownValue}
          </span>
        </div>
      ) : null}

      {phase === "kiss" ? (
        <div className="pointer-events-none absolute inset-0 z-10 kiss-cam-kiss-glow" aria-hidden />
      ) : null}

      {finalFrame ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[6%] z-30 flex flex-col items-center px-6 text-center">
          <p className="font-heading text-[clamp(1.75rem,4.5vw,3.75rem)] font-semibold tracking-wide text-[#3a2a22]">
            {coupleNames}
          </p>
          <p className="mt-2 text-[clamp(0.75rem,1.6vw,1.15rem)] font-semibold uppercase tracking-[0.35em] text-[#6a7a88]/85">
            {tagline}
          </p>
        </div>
      ) : phase === "idle" && !remoteStream ? (
        <div className="pointer-events-none absolute inset-x-0 top-[8%] z-10 flex flex-col items-center px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#6a7a88]/75">Kiss Cam</p>
          <p className="font-heading mt-2 text-3xl text-[#3a2a22]/85 sm:text-4xl">{coupleNames}</p>
        </div>
      ) : null}
    </div>
  );
}
