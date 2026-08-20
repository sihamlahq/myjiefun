"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { KissCamConnection } from "@/components/kiss-cam/kiss-cam-connection";
import { KissCamLoveBurst } from "@/components/kiss-cam/kiss-cam-love-burst";
import { KissCamSignalBars } from "@/components/kiss-cam/kiss-cam-quality";
import type { ConnectionQuality } from "@/components/kiss-cam/kiss-cam-types";

type UiStatus =
  | "waiting"
  | "connecting"
  | "connected"
  | "lost"
  | "reconnecting"
  | "error";

type Facing = "environment" | "user";

function labelMatchesFacing(label: string, facing: Facing) {
  const l = label.toLowerCase();
  if (facing === "user") {
    return /front|user|face|selfie/.test(l);
  }
  return /back|rear|environment|world|main/.test(l);
}

/** Prefer the phone's native / max camera resolution when the device allows it. */
async function openCamera(facing: Facing): Promise<MediaStream> {
  let preferredDeviceId: string | undefined;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === "videoinput");
    const match = cams.find((d) => d.label && labelMatchesFacing(d.label, facing));
    // If labels are blank (pre-permission), fall through to facingMode.
    preferredDeviceId = match?.deviceId;
  } catch {
    // ignore
  }

  const attempts: MediaStreamConstraints[] = [];

  if (preferredDeviceId) {
    attempts.push({
      audio: false,
      video: {
        deviceId: { exact: preferredDeviceId },
        width: { ideal: 4096 },
        height: { ideal: 2160 },
        frameRate: { ideal: 30 },
      },
    });
  }

  attempts.push(
    {
      audio: false,
      video: {
        facingMode: { exact: facing },
        width: { ideal: 4096 },
        height: { ideal: 2160 },
        frameRate: { ideal: 30 },
      },
    },
    {
      audio: false,
      video: {
        facingMode: { ideal: facing },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
    },
    {
      audio: false,
      video: { facingMode: { ideal: facing } },
    },
    { audio: false, video: true },
  );

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      await boostToNativeResolution(stream);
      return stream;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function boostToNativeResolution(stream: MediaStream) {
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (track as any).contentHint = "detail";
  } catch {
    // ignore
  }

  const caps = typeof track.getCapabilities === "function" ? track.getCapabilities() : null;
  if (!caps) return;

  const widthMax = caps.width && "max" in caps.width ? caps.width.max : undefined;
  const heightMax = caps.height && "max" in caps.height ? caps.height.max : undefined;
  const fpsMax = caps.frameRate && "max" in caps.frameRate ? caps.frameRate.max : undefined;

  if (!widthMax && !heightMax) return;

  try {
    await track.applyConstraints({
      ...(widthMax ? { width: { ideal: widthMax } } : {}),
      ...(heightMax ? { height: { ideal: heightMax } } : {}),
      ...(fpsMax ? { frameRate: { ideal: Math.min(30, fpsMax) } } : { frameRate: { ideal: 30 } }),
    });
  } catch {
    // Keep whatever resolution the device already gave us.
  }
}

