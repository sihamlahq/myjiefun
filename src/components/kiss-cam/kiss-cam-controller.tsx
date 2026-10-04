"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  KissCamConnection,
  type KissCamCameraPeer,
} from "@/components/kiss-cam/kiss-cam-connection";
import {
  KISS_CAM_COUPLE_VIDEO_SRC,
  KissCamDisplay,
} from "@/components/kiss-cam/kiss-cam-display";
import { useKissCamMusic } from "@/components/kiss-cam/kiss-cam-music";
import { KissCamPhoneSwitcher } from "@/components/kiss-cam/kiss-cam-phone-switcher";
import { KissCamQRCode } from "@/components/kiss-cam/kiss-cam-qr";
import { KissCamRemoteQR } from "@/components/kiss-cam/kiss-cam-remote-qr";
import { CameraStatusDot, KissCamSignalBars } from "@/components/kiss-cam/kiss-cam-quality";
import {
  clearStoredSession,
  readStoredSession,
  SESSION_RENEW_WITHIN_MS,
  SESSION_TTL_MS,
  writeStoredSession,
} from "@/components/kiss-cam/kiss-cam-session";
import {
  defaultKissCamState,
  phaseAtElapsed,
  totalDurationMs,
  type CameraConnectionState,
  type CameraLayoutMode,
  type ConnectionQuality,
  type KissCamState,
} from "@/components/kiss-cam/kiss-cam-types";
import { cn } from "@/lib/utils";

type SessionApiResponse = {
  id: string;
  shortCode: string;
  expiresAt: string;
  reused?: boolean;
};

/** Dedupe concurrent ensure calls (React Strict Mode remounts). */
let ensureSessionShared: Promise<SessionApiResponse> | null = null;

async function requestEnsureSession(): Promise<SessionApiResponse> {
  if (ensureSessionShared) return ensureSessionShared;

  ensureSessionShared = (async () => {
    const stored = readStoredSession();
    const now = Date.now();
    const stillFresh =
      Boolean(stored) &&
      stored!.expiresAt - now > SESSION_RENEW_WITHIN_MS &&
      Boolean(stored!.id) &&
      Boolean(stored!.shortCode);

    if (stillFresh && stored) {
      return {
        id: stored.id,
        shortCode: stored.shortCode,
        expiresAt: new Date(stored.expiresAt).toISOString(),
        reused: true,
      };
    }

    const res = await fetch("/api/kiss-cam/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        stored?.id
          ? { sessionId: stored.id, shortCode: stored.shortCode }
          : { refresh: true },
      ),
    });
    const json = (await res.json()) as SessionApiResponse;
    if (!res.ok || !json.id) {
      throw new Error("Unable to create session");
    }
    writeStoredSession({
      id: json.id,
      shortCode: json.shortCode,
      expiresAt: new Date(json.expiresAt).getTime() || Date.now() + SESSION_TTL_MS,
    });
    return json;
  })().finally(() => {
    ensureSessionShared = null;
  });

  return ensureSessionShared;
}

type KissCamControllerProps = {
  coupleNames: string;
  weddingTitle?: string;
};

