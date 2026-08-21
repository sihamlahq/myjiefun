"use client";

import { useEffect, useRef, useState } from "react";
import { BrideFigure, GroomFigure } from "@/components/kiss-cam/kiss-cam-characters";
import {
  KissCamBackground,
  KissCamBalloons,
  KissCamConfetti,
  KissCamHearts,
} from "@/components/kiss-cam/kiss-cam-atmosphere";
import { KissCamCanvasCompositor } from "@/components/kiss-cam/kiss-cam-canvas-compositor";
import { KissCamKissEmoji } from "@/components/kiss-cam/kiss-cam-kiss-emoji";
import { KissCamLoadingOverlay } from "@/components/kiss-cam/kiss-cam-loading";
import { KissCamLoveBurst } from "@/components/kiss-cam/kiss-cam-love-burst";
import type { CameraLayoutMode, KissCamAnimationPhase } from "@/components/kiss-cam/kiss-cam-types";

type KissCamDisplayProps = {
  phase: KissCamAnimationPhase;
  countdownValue: number | null;
  /** Manual countdown from the phone (1 / 2 / 3 buttons). */
  remoteCountdown?: 1 | 2 | 3 | null;
  /** Bumps on every phone press so the same digit can replay. */
  remoteCountdownTick?: number;
  coupleNames: string;
  tagline?: string;
  cameraEnabled: boolean;
  cameraLayout: CameraLayoutMode;
  remoteStream: MediaStream | null;
  celebrate: boolean;
  loveBurst?: boolean;
  /** Soft loading overlay — keeps background + couple visible. */
  loading?: boolean;
  showCharacters: boolean;
  /** Fill the parent completely (true fullscreen) — no 16:9 letterboxing. */
  fillViewport?: boolean;
  /** Development-only character rig overlay (never in production). */
  rigDebug?: boolean;
  className?: string;
};

export function KissCamDisplay({
  phase,
  countdownValue,
  remoteCountdown = null,
  remoteCountdownTick = 0,
  coupleNames,
  tagline = "A Moment to Remember",
  cameraEnabled,
  cameraLayout,
  remoteStream,
  celebrate,
  loveBurst = false,
  loading = false,
  showCharacters,
  fillViewport = false,
  rigDebug = false,
  className = "",
}: KissCamDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [fadeIn, setFadeIn] = useState(true);
  const [autoLove, setAutoLove] = useState(false);
  const [autoLoveId, setAutoLoveId] = useState(0);
  const hadStream = useRef(false);
  const lastPhaseRef = useRef(phase);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setVideoEl(video);
    if (remoteStream) {
      if (!hadStream.current) setFadeIn(true);
      else setFadeIn(true);
      hadStream.current = true;
      const sameObject = video.srcObject === remoteStream;
      if (!sameObject) {
        video.srcObject = remoteStream;
      }
      // iOS / Chrome often need an explicit play after unmute or replaceTrack.
      void video.play().catch(() => undefined);
      const track = remoteStream.getVideoTracks()[0];
      if (track) {
        const kick = () => {
          void video.play().catch(() => undefined);
          setFadeIn(true);
        };
        track.addEventListener("unmute", kick);
        track.addEventListener("ended", kick);
        return () => {
          track.removeEventListener("unmute", kick);
          track.removeEventListener("ended", kick);
        };
      }
    } else {
      video.srcObject = null;
    }
  }, [remoteStream]);

  // When loading clears, force the compositor video to wake up immediately.
  useEffect(() => {
    if (loading) return;
    const video = videoRef.current;
    if (!video?.srcObject) return;
    void video.play().catch(() => undefined);
    setFadeIn(true);
  }, [loading]);

  // After the lip-kiss beat, fire a big LOVE burst on celebration.
  useEffect(() => {
    if (phase === "celebration" && lastPhaseRef.current !== "celebration") {
      setAutoLove(true);
      setAutoLoveId((n) => n + 1);
    }
    if (phase === "idle" || phase === "approach" || phase === "countdown" || phase === "kiss") {
      setAutoLove(false);
    }
    lastPhaseRef.current = phase;
  }, [phase]);

  // Let the LOVE word play through early final, then clear.
  useEffect(() => {
    if (phase !== "final" || !autoLove) return;
    const t = window.setTimeout(() => setAutoLove(false), 2200);
    return () => window.clearTimeout(t);
  }, [phase, autoLove]);

  const finalFrame = phase === "final" || phase === "celebration";
  const cameraLive = cameraEnabled && Boolean(remoteStream);
  const showBigLove = loveBurst || autoLove;
  // Keep couple calmly on stage while loading (background stays too).
  const characterPhase: KissCamAnimationPhase = loading ? "idle" : phase;
  const overlayCountdown = loading
    ? null
    : (remoteCountdown ?? (phase === "countdown" ? countdownValue : null));
  const countdownKey =
    remoteCountdown != null
      ? `remote-${remoteCountdown}-${remoteCountdownTick}`
      : `auto-${countdownValue}`;

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
          <GroomFigure phase={characterPhase} className="z-[3]" rigDebug={rigDebug} />
          <BrideFigure phase={characterPhase} className="z-[4]" rigDebug={rigDebug} />
        </>
      ) : null}

      <KissCamHearts active={!loading && (celebrate || showBigLove)} />
      <KissCamConfetti active={!loading && (celebrate || showBigLove)} />
      <KissCamLoveBurst active={!loading && showBigLove} burstId={autoLoveId} size="stage" word="LOVE" />

      <KissCamLoadingOverlay active={loading} size="stage" />

      {overlayCountdown != null ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div key={countdownKey} className="kiss-cam-countdown-wrap relative flex items-center justify-center">
            <span className="kiss-cam-countdown-ring" aria-hidden />
            <span className="kiss-cam-countdown font-heading text-[min(30vw,240px)] font-semibold leading-none text-[#5a2f38]/92 drop-shadow-[0_10px_36px_rgba(90,40,50,.28)]">
              {overlayCountdown}
            </span>
          </div>
        </div>
      ) : null}

      {!loading && phase === "kiss" ? (
        <>
          <div className="pointer-events-none absolute inset-0 z-10 kiss-cam-kiss-glow" aria-hidden />
          <KissCamKissEmoji />
        </>
      ) : null}

      {!loading && finalFrame ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[6%] z-30 flex flex-col items-center px-6 text-center">
          <p className="font-heading text-[clamp(1.75rem,4.5vw,3.75rem)] font-semibold tracking-wide text-[#3a2430]">
            {coupleNames}
          </p>
          <p className="mt-2 text-[clamp(0.75rem,1.6vw,1.15rem)] font-semibold uppercase tracking-[0.35em] text-[#8b3a55]/80">
            {tagline}
          </p>
        </div>
      ) : !loading && phase === "idle" && !remoteStream ? (
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
