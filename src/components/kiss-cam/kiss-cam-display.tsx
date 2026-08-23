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
import { STAGE_SAFE_AREA_STYLE } from "@/components/kiss-cam/kiss-cam-layout";
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
      hadStream.current = true;
      setFadeIn(true);
      if (video.srcObject !== remoteStream) {
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
  const showIdleHeader = !loading && phase === "idle" && !remoteStream;

  return (
    <div
      className={
        fillViewport
          ? `kiss-cam-stage relative flex h-full w-full flex-col overflow-hidden bg-[#3a2430] ${className}`
          : `kiss-cam-stage relative flex aspect-video w-full flex-col overflow-hidden bg-[#3a2430] ${className}`
      }
      style={{
        ...(fillViewport ? {} : { aspectRatio: "16 / 9" }),
        ...STAGE_SAFE_AREA_STYLE,
      }}
    >
      {/* Full-bleed atmosphere — behind the safe-area columns */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <KissCamBackground active lite={cameraLive} />
      </div>

      <video
        ref={videoRef}
        className="pointer-events-none absolute h-px w-px opacity-0"
        muted
        playsInline
        autoPlay
        disablePictureInPicture
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0 z-[1]">
        <KissCamCanvasCompositor
          video={videoEl}
          enabled={cameraLive}
          layout={cameraLayout}
          fadeIn={fadeIn}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-[2]">
        <KissCamBalloons active={!cameraLive || celebrate} celebrate={celebrate} />
      </div>

      {/* ── HEADER SAFE AREA ── titles only; characters must not enter */}
      <div
        className="relative z-20 flex w-full shrink-0 flex-col items-center justify-end px-6 pb-1 pt-[max(0.35rem,env(safe-area-inset-top))] text-center"
        style={{ flexBasis: "var(--kiss-header-safe)", minHeight: "var(--kiss-header-safe)" }}
        data-kiss-safe="header"
      >
        {showIdleHeader ? (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#c45a78]/80">
              TableWedding
            </p>
            <h2 className="kiss-cam-love-title mt-1 text-[clamp(2.1rem,6.2vw,4.75rem)] leading-none">
              <span className="kiss-cam-love-title-accent mr-1 text-[0.72em]" aria-hidden>
                ♥
              </span>
              Kiss Cam
              <span className="kiss-cam-love-title-accent ml-1 text-[0.72em]" aria-hidden>
                ♥
              </span>
            </h2>
            <p className="font-heading mt-1.5 text-lg italic tracking-wide text-[#5a2f38]/75 sm:text-xl md:text-2xl">
              {coupleNames}
            </p>
          </>
        ) : null}
      </div>

      {/* ── CHARACTER SAFE AREA ── full-body couple; animation stays here.
          Must NOT use overflow-hidden: footAlign translateY would clip the
          figures to invisibility. Sized `inset-0` stage gives h-full a real
          height (h-full on a height-less absolute parent collapses to 0). */}
      <div
        className="relative z-[3] min-h-0 w-full flex-1"
        data-kiss-safe="characters"
      >
        <div
          className="absolute inset-0 overflow-visible"
          data-kiss-character-stage="1"
          style={{ containerType: "size" }}
        >
          {showCharacters ? (
            <>
              <GroomFigure phase={characterPhase} className="z-[3]" rigDebug={rigDebug} />
              <BrideFigure phase={characterPhase} className="z-[4]" rigDebug={rigDebug} />
            </>
          ) : null}
        </div>

        <KissCamHearts active={!loading && (celebrate || showBigLove)} />
        <KissCamConfetti active={!loading && (celebrate || showBigLove)} />
        <KissCamLoveBurst
          active={!loading && showBigLove}
          burstId={autoLoveId}
          size="stage"
          word="LOVE"
        />

        {overlayCountdown != null ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div
              key={countdownKey}
              className="kiss-cam-countdown-wrap relative flex items-center justify-center"
            >
              <span className="kiss-cam-countdown-ring" aria-hidden />
              <span className="kiss-cam-countdown font-heading text-[min(28vw,200px)] font-semibold leading-none text-[#5a2f38]/92 drop-shadow-[0_10px_36px_rgba(90,40,50,.28)]">
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

        <KissCamLoadingOverlay active={loading} size="stage" />
      </div>

      {/* ── BOTTOM SAFE AREA ── couple / event text; characters must not enter */}
      <div
        className="relative z-20 flex w-full shrink-0 flex-col items-center justify-start px-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 text-center"
        style={{ flexBasis: "var(--kiss-bottom-safe)", minHeight: "var(--kiss-bottom-safe)" }}
        data-kiss-safe="bottom"
      >
        {!loading && finalFrame ? (
          <>
            <p className="font-heading text-[clamp(1.5rem,4vw,3.25rem)] font-semibold tracking-wide text-[#3a2430]">
              {coupleNames}
            </p>
            <p className="mt-1.5 text-[clamp(0.7rem,1.5vw,1.05rem)] font-semibold uppercase tracking-[0.35em] text-[#8b3a55]/80">
              {tagline}
            </p>
          </>
        ) : showIdleHeader ? (
          <p className="text-[clamp(0.65rem,1.4vw,0.95rem)] font-semibold uppercase tracking-[0.32em] text-[#8b3a55]/70">
            {tagline}
          </p>
        ) : null}
      </div>
    </div>
  );
}