export function KissCamController({ coupleNames, weddingTitle }: KissCamControllerProps) {
  const [state, setState] = useState<KissCamState>(defaultKissCamState);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [turnOk, setTurnOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loveBurst, setLoveBurst] = useState(false);
  const [loadingScreen, setLoadingScreen] = useState(false);
  const [remoteCountdown, setRemoteCountdown] = useState<1 | 2 | 3 | null>(null);
  const [remoteCountdownTick, setRemoteCountdownTick] = useState(0);
  const [sessionRefreshing, setSessionRefreshing] = useState(false);
  /** Keep QR / controls reachable even while the LED is fullscreen. */
  const [forceShowChrome, setForceShowChrome] = useState(false);
  /** In clean projector mode, corner buttons only appear while the mouse is moving. */
  const [idleChromeVisible, setIdleChromeVisible] = useState(true);
  const idleChromeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [coupleVideoSrc, setCoupleVideoSrc] = useState(KISS_CAM_COUPLE_VIDEO_SRC);
  const [coupleVideoLabel, setCoupleVideoLabel] = useState("kiss-cam.mp4 (default path)");
  const [cameraPeers, setCameraPeers] = useState<KissCamCameraPeer[]>([]);
  const [publisherId, setPublisherId] = useState<string | null>(null);
  const [switchingPhone, setSwitchingPhone] = useState(false);
  const coupleVideoObjectUrl = useRef<string | null>(null);
  const connRef = useRef<KissCamConnection | null>(null);
  const pairingCodeRef = useRef<string | null>(null);
  const rafRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const creatingSession = useRef(false);
  const startAnimationRef = useRef<(mode: "running" | "preview") => void>(() => undefined);
  const resetAnimationRef = useRef<() => void>(() => undefined);
  const toggleFullscreenRef = useRef<() => void>(() => undefined);
  const remoteCountdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const musicFileInputRef = useRef<HTMLInputElement | null>(null);
  const coupleVideoInputRef = useRef<HTMLInputElement | null>(null);

  const music = useKissCamMusic();
  const musicPlayRef = useRef(music.play);
  musicPlayRef.current = music.play;
  pairingCodeRef.current = state.shortCode;

  const tagline =
    weddingTitle && weddingTitle.trim() && weddingTitle !== coupleNames
      ? weddingTitle
      : "Forever Starts Here";

  const applySession = useCallback(
    (
      json: { id: string; shortCode: string; expiresAt: string },
      opts?: { resetPeers?: boolean },
    ) => {
      const expiresAt =
        new Date(json.expiresAt).getTime() || Date.now() + SESSION_TTL_MS;
      writeStoredSession({
        id: json.id,
        shortCode: json.shortCode,
        expiresAt,
      });
      setState((s) => ({
        ...s,
        sessionId: json.id,
        shortCode: json.shortCode,
        sessionExpiresAt: expiresAt,
        ...(opts?.resetPeers ? { cameraState: "waiting" as const } : null),
      }));
      if (opts?.resetPeers) {
        setCameraPeers([]);
        setPublisherId(null);
        setRemoteStream(null);
        setSwitchingPhone(false);
      }
    },
    [],
  );

  /** Mint a brand-new QR — only when staff taps Refresh. */
  const refreshSession = useCallback(async () => {
    if (creatingSession.current) return;
    creatingSession.current = true;
    setSessionRefreshing(true);
    setError(null);
    try {
      clearStoredSession();
      const res = await fetch("/api/kiss-cam/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: true }),
      });
      const json = (await res.json()) as {
        id: string;
        shortCode: string;
        expiresAt: string;
      };
      if (!res.ok || !json.id) {
        throw new Error("Unable to refresh the QR code");
      }
      applySession(json, { resetPeers: true });
    } catch {
      setError("Unable to refresh the QR code. Please try again.");
    } finally {
      creatingSession.current = false;
      setSessionRefreshing(false);
    }
  }, [applySession]);

  /**
   * Restore the same QR across reloads / remounts.
   * Only creates a new session when nothing usable is stored.
   */
  const ensureSession = useCallback(async () => {
    if (creatingSession.current) return;
    creatingSession.current = true;
    setSessionRefreshing(true);
    setError(null);
    try {
      const previousId = readStoredSession()?.id ?? null;
      const json = await requestEnsureSession();
      const isSameQr = Boolean(previousId && previousId === json.id);
      applySession(json, { resetPeers: !isSameQr });
    } catch {
      setError("Unable to prepare the camera QR code. Please try again.");
    } finally {
      creatingSession.current = false;
      setSessionRefreshing(false);
    }
  }, [applySession]);

  useEffect(() => {
    void ensureSession();
  }, [ensureSession]);

  // Quietly extend expiry before the pairing session dies — QR does not change.
  useEffect(() => {
    if (!state.sessionId || !state.sessionExpiresAt) return;
    const msLeft = state.sessionExpiresAt - Date.now();
    if (msLeft <= 0) {
      void ensureSession();
      return;
    }
    const wait = Math.max(30_000, msLeft - SESSION_RENEW_WITHIN_MS);
    const timer = window.setTimeout(() => {
      void ensureSession();
    }, wait);
    return () => window.clearTimeout(timer);
  }, [ensureSession, state.sessionExpiresAt, state.sessionId]);

  useEffect(() => {
    void fetch("/api/kiss-cam/ice")
      .then((r) => r.json())
      .then((j: { turnConfigured?: boolean }) => setTurnOk(Boolean(j.turnConfigured)))
      .catch(() => setTurnOk(false));
  }, []);

  // WebRTC display peer — recreate when session changes
  useEffect(() => {
    if (!state.sessionId) return;
    let cancelled = false;
    let supabase: ReturnType<typeof createClient> | null = null;

    const run = async () => {
      try {
        supabase = createClient();
      } catch {
        setError("Supabase is not configured for Kiss Cam signaling.");
        return;
      }

      await connRef.current?.dispose();
      const conn = new KissCamConnection(supabase, state.sessionId!, "display", {
        onRemoteStream: (stream) => {
          if (cancelled) return;
          // Only clear when explicitly null with no publisher; otherwise keep last
          // frame until the new phone's track arrives (instant switch).
          setRemoteStream((prev) => {
            if (stream) return stream;
            return prev;
          });
          if (stream) {
            setSwitchingPhone(false);
            setState((s) => ({ ...s, cameraState: "connected" }));
          }
        },
        onConnectionState: (pcState) => {
          if (cancelled) return;
          setState((s) => {
            let cameraState: CameraConnectionState = s.cameraState;
            if (pcState === "connected") cameraState = "connected";
            else if (pcState === "connecting") cameraState = "connecting";
            else if (pcState === "reconnecting") cameraState = "reconnecting";
            else if (pcState === "disconnected" || pcState === "failed" || pcState === "closed") {
              cameraState = "disconnected";
            }
            return { ...s, cameraState };
          });
        },
        onPeerPresence: (present) => {
          if (cancelled) return;
          // Presence is signaling-only. Do not demote a live WebRTC link to
          // "reconnecting" when Realtime heartbeats lag on the same Wi‑Fi.
          if (!present) return;
          setState((s) => ({
            ...s,
            cameraState:
              s.cameraState === "connected" || s.cameraState === "reconnecting"
                ? s.cameraState
                : "connecting",
          }));
        },
        onPublisherChange: (_self, nextPublisher) => {
          if (cancelled) return;
          setPublisherId(nextPublisher);
          if (!nextPublisher) {
            setRemoteStream(null);
            setSwitchingPhone(false);
            setState((s) => ({
              ...s,
              cameraState: s.cameraState === "waiting" ? "waiting" : "disconnected",
            }));
          } else {
            setSwitchingPhone(true);
            setState((s) => ({
              ...s,
              cameraState: s.cameraState === "connected" ? "connected" : "connecting",
            }));
          }
        },
        onRoster: (cameras, liveId) => {
          if (cancelled) return;
          setCameraPeers(cameras);
          setPublisherId(liveId);
        },
        onQuality: (quality: ConnectionQuality) => {
          if (!cancelled) setState((s) => ({ ...s, connectionQuality: quality }));
        },
        onControl: (action) => {
          if (cancelled) return;
          if (action === "start") startAnimationRef.current("running");
          if (action === "preview") startAnimationRef.current("preview");
          if (action === "reset") resetAnimationRef.current();
          if (action === "love") {
            setLoveBurst(true);
            window.setTimeout(() => setLoveBurst(false), 2800);
          }
          if (action === "loading-on") setLoadingScreen(true);
          if (action === "loading-off") {
            setLoadingScreen(false);
            // Nudge React to re-bind the live stream after camera resume.
            setRemoteStream((prev) => (prev ? new MediaStream(prev.getTracks()) : prev));
          }
          if (
            action === "countdown-1" ||
            action === "countdown-2" ||
            action === "countdown-3"
          ) {
            const value = Number(action.slice(-1)) as 1 | 2 | 3;
            if (remoteCountdownTimerRef.current) {
              clearTimeout(remoteCountdownTimerRef.current);
            }
            // Always bump tick so pressing the same digit again restarts the animation.
            setRemoteCountdown(value);
            setRemoteCountdownTick((n) => n + 1);
            remoteCountdownTimerRef.current = setTimeout(() => {
              setRemoteCountdown(null);
              remoteCountdownTimerRef.current = null;
            }, 1200);
          }
          // Mobile remote Fullscreen must drive the LED wall — never the phone browser.
          if (
            action === "fullscreen-toggle" ||
            action === "fullscreen-on" ||
            action === "fullscreen-off"
          ) {
            const root = document.getElementById("kiss-cam-root");
            const isFs = Boolean(document.fullscreenElement);
            if (action === "fullscreen-on" && !isFs) {
              void root?.requestFullscreen?.().catch(() => undefined);
              setState((s) => ({ ...s, fullscreen: true }));
            } else if (action === "fullscreen-off" && isFs) {
              void document.exitFullscreen?.().catch(() => undefined);
              setState((s) => ({ ...s, fullscreen: false }));
            } else if (action === "fullscreen-toggle") {
              toggleFullscreenRef.current();
            }
          }
        },
        onError: (message) => {
          if (!cancelled) {
            console.warn("[kiss-cam]", message);
            setError("Connection is unstable on this network. Trying to reconnect...");
          }
        },
      });
      connRef.current = conn;
      conn.setPairingInfo(pairingCodeRef.current);
      await conn.connect();
      await conn.broadcastSessionInfo();
    };

    void run();

    return () => {
      cancelled = true;
      if (remoteCountdownTimerRef.current) {
        clearTimeout(remoteCountdownTimerRef.current);
        remoteCountdownTimerRef.current = null;
      }
      void connRef.current?.dispose();
      connRef.current = null;
    };
  }, [state.sessionId]);

  // Keep remotes mirrored when the LED pairing code is restored / refreshed.
  useEffect(() => {
    if (!state.sessionId || !state.shortCode || !connRef.current?.alive) return;
    connRef.current.setPairingInfo(state.shortCode);
    void connRef.current.broadcastSessionInfo();
  }, [state.sessionId, state.shortCode]);

  const startAnimation = useCallback((mode: "running" | "preview") => {
    startedAtRef.current = performance.now();
    setState((s) => ({
      ...s,
      status: mode,
      animation: "idle",
      startedAt: Date.now(),
      countdownValue: null,
    }));
    void musicPlayRef.current();
  }, []);

  const resetAnimation = useCallback(() => {
    startedAtRef.current = null;
    cancelAnimationFrame(rafRef.current);
    // Music keeps looping in the background until Stop music is pressed.
    setState((s) => ({
      ...s,
      status: "standby",
      animation: "idle",
      startedAt: null,
      countdownValue: null,
    }));
  }, []);

  // Animation clock — decoupled from camera
  useEffect(() => {
    if (state.status === "standby" || !startedAtRef.current) return;

    const tick = () => {
      if (document.hidden) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const elapsed = (performance.now() - (startedAtRef.current || 0)) * (1 / Math.max(0.25, state.durationScale));
      const { phase, countdownValue } = phaseAtElapsed(elapsed, state.countdownEnabled);
      setState((s) =>
        s.animation === phase && s.countdownValue === countdownValue
          ? s
          : { ...s, animation: phase, countdownValue },
      );

      const total = totalDurationMs(state.countdownEnabled, state.durationScale);
      if (elapsed >= total) {
        if (state.autoReturn) {
          startedAtRef.current = null;
          // Leave background music running after the show ends.
          setState((s) => ({
            ...s,
            status: "standby",
            animation: "idle",
            startedAt: null,
            countdownValue: null,
          }));
          return;
        }
        setState((s) => ({ ...s, animation: "final", countdownValue: null }));
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [state.status, state.countdownEnabled, state.autoReturn, state.durationScale]);

  const toggleFullscreen = useCallback(async () => {
    const root = document.getElementById("kiss-cam-root");
    if (!document.fullscreenElement) {
      await root?.requestFullscreen?.().catch(() => undefined);
      setState((s) => ({ ...s, fullscreen: true }));
    } else {
      await document.exitFullscreen?.().catch(() => undefined);
      setState((s) => ({ ...s, fullscreen: false }));
    }
  }, []);

  startAnimationRef.current = startAnimation;
  resetAnimationRef.current = resetAnimation;
  toggleFullscreenRef.current = () => {
    void toggleFullscreen();
  };

  useEffect(() => {
    const onFs = () => setState((s) => ({ ...s, fullscreen: Boolean(document.fullscreenElement) }));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const celebrate = state.animation === "celebration" || state.animation === "final";
  const showChrome = !state.fullscreen || forceShowChrome;
  /** Fullscreen LED with panel hidden — projector-clean; use phone for Love / countdown. */
  const cleanProjector = state.fullscreen && !forceShowChrome;

  useEffect(() => {
    if (!state.fullscreen) setForceShowChrome(false);
  }, [state.fullscreen]);

  // Clean projector: hide corner buttons after idle so the LCD stays empty.
  useEffect(() => {
    if (!cleanProjector) {
      setIdleChromeVisible(true);
      if (idleChromeTimerRef.current) {
        clearTimeout(idleChromeTimerRef.current);
        idleChromeTimerRef.current = null;
      }
      return;
    }

    const bump = () => {
      setIdleChromeVisible(true);
      if (idleChromeTimerRef.current) clearTimeout(idleChromeTimerRef.current);
      idleChromeTimerRef.current = setTimeout(() => setIdleChromeVisible(false), 2800);
    };

    bump();
    window.addEventListener("pointermove", bump, { passive: true });
    window.addEventListener("pointerdown", bump, { passive: true });
    window.addEventListener("keydown", bump);
    return () => {
      window.removeEventListener("pointermove", bump);
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
      if (idleChromeTimerRef.current) {
        clearTimeout(idleChromeTimerRef.current);
        idleChromeTimerRef.current = null;
      }
    };
  }, [cleanProjector]);

  // H toggles the side panel while fullscreen (handy on the laptop without leaving FS).
  useEffect(() => {
    if (!state.fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "h" && e.key !== "H") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      setForceShowChrome((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.fullscreen]);

  useEffect(() => {
    return () => {
      if (coupleVideoObjectUrl.current) {
        URL.revokeObjectURL(coupleVideoObjectUrl.current);
        coupleVideoObjectUrl.current = null;
      }
    };
  }, []);

  const toggleLoadingScreen = useCallback((next?: boolean) => {
    setLoadingScreen((prev) => {
      const value = typeof next === "boolean" ? next : !prev;
      void connRef.current
        ?.sendControl(value ? "loading-on" : "loading-off")
        .catch(() => undefined);
      return value;
    });
  }, []);

  return (
    <div
      id="kiss-cam-root"
      className={cn(
        // Always fill the laptop / LED viewport — no 16:9 letterbox or side gutters.
        "fixed inset-0 z-50 h-dvh min-h-dvh w-screen max-w-[100vw] overflow-hidden bg-[#3a2430] text-[var(--foreground)]",
        state.fullscreen && "z-[100]",
      )}
    >
      {/* Stage is always edge-to-edge (no 16:9 letterbox card). */}
      <div className="absolute inset-0">
        <KissCamDisplay
          phase={state.animation}
          countdownValue={state.countdownEnabled ? state.countdownValue : null}
          remoteCountdown={remoteCountdown}
          remoteCountdownTick={remoteCountdownTick}
          coupleNames={coupleNames}
          tagline={tagline}
          cameraEnabled={state.cameraEnabled}
          cameraLayout={state.cameraLayout}
          remoteStream={remoteStream}
          fallbackVideoSrc={coupleVideoSrc}
          celebrate={celebrate}
          loveBurst={loveBurst}
          loading={loadingScreen}
          fillViewport
          className="h-full w-full"
        />
      </div>

      {cleanProjector ? (
        <div
          className={cn(
            "absolute bottom-3 right-3 z-50 flex flex-col gap-2 transition-opacity duration-300 sm:bottom-4 sm:right-4",
            idleChromeVisible ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <Button
            type="button"
            className="h-11 bg-[#c45a78] text-white shadow-[0_12px_28px_rgba(0,0,0,.35)] hover:bg-[#a84864]"
            onClick={() => setForceShowChrome(true)}
          >
            Show QR & controls
          </Button>
          <p className="max-w-[11rem] text-right text-[10px] leading-snug text-[#f7f1e8]/70">
            Press <kbd className="rounded bg-black/40 px-1">H</kbd> · or use the phone for Love /
            countdown (keeps projector clean)
          </p>
        </div>
      ) : null}

      {showChrome ? (
        <header className="absolute inset-x-0 top-0 z-40 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-b from-[#2a1a22]/88 to-transparent px-4 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))] text-[#f7f1e8]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#ffc9d4]/90">
              TableWedding
            </p>
            <h1 className="kiss-cam-love-title text-[2.4rem] leading-none">Kiss Cam</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <CameraStatusDot state={state.cameraState} />
            <KissCamSignalBars quality={state.connectionQuality} className="text-[#f7f1e8]/80" />
            <span>
              Animation:{" "}
              <strong className="font-semibold">
                {state.status === "standby" ? "Ready" : state.animation}
              </strong>
            </span>
            <Link href="/reception" className="text-[#ffd6e0] underline-offset-2 hover:underline">
              ← Reception
            </Link>
          </div>
        </header>
      ) : null}

      {showChrome ? (
        <aside className="absolute bottom-3 right-3 z-40 flex max-h-[min(72dvh,640px)] w-[min(100%-1.5rem,300px)] flex-col gap-3 overflow-y-auto sm:bottom-4 sm:right-4">
          {state.fullscreen && forceShowChrome ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 border-white/20 bg-[#3a2f28]/92 text-[#f7f1e8]"
              onClick={() => setForceShowChrome(false)}
            >
              Hide panel (keep fullscreen)
            </Button>
          ) : null}

          <KissCamQRCode
            sessionId={state.sessionId}
            shortCode={state.shortCode}
            refreshing={sessionRefreshing}
            onRefresh={() => {
              void refreshSession();
            }}
          />

          <KissCamRemoteQR sessionId={state.sessionId} shortCode={state.shortCode} />

          <KissCamPhoneSwitcher
            cameras={cameraPeers}
            publisherId={publisherId}
            switching={switchingPhone}
            onSelect={(clientId) => {
              setSwitchingPhone(true);
              void connRef.current?.promoteCamera(clientId).catch(() => {
                setSwitchingPhone(false);
              });
            }}
          />

          <div className="rounded-2xl border border-white/10 bg-[#3a2f28]/92 p-4 text-[#f7f1e8] shadow-[0_16px_40px_rgba(0,0,0,.35)] backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffc9d4]/90">
              Controls
            </p>
            <p className="mt-2 text-[11px] leading-snug text-[#f7f1e8]/60">
              Scan the camera QR on phones for the live heart. Scan{" "}
              <strong className="font-semibold text-[#ffd6e0]">LED remote</strong> on a second phone
              for the same controls as this laptop panel.
            </p>
            <p className="mt-2 rounded-lg border border-[#ffc9d4]/25 bg-black/25 px-2.5 py-2 text-[11px] leading-snug text-[#ffd6e0]/90">
              <strong className="font-semibold text-[#fff5f7]">Clean projector:</strong> Fullscreen →
              Hide panel. Run Love / 1·2·3 / Loading / Go Live from the phone so settings never stay
              on the LCD. Press <kbd className="rounded bg-white/10 px-1">H</kbd> to peek the panel.
            </p>
            <div className="mt-3 grid gap-2">
              <Button
                size="lg"
                className="h-12 w-full bg-[#c45a78] text-white hover:bg-[#a84864]"
                onClick={() => startAnimation("running")}
              >
                Start Kiss Cam
              </Button>
              <Button
                size="lg"
                className={`h-12 w-full touch-manipulation ${
                  loadingScreen
                    ? "bg-[#ff8fab] text-white hover:bg-[#ff7a9a]"
                    : "border border-white/20 bg-white/10 text-[#f7f1e8] hover:bg-white/15"
                }`}
                onClick={() => toggleLoadingScreen()}
                aria-pressed={loadingScreen}
              >
                {loadingScreen ? "Clear Loading Screen" : "Loading Screen"}
              </Button>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="secondary" onClick={() => startAnimation("preview")}>
                  Preview
                </Button>
                <Button variant="outline" className="border-white/20 text-[#f7f1e8]" onClick={resetAnimation}>
                  Reset
                </Button>
                <Button variant="gold" onClick={() => void toggleFullscreen()}>
                  Fullscreen
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <ToggleRow
                label="Countdown"
                on={state.countdownEnabled}
                onToggle={() => setState((s) => ({ ...s, countdownEnabled: !s.countdownEnabled }))}
              />
              <ToggleRow
                label="Camera"
                on={state.cameraEnabled}
                onToggle={() => setState((s) => ({ ...s, cameraEnabled: !s.cameraEnabled }))}
              />
              <ToggleRow
                label="Auto Return"
                on={state.autoReturn}
                onToggle={() => setState((s) => ({ ...s, autoReturn: !s.autoReturn }))}
              />
              <ToggleRow
                label="Music"
                on={music.enabled}
                onToggle={() => music.setEnabled(!music.enabled)}
              />
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ffc9d4]/85">
                  LED music
                </p>
                <p className="mt-1 truncate text-xs text-[#f7f1e8]/75" title={music.trackLabel ?? undefined}>
                  {music.trackLabel
                    ? music.usingDefault
                      ? `Theme: ${music.trackLabel}`
                      : music.trackLabel
                    : "No track — choose a wedding song"}
                  {music.playing ? " · playing" : ""}
                </p>
                <p className="mt-1 text-[11px] text-[#f7f1e8]/55">
                  Keeps playing after the animation ends — press Stop music to end it.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    className="h-9 bg-[#c45a78] text-white hover:bg-[#a84864]"
                    disabled={!music.ready || !music.enabled || music.muted}
                    onClick={() => void music.play()}
                  >
                    Play music
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 border-white/20 text-[#f7f1e8]"
                    disabled={!music.playing && !music.ready}
                    onClick={() => music.stop(true)}
                  >
                    Stop music
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9"
                    onClick={() => musicFileInputRef.current?.click()}
                  >
                    Choose music
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 border-white/20 text-[#f7f1e8]"
                    disabled={!music.ready}
                    onClick={() => music.clearTrack()}
                  >
                    Clear
                  </Button>
                </div>
                <input
                  ref={musicFileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    void music.chooseFile(file);
                    e.target.value = "";
                  }}
                />
                <label className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span>Volume</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={music.volume}
                    disabled={music.muted || !music.enabled}
                    onChange={(e) => music.setVolume(Number(e.target.value))}
                    className="w-[58%] accent-[#c45a78]"
                    aria-label="Music volume"
                  />
                </label>
                <button
                  type="button"
                  className="mt-1.5 text-xs font-semibold text-[#ffd6e0] underline-offset-2 hover:underline"
                  onClick={() => music.setMuted(!music.muted)}
                >
                  {music.muted ? "Unmute speakers" : "Mute speakers"}
                </button>
                {music.error ? <p className="mt-1.5 text-xs text-amber-200/90">{music.error}</p> : null}
              </div>
              <label className="flex items-center justify-between gap-2">
                <span>Duration</span>
                <select
                  className="rounded-lg border border-white/15 bg-[#2a221c] px-2 py-1 text-sm"
                  value={String(state.durationScale)}
                  onChange={(e) =>
                    setState((s) => ({ ...s, durationScale: Number(e.target.value) || 1 }))
                  }
                >
                  <option value="0.75">Faster</option>
                  <option value="1">Standard</option>
                  <option value="1.25">Slower</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-2">
                <span>Camera frame</span>
                <select
                  className="rounded-lg border border-white/15 bg-[#2a221c] px-2 py-1 text-sm"
                  value={state.cameraLayout}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      cameraLayout: e.target.value as CameraLayoutMode,
                    }))
                  }
                >
                  <option value="love">Heart (live camera)</option>
                  <option value="center">Center</option>
                  <option value="portrait">Portrait</option>
                  <option value="rounded">Rounded cinematic</option>
                  <option value="full">Full background</option>
                </select>
              </label>

              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ffc9d4]/85">
                  Couple video (full-screen standby)
                </p>
                <p className="mt-1 truncate text-xs text-[#f7f1e8]/75" title={coupleVideoLabel}>
                  {coupleVideoLabel}
                </p>
                <p className="mt-1 text-[11px] text-[#f7f1e8]/55">
                  Plays full-bleed in front until a phone goes live, then the live feed shows through
                  the love-frame heart. Default:{" "}
                  <code className="text-[10px]">/assets/kiss-cam/kiss-cam.mp4</code>
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9"
                    onClick={() => coupleVideoInputRef.current?.click()}
                  >
                    Choose video
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 border-white/20 text-[#f7f1e8]"
                    onClick={() => {
                      if (coupleVideoObjectUrl.current) {
                        URL.revokeObjectURL(coupleVideoObjectUrl.current);
                        coupleVideoObjectUrl.current = null;
                      }
                      setCoupleVideoSrc(KISS_CAM_COUPLE_VIDEO_SRC);
                      setCoupleVideoLabel("kiss-cam.mp4 (default path)");
                    }}
                  >
                    Use default
                  </Button>
                </div>
                <input
                  ref={coupleVideoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    if (coupleVideoObjectUrl.current) {
                      URL.revokeObjectURL(coupleVideoObjectUrl.current);
                    }
                    const url = URL.createObjectURL(file);
                    coupleVideoObjectUrl.current = url;
                    setCoupleVideoSrc(url);
                    setCoupleVideoLabel(file.name);
                  }}
                />
              </div>
            </div>

            {turnOk === false ? (
              <p className="mt-3 text-xs text-amber-200/90">
                TURN not configured — venue Wi‑Fi may need{" "}
                <code className="text-[10px]">TURN_URLS</code> env vars for reliable relay.
              </p>
            ) : null}
            {error ? <p className="mt-2 text-xs text-rose-200">{error}</p> : null}
          </div>
        </aside>
      ) : null}

      {/* Music: only while idle chrome is visible in clean projector mode */}
      {state.fullscreen && music.ready ? (
        <div
          className={cn(
            "absolute bottom-4 left-4 z-50 flex gap-2 transition-opacity duration-300",
            cleanProjector && !idleChromeVisible && "pointer-events-none opacity-0",
          )}
        >
          {music.playing ? (
            <button
              type="button"
              className="rounded-full border border-white/20 bg-[#3a2f28]/85 px-4 py-2 text-sm font-semibold text-[#f7f1e8] shadow-lg backdrop-blur-md hover:bg-[#3a2f28]"
              onClick={() => music.stop(true)}
            >
              Stop music
            </button>
          ) : (
            <button
              type="button"
              className="rounded-full border border-white/20 bg-[#3a2f28]/85 px-4 py-2 text-sm font-semibold text-[#f7f1e8] shadow-lg backdrop-blur-md hover:bg-[#3a2f28]"
              onClick={() => void music.play()}
              disabled={!music.enabled || music.muted}
            >
              Play music
            </button>
          )}
          <button
            type="button"
            className="rounded-full border border-white/20 bg-[#3a2f28]/85 px-4 py-2 text-sm font-semibold text-[#f7f1e8] shadow-lg backdrop-blur-md hover:bg-[#3a2f28]"
            onClick={() => music.setMuted(!music.muted)}
            aria-pressed={music.muted}
          >
            {music.muted ? "Unmute" : "Mute"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ToggleRow({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-left hover:bg-white/5"
    >
      <span>{label}</span>
      <span className={cn("font-semibold", on ? "text-emerald-300" : "text-stone-400")}>
        {on ? "ON" : "OFF"}
      </span>
    </button>
  );
}
