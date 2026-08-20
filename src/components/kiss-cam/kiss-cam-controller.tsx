"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { KissCamConnection } from "@/components/kiss-cam/kiss-cam-connection";
import { KissCamDisplay } from "@/components/kiss-cam/kiss-cam-display";
import { KissCamQRCode } from "@/components/kiss-cam/kiss-cam-qr";
import { CameraStatusDot, KissCamSignalBars } from "@/components/kiss-cam/kiss-cam-quality";
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
  const connRef = useRef<KissCamConnection | null>(null);
  const rafRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const creatingSession = useRef(false);
  const startAnimationRef = useRef<(mode: "running" | "preview") => void>(() => undefined);
  const resetAnimationRef = useRef<() => void>(() => undefined);

  const tagline =
    weddingTitle && weddingTitle.trim() && weddingTitle !== coupleNames
      ? weddingTitle
      : "Forever Starts Here";

  const refreshSession = useCallback(async () => {
    if (creatingSession.current) return;
    creatingSession.current = true;
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
        cameraState: s.cameraState === "connected" ? "connected" : "waiting",
      }));
    } catch {
      setError("Unable to create a camera session. Retrying…");
    } finally {
      creatingSession.current = false;
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
  }, []);

  const resetAnimation = useCallback(() => {
    startedAtRef.current = null;
    cancelAnimationFrame(rafRef.current);
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

  useEffect(() => {
    const onFs = () => setState((s) => ({ ...s, fullscreen: Boolean(document.fullscreenElement) }));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const celebrate = state.animation === "celebration" || state.animation === "final";
  const showChrome = !state.fullscreen;

  return (
    <div id="kiss-cam-root" className="min-h-screen bg-[#2a221c] text-[var(--foreground)]">
      <div
        className={cn(
          "mx-auto flex max-w-[1600px] flex-col gap-4 p-3 sm:p-5",
          state.fullscreen && "h-screen max-w-none p-0",
        )}
      >
        {showChrome ? (
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#3a2f28]/90 px-4 py-3 text-[#f7f1e8]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#d4af37]/90">
                TableWedding
              </p>
              <h1 className="font-heading text-3xl leading-none">Kiss Cam</h1>
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
              <Link href="/reception" className="text-[#e8d5b5] underline-offset-2 hover:underline">
                ← Reception
              </Link>
            </div>
          </header>
        ) : null}

        <div className={cn("grid gap-4 lg:grid-cols-[1fr_300px]", state.fullscreen && "h-full grid-cols-1")}>
          <div
            className={cn(
              "overflow-hidden rounded-2xl border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,.45)]",
              state.fullscreen && "flex h-full items-center justify-center rounded-none border-0",
            )}
          >
            <KissCamDisplay
              phase={state.animation}
              countdownValue={state.countdownEnabled ? state.countdownValue : null}
              coupleNames={coupleNames}
              tagline={tagline}
              cameraEnabled={state.cameraEnabled}
              cameraLayout={state.cameraLayout}
              remoteStream={remoteStream}
              celebrate={celebrate}
              showCharacters
              className={state.fullscreen ? "max-h-screen w-auto max-w-full" : ""}
            />
          </div>

          {showChrome ? (
            <aside className="flex flex-col gap-3">
              <KissCamQRCode
                sessionId={state.sessionId}
                shortCode={state.shortCode}
                expiresAt={state.sessionExpiresAt}
                onExpired={() => {
                  // Keep a live camera session; only rotate pairing QR when waiting.
                  if (state.cameraState === "connected" || state.cameraState === "connecting") {
                    setState((s) => ({
                      ...s,
                      sessionExpiresAt: Date.now() + SESSION_TTL_MS,
                    }));
                    return;
                  }
                  void refreshSession();
                }}
              />

              <div className="rounded-2xl border border-white/10 bg-[#3a2f28] p-4 text-[#f7f1e8]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d4af37]/90">
                  Controls
                </p>
                <div className="mt-3 grid gap-2">
                  <Button
                    size="lg"
                    className="h-12 w-full bg-[#8b3a45] text-white hover:bg-[#732f38]"
                    onClick={() => startAnimation("running")}
                  >
                    Start Kiss Cam
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
        </div>
      </div>
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
