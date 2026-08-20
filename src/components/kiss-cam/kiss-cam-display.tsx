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
import { KissCamLoveBurst } from "@/components/kiss-cam/kiss-cam-love-burst";
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
  loveBurst?: boolean;
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
  loveBurst = false,
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
  const cameraLive = cameraEnabled && Boolean(remoteStream);

  return (
    <div
      className={
        fillViewport
          ? `kiss-cam-stage relative h-full w-full overflow-hidden bg-[#3a2430] ${className}`
          : `kiss-cam-stage relative aspect-video w-full overflow-hidden bg-[#3a2430] ${className}`
      }
      style={fillViewport ? undefined : { aspectRatio: "16 / 9" }}
    >
      <KissCamBackground active lite={cameraLive} />

      <video
        ref={videoRef}
        className="pointer-events-none absolute h-px w-px opacity-0"
        muted
        playsInline
        autoPlay
        disablePictureInPicture
        aria-hidden
      />

      <KissCamCanvasCompositor
        video={videoEl}
        enabled={cameraLive}
        layout={cameraLayout}
        fadeIn={fadeIn}
      />

      <KissCamBalloons active={!cameraLive || celebrate} celebrate={celebrate} />

      {showCharacters ? (
        <>
          <GroomFigure phase={phase} className="z-[3]" />
          <BrideFigure phase={phase} className="z-[4]" />
          <HeldHandsAccent phase={phase} />
        </>
      ) : null}

      <KissCamHearts active={celebrate || loveBurst} />
      <KissCamConfetti active={celebrate || loveBurst} />
      <KissCamLoveBurst active={loveBurst} size="stage" />

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
          <p className="font-heading text-[clamp(1.75rem,4.5vw,3.75rem)] font-semibold tracking-wide text-[#3a2430]">
            {coupleNames}
          </p>
          <p className="mt-2 text-[clamp(0.75rem,1.6vw,1.15rem)] font-semibold uppercase tracking-[0.35em] text-[#8b3a55]/80">
            {tagline}
          </p>
        </div>
      ) : phase === "idle" && !remoteStream ? (
        <div className="pointer-events-none absolute inset-x-0 top-[7%] z-10 flex flex-col items-center px-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#c45a78]/80">
            TableWedding
          </p>
          <h2 className="kiss-cam-love-title mt-1 text-[clamp(2.75rem,7vw,5.5rem)]">
            <span className="kiss-cam-love-title-accent mr-1 text-[0.72em]" aria-hidden>
              ♥
            </span>
            Kiss Cam
            <span className="kiss-cam-love-title-accent ml-1 text-[0.72em]" aria-hidden>
              ♥
            </span>
          </h2>
          <p className="font-heading mt-2 text-xl italic tracking-wide text-[#5a2f38]/75 sm:text-2xl">
            {coupleNames}
          </p>
        </div>
      ) : null}
    </div>
  );
}