export function KissCamCameraClient() {
  const params = useSearchParams();
  const sessionParam = params.get("session");
  const codeParam = (params.get("code") || "").trim().toUpperCase();

  const [sessionId, setSessionId] = useState<string | null>(sessionParam);
  const [status, setStatus] = useState<UiStatus>("waiting");
  const [message, setMessage] = useState<string | null>(null);
  const [quality, setQuality] = useState<ConnectionQuality | null>(null);
  const [facingMode, setFacingMode] = useState<Facing>("environment");
  const [codeInput, setCodeInput] = useState(codeParam);
  const [cameraOn, setCameraOn] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [loveBurst, setLoveBurst] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const connRef = useRef<KissCamConnection | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const facingRef = useRef<Facing>("environment");
  const switchingRef = useRef(false);

  const isSecure =
    typeof window === "undefined" ||
    window.isSecureContext ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

  useEffect(() => {
    if (sessionParam) {
      setSessionId(sessionParam);
      return;
    }
    if (!codeParam) return;
    let cancelled = false;
    void fetch(`/api/kiss-cam/session/lookup?code=${encodeURIComponent(codeParam)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("expired");
        const json = (await res.json()) as { id: string };
        if (!cancelled) setSessionId(json.id);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          setMessage("This camera session has expired. Please scan a new QR code.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sessionParam, codeParam]);

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release();
    } catch {
      // ignore
    }
    wakeLockRef.current = null;
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      if (!("wakeLock" in navigator)) return;
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      wakeLockRef.current.addEventListener("release", () => {
        wakeLockRef.current = null;
      });
    } catch (error) {
      console.warn("[kiss-cam] wake lock unavailable", error);
    }
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && streamRef.current) {
        void requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [requestWakeLock]);

  const bindPreview = useCallback(async (stream: MediaStream) => {
    streamRef.current = stream;
    setCameraOn(true);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      // iOS often needs a fresh play() after srcObject swap.
      videoRef.current.load?.();
      await videoRef.current.play().catch(() => undefined);
    }
  }, []);

  const stopTracksOnly = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        // ignore
      }
    });
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const stopCamera = useCallback(async () => {
    await connRef.current?.dispose();
    connRef.current = null;
    stopTracksOnly();
    await releaseWakeLock();
    setStatus("waiting");
    setQuality(null);
    setMessage(null);
  }, [releaseWakeLock, stopTracksOnly]);

  const startCamera = useCallback(async () => {
    setMessage(null);

    if (!isSecure) {
      setStatus("error");
      setMessage("Camera requires HTTPS. Open this page on a secure (https) link.");
      return;
    }

    if (!sessionId) {
      setStatus("error");
      setMessage("This camera session has expired. Please scan a new QR code.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setMessage("Camera unavailable. Please check your phone camera.");
      return;
    }

    setStatus("connecting");

    try {
      await stopCamera();
      const stream = await openCamera(facingRef.current);
      await bindPreview(stream);
      await requestWakeLock();

      const supabase = createClient();
      const conn = new KissCamConnection(supabase, sessionId, "camera", {
        onConnectionState: (pcState) => {
          if (pcState === "connected") {
            setStatus("connected");
            setMessage(null);
          } else if (pcState === "reconnecting") {
            setStatus("reconnecting");
            setMessage("Connection is unstable on this network. Trying to reconnect...");
          } else if (pcState === "failed" || pcState === "disconnected") {
            setStatus("lost");
          }
        },
        onPeerPresence: (present) => {
          if (!present) setStatus((s) => (s === "connected" ? "reconnecting" : s));
        },
        onQuality: setQuality,
        onError: () => {
          setMessage("Unable to connect to the wedding screen. Please scan the QR code again.");
          setStatus("reconnecting");
        },
      });
      connRef.current = conn;
      await conn.connect();
      await conn.attachLocalStream(stream);
      setStatus("connected");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMessage("Camera access is required to use the mobile camera.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setMessage("Camera unavailable. Please check your phone camera.");
      } else {
        setMessage("Camera unavailable. Please check your phone camera.");
      }
      setStatus("error");
      stopTracksOnly();
    }
  }, [bindPreview, isSecure, requestWakeLock, sessionId, stopCamera, stopTracksOnly]);

  const switchCamera = useCallback(async () => {
    if (switchingRef.current || !cameraOn) return;
    switchingRef.current = true;
    setSwitching(true);
    setMessage(null);

    const previous = facingRef.current;
    const next: Facing = previous === "environment" ? "user" : "environment";

    // Most phones cannot open a second camera while the first track is live.
    // Stop first, then open the other lens — this is the main switch fix.
    stopTracksOnly();

    try {
      const stream = await openCamera(next);
      facingRef.current = next;
      setFacingMode(next);
      await bindPreview(stream);
      await connRef.current?.replaceVideoTrack(stream.getVideoTracks()[0] ?? null);
      await requestWakeLock();
    } catch {
      // Restore previous camera if the flip failed.
      try {
        const stream = await openCamera(previous);
        facingRef.current = previous;
        setFacingMode(previous);
        await bindPreview(stream);
        await connRef.current?.replaceVideoTrack(stream.getVideoTracks()[0] ?? null);
        setMessage("Could not switch camera on this phone. Still using the previous camera.");
      } catch {
        setMessage("Camera unavailable. Please check your phone camera.");
        setStatus("error");
        setCameraOn(false);
      }
    } finally {
      switchingRef.current = false;
      setSwitching(false);
    }
  }, [bindPreview, cameraOn, requestWakeLock, stopTracksOnly]);

  const triggerLove = useCallback(() => {
    if (loveBurst) return;
    setLoveBurst(true);
    void connRef.current?.sendControl("love");
    window.setTimeout(() => setLoveBurst(false), 2600);
  }, [loveBurst]);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  const resolveCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setStatus("connecting");
    try {
      const res = await fetch(`/api/kiss-cam/session/lookup?code=${encodeURIComponent(code)}`);
      if (!res.ok) throw new Error("expired");
      const json = (await res.json()) as { id: string };
      setSessionId(json.id);
      setStatus("waiting");
      setMessage(null);
    } catch {
      setStatus("error");
      setMessage("This camera session has expired. Please scan a new QR code.");
    }
  };

  const statusText =
    status === "waiting"
      ? "Waiting for display..."
      : status === "connecting"
        ? "Connecting..."
        : status === "connected"
          ? `Camera connected ✓ · ${facingMode === "environment" ? "Rear" : "Front"}`
          : status === "lost"
            ? "Connection lost"
            : status === "reconnecting"
              ? "Reconnecting..."
              : "Something went wrong";

  return (
    <main className="kiss-cam-phone-shell mx-auto flex min-h-[100dvh] max-w-md flex-col px-4 py-6 text-[#fff5f7]">
      {/* Hidden clip definition for the wide double-heart preview */}
      <svg width={0} height={0} className="absolute" aria-hidden>
        <defs>
          <clipPath id="kiss-cam-double-love-clip" clipPathUnits="objectBoundingBox">
            {/* Left heart */}
            <path d="M0.34,0.96 C0.34,0.96 -0.02,0.62 -0.02,0.34 C-0.02,0.16 0.10,0.06 0.24,0.10 C0.31,0.12 0.36,0.22 0.38,0.34 C0.40,0.22 0.47,0.10 0.56,0.10 C0.70,0.06 0.80,0.18 0.78,0.34 C0.76,0.58 0.50,0.88 0.34,0.96 Z" />
            {/* Right heart — overlaps for a wide double-love silhouette */}
            <path d="M0.66,0.96 C0.66,0.96 0.30,0.62 0.30,0.34 C0.28,0.18 0.38,0.06 0.52,0.10 C0.59,0.12 0.64,0.22 0.66,0.34 C0.68,0.22 0.75,0.10 0.84,0.10 C0.98,0.06 1.08,0.18 1.06,0.34 C1.04,0.58 0.82,0.88 0.66,0.96 Z" />
          </clipPath>
        </defs>
      </svg>

      <header className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.38em] text-[#ffc9d4]/80">
          TableWedding
        </p>
        <h1 className="kiss-cam-love-title mt-1 text-[clamp(3.25rem,14vw,4.5rem)]">
          <span className="kiss-cam-love-title-accent mr-1 text-[0.72em]" aria-hidden>
            ♥
          </span>
          Kiss Cam
          <span className="kiss-cam-love-title-accent ml-1 text-[0.72em]" aria-hidden>
            ♥
          </span>
        </h1>
        <p className="font-heading mt-1 text-sm italic tracking-wide text-[#ffd6e0]/75">
          Share a moment of love
        </p>
        <p className="mt-3 text-sm text-[#fff5f7]/70">{statusText}</p>
        <div className="mt-2 flex justify-center">
          <KissCamSignalBars quality={quality} />
        </div>
      </header>

      <div className="relative kiss-cam-double-love mx-auto mt-5 w-full">
        <div className="kiss-cam-double-love-media">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
            autoPlay
          />
          {!cameraOn && status === "waiting" ? (
            <div className="absolute inset-0 flex items-center justify-center px-10 text-center text-sm leading-relaxed text-white/75">
              Press Start Camera to share video with the wedding screen.
            </div>
          ) : null}
          {switching ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#3a2430]/55 text-sm font-semibold">
              Switching camera…
            </div>
          ) : null}
        </div>
        <svg
          className="kiss-cam-double-love-stroke"
          viewBox="0 0 100 72"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M34,69 C34,69 -2,45 -2,24 C-2,11 10,4 24,7 C31,9 36,16 38,24 C40,16 47,7 56,7 C70,4 80,13 78,24 C76,42 50,63 34,69 Z"
            fill="none"
            stroke="rgba(255, 201, 212, 0.95)"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M66,69 C66,69 30,45 30,24 C28,13 38,4 52,7 C59,9 64,16 66,24 C68,16 75,7 84,7 C98,4 108,13 106,24 C104,42 82,63 66,69 Z"
            fill="none"
            stroke="rgba(255, 201, 212, 0.95)"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M34,69 C34,69 -2,45 -2,24 C-2,11 10,4 24,7 C31,9 36,16 38,24 C40,16 47,7 56,7 C70,4 80,13 78,24 C76,42 50,63 34,69 Z"
            fill="none"
            stroke="rgba(255, 248, 250, 0.4)"
            strokeWidth="0.45"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M66,69 C66,69 30,45 30,24 C28,13 38,4 52,7 C59,9 64,16 66,24 C68,16 75,7 84,7 C98,4 108,13 106,24 C104,42 82,63 66,69 Z"
            fill="none"
            stroke="rgba(255, 248, 250, 0.4)"
            strokeWidth="0.45"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <KissCamLoveBurst active={loveBurst} size="phone" />
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl border border-rose-300/35 bg-rose-950/45 px-3 py-2 text-center text-sm text-rose-50">
          {message}
        </p>
      ) : null}

      {!sessionId ? (
        <div className="mt-4 space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#ffc9d4]/75">
            Enter pairing code
          </label>
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            maxLength={8}
            className="h-12 w-full rounded-xl border border-rose-200/25 bg-[#3a2430]/80 px-4 text-center font-heading text-2xl tracking-[0.3em] text-[#fff5f7]"
            placeholder="ABC123"
          />
          <Button className="h-12 w-full bg-[#c45a78] text-white hover:bg-[#a84864]" onClick={() => void resolveCode()}>
            Continue
          </Button>
        </div>
      ) : null}

      <div className="mt-auto grid gap-3 pt-6">
        <Button
          size="xl"
          className="h-14 w-full bg-[#c45a78] text-lg text-white shadow-[0_10px_28px_rgba(196,90,120,0.35)] hover:bg-[#a84864]"
          onClick={() => void startCamera()}
          disabled={!sessionId || status === "connecting" || switching}
        >
          Start Camera
        </Button>
        <Button
          size="lg"
          className="h-12 w-full border border-[#ffc9d4]/40 bg-gradient-to-r from-[#ff8fab] to-[#c45a78] text-base font-semibold text-white shadow-[0_8px_22px_rgba(255,143,171,0.35)] hover:from-[#ff7a9a] hover:to-[#a84864]"
          onClick={triggerLove}
          disabled={!cameraOn || switching || loveBurst}
        >
          {loveBurst ? "♥ Loving…" : "♥ Love"}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="h-12 w-full border border-rose-200/20 bg-[#fff5f7]/12 text-[#fff5f7] hover:bg-[#fff5f7]/18"
          onClick={() => void switchCamera()}
          disabled={!cameraOn || switching || status === "connecting"}
        >
          {switching
            ? "Switching…"
            : `Switch Camera (${facingMode === "environment" ? "to Front" : "to Rear"})`}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-12 w-full border-rose-200/25 text-[#ffd6e0]"
          onClick={() => void stopCamera()}
          disabled={switching}
        >
          Stop Camera
        </Button>
      </div>
    </main>
  );
}
