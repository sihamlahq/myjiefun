"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

/** Couple standby video — full stage (not heart-clipped). */
export const KISS_CAM_COUPLE_VIDEO_SRC = "/assets/kiss-cam/kiss-cam.mp4";

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
  /** Full-screen couple video when no phone is live. */
  fallbackVideoSrc?: string;
  celebrate: boolean;
  loveBurst?: boolean;
  /** Soft loading overlay — keeps background visible. */
  loading?: boolean;
  /** Fill the parent completely (true fullscreen) — no 16:9 letterboxing. */
  fillViewport?: boolean;
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
  fallbackVideoSrc = KISS_CAM_COUPLE_VIDEO_SRC,
  celebrate,
  loveBurst = false,
  loading = false,
  fillViewport = false,
  className = "",
}: KissCamDisplayProps) {
  const streamVideoRef = useRef<HTMLVideoElement>(null);
  const coupleVideoRef = useRef<HTMLVideoElement>(null);
  const [streamVideoEl, setStreamVideoEl] = useState<HTMLVideoElement | null>(null);
  const [fadeIn, setFadeIn] = useState(true);
  const [autoLove, setAutoLove] = useState(false);
  const [autoLoveId, setAutoLoveId] = useState(0);
  const [coupleReady, setCoupleReady] = useState(false);
  const [couplePlaying, setCouplePlaying] = useState(false);
  const lastPhaseRef = useRef(phase);

  const livePhone = Boolean(remoteStream);
  const showCoupleVideo = !livePhone && cameraEnabled && Boolean(fallbackVideoSrc);
  const cameraLive = cameraEnabled && livePhone;

  // Live phone → hidden video + heart compositor.
  useEffect(() => {
    const video = streamVideoRef.current;
    if (!video) return;
    setStreamVideoEl(video);

    if (!remoteStream) {
      video.srcObject = null;
      return;
    }

    setFadeIn(true);
    if (video.srcObject !== remoteStream) {
      video.srcObject = remoteStream;
    }
    void video.play().catch(() => undefined);
    const track = remoteStream.getVideoTracks()[0];
    if (!track) return;
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
  }, [remoteStream]);

  // Couple mp4 → full-bleed visible video (paused until Play).
  useEffect(() => {
    const video = coupleVideoRef.current;
    if (!video || !showCoupleVideo || !fallbackVideoSrc) {
      setCoupleReady(false);
      setCouplePlaying(false);
      return;
    }

    let cancelled = false;
    const onReady = () => {
      if (!cancelled) setCoupleReady(true);
    };
    const onError = () => {
      if (!cancelled) {
        setCoupleReady(false);
        setCouplePlaying(false);
      }
    };
    const onPlay = () => {
      if (!cancelled) setCouplePlaying(true);
    };
    const onPause = () => {
      if (!cancelled) setCouplePlaying(false);
    };

    video.loop = true;
    video.playsInline = true;
    video.muted = true;
    if (video.getAttribute("src") !== fallbackVideoSrc) {
      video.src = fallbackVideoSrc;
    }
    video.addEventListener("canplay", onReady);
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("error", onError);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.pause();
    setCouplePlaying(false);

    return () => {
      cancelled = true;
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [showCoupleVideo, fallbackVideoSrc]);

  useEffect(() => {
    if (loading || !livePhone) return;
    const video = streamVideoRef.current;
    if (!video?.srcObject) return;
    void video.play().catch(() => undefined);
    setFadeIn(true);
  }, [loading, livePhone]);

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

  useEffect(() => {
    if (phase !== "final" || !autoLove) return;
    const t = window.setTimeout(() => setAutoLove(false), 2200);
    return () => window.clearTimeout(t);
  }, [phase, autoLove]);

  const playCoupleVideo = useCallback(() => {
    const video = coupleVideoRef.current;
    if (!video) return;
    // Start unmuted when the guest taps Play (browser allows after gesture).
    video.muted = false;
    void video.play().then(() => setCouplePlaying(true)).catch(() => {
      video.muted = true;
      void video.play().then(() => setCouplePlaying(true)).catch(() => undefined);
    });
  }, []);

  const finalFrame = phase === "final" || phase === "celebration";
  const showBigLove = loveBurst || autoLove;
  const overlayCountdown = loading
    ? null
    : (remoteCountdown ?? (phase === "countdown" ? countdownValue : null));
  const countdownKey =
    remoteCountdown != null
      ? `remote-${remoteCountdown}-${remoteCountdownTick}`
      : `auto-${countdownValue}`;
  const showIdleHeader =
    !loading && phase === "idle" && !livePhone && !(showCoupleVideo && couplePlaying);
  const stageFilled = cameraLive || (showCoupleVideo && couplePlaying);

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
      <div className="pointer-events-none absolute inset-0 z-0">
        <KissCamBackground active lite={stageFilled} showHeartMotifs={!stageFilled} />
      </div>

      {/* Full-bleed couple video — not clipped to the heart */}
      {showCoupleVideo ? (
        <video
          ref={coupleVideoRef}
          className="absolute inset-0 z-[1] h-full w-full object-cover"
          playsInline
          loop
          preload="auto"
          disablePictureInPicture
          aria-label="Kiss Cam couple video"
        />
      ) : null}

      {/* Hidden stream source for live phone + heart compositor */}
      <video
        ref={streamVideoRef}
        className="pointer-events-none absolute h-px w-px opacity-0"
        muted
        playsInline
        autoPlay
        disablePictureInPicture
        aria-hidden
      />

      <div
        className={
          cameraLayout === "love"
            ? "pointer-events-none absolute inset-0 z-[5]"
            : "pointer-events-none absolute inset-0 z-[1]"
        }
      >
        <KissCamCanvasCompositor
          video={streamVideoEl}
          enabled={cameraLive}
          layout={cameraLayout}
          fadeIn={fadeIn}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-[2]">
        <KissCamBalloons active={!stageFilled || celebrate} celebrate={celebrate} />
      </div>

      {showCoupleVideo && coupleReady && !couplePlaying && !loading ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#2a1a22]/35 backdrop-blur-[1px]">
          <button
            type="button"
            onClick={playCoupleVideo}
            className="group flex flex-col items-center gap-3 rounded-full px-4 py-3 text-[#fff5f7] outline-none transition focus-visible:ring-2 focus-visible:ring-[#ffc9d4]"
            aria-label="Play couple video"
          >
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-[#c45a78] shadow-[0_18px_48px_rgba(0,0,0,.4)] transition group-hover:scale-105 group-hover:bg-[#a84864] sm:h-28 sm:w-28">
              <svg viewBox="0 0 24 24" className="ml-1 h-12 w-12 fill-current sm:h-14 sm:w-14" aria-hidden>
                <path d="M8 5.14v13.72L19 12 8 5.14z" />
              </svg>
            </span>
            <span className="font-heading text-2xl tracking-wide drop-shadow-[0_4px_16px_rgba(0,0,0,.45)] sm:text-3xl">
              Play
            </span>
          </button>
        </div>
      ) : null}

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

      <div
        className="relative z-[3] min-h-0 w-full flex-1"
        data-kiss-safe="stage"
        style={{ position: "relative", width: "100%", minHeight: 0 }}
      >
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
