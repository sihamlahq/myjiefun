"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { KissCamConnection } from "@/components/kiss-cam/kiss-cam-connection";
import { KissCamDisplay } from "@/components/kiss-cam/kiss-cam-display";
import { useKissCamMusic } from "@/components/kiss-cam/kiss-cam-music";
import { KissCamQRCode } from "@/components/kiss-cam/kiss-cam-qr";
import { CameraStatusDot, KissCamSignalBars } from "@/components/kiss-cam/kiss-cam-quality";
import { isKissCamRigDebugEnabled } from "@/components/kiss-cam/kiss-cam-rig-debug";
import { SESSION_TTL_MS } from "@/components/kiss-cam/kiss-cam-session";
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
  const [rigDebug, setRigDebug] = useState(false);
  const connRef = useRef<KissCamConnection | null>(null);
  const rafRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const creatingSession = useRef(false);
  const startAnimationRef = useRef<(mode: "running" | "preview") => void>(() => undefined);
  const resetAnimationRef = useRef<() => void>(() => undefined);
  const remoteCountdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const musicFileInputRef = useRef<HTMLInputElement | null>(null);

  const music = useKissCamMusic();
  const musicPlayRef = useRef(music.play);
  const musicStopRef = useRef(music.stop);
  musicPlayRef.current = music.play;
  musicStopRef.current = music.stop;

  // Character Rig Debug — development only (never in production builds).
  const rigDebugAvailable = process.env.NODE_ENV !== "production";
  useEffect(() => {
    if (!rigDebugAvailable) {
      setRigDebug(false);
      return;
    }
    setRigDebug(isKissCamRigDebugEnabled());
  }, [rigDebugAvailable]);

  useEffect(() => {
    if (!rigDebugAvailable || typeof window === "undefined") return;
    try {
      window.localStorage.setItem("kissCamRigDebug", rigDebug ? "1" : "0");
    } catch {
      // ignore
    }
  }, [rigDebug, rigDebugAvailable]);

  const tagline =
    weddingTitle && weddingTitle.trim() && weddingTitle !== coupleNames
      ? weddingTitle
      : "Forever Starts Here";

  const refreshSession = useCallback(async () => {
    if (creatingSession.current) return;
    creatingSession.current = true;
    setSessionRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/kiss-cam/session", { method: "POST" });
      const json = (await res.json()) as {
        id: string;
        shortCode: string;
        expiresAt: string;
      };
      setState((s) => ({
        ...s,
        sessionId: json.id,
        shortCode: json.shortCode,
        sessionExpiresAt: new Date(json.expiresAt).getTime() || Date.now() + SESSION_TTL_MS,
        // New QR = new pairing session; phone must scan again.
        cameraState: "waiting",
      }));
    } catch {
      setError("Unable to refresh the QR code. Please try again.");
    } finally {
      creatingSession.current = false;
      setSessionRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

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
          setRemoteStream(stream);
          setState((s) => ({
            ...s,
            cameraState: stream ? "connected" : s.cameraState === "connected" ? "disconnected" : s.cameraState,
          }));
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
          setState((s) => ({
            ...s,
            cameraState: present
              ? s.cameraState === "connected"
                ? "connected"
                : "connecting"
              : s.cameraState === "connected"
                ? "reconnecting"
                : "waiting",
          }));
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
        },
        onError: (message) => {
          if (!cancelled) {
            console.warn("[kiss-cam]", message);
            setError("Connection is unstable on this network. Trying to reconnect...");
          }
        },
      });
      connRef.current = conn;
      await conn.connect();
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
    musicStopRef.current(true);
    setState((s) => ({
      ...s,
      status: "standby",
      animation: "idle",
      startedAt: null,
      countdownValue: null,
    }));
  }, []);

  startAnimationRef.current = startAnimation;
  resetAnimationRef.current = resetAnimation;

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
          musicStopRef.current(true);
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

  // Soft-pause music under the loading overlay; resume when cleared mid-show.
  useEffect(() => {
    if (loadingScreen) {
      musicStopRef.current(true);
      return;
    }
    if (state.status === "running" || state.status === "preview") {
      void musicPlayRef.current();
    }
  }, [loadingScreen, state.status]);

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

  useEffect(() => {
    const onFs = () => setState((s) => ({ ...s, fullscreen: Boolean(document.fullscreenElement) }));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const celebrate = state.animation === "celebration" || state.animation === "final";
  const showChrome = !state.fullscreen;

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
          celebrate={celebrate}
          loveBurst={loveBurst}
          loading={loadingScreen}
          showCharacters
          fillViewport
          rigDebug={rigDebugAvailable && rigDebug}
          className="h-full w-full"
        />
      </div>

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
          <KissCamQRCode
            sessionId={state.sessionId}
            shortCode={state.shortCode}
            refreshing={sessionRefreshing}
            onRefresh={() => {
              void refreshSession();
            }}
          />

          <div className="rounded-2xl border border-white/10 bg-[#3a2f28]/92 p-4 text-[#f7f1e8] shadow-[0_16px_40px_rgba(0,0,0,.35)] backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffc9d4]/90">
              Controls
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
              {rigDebugAvailable ? (
                <ToggleRow
                  label="Character Rig Debug"
                  on={rigDebug}
                  onToggle={() => setRigDebug((v) => !v)}
                />
              ) : null}
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
                </p>
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
                  <option value="center">Center</option>
                  <option value="portrait">Portrait</option>
                  <option value="rounded">Rounded cinematic</option>
                  <option value="full">Full background</option>
                </select>
              </label>
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

      {/* Always-reachable mute while fullscreen on the LED */}
      {state.fullscreen && music.ready ? (
        <button
          type="button"
          className="absolute bottom-4 left-4 z-50 rounded-full border border-white/20 bg-[#3a2f28]/85 px-4 py-2 text-sm font-semibold text-[#f7f1e8] shadow-lg backdrop-blur-md hover:bg-[#3a2f28]"
          onClick={() => music.setMuted(!music.muted)}
          aria-pressed={music.muted}
        >
          {music.muted ? "Unmute music" : "Mute music"}
        </button>
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
