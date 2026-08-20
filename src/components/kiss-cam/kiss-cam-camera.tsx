"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { KissCamConnection } from "@/components/kiss-cam/kiss-cam-connection";
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
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-[#2a221c] px-4 py-6 text-[#f7f1e8]">
      <header className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#d4af37]/90">
          TableWedding
        </p>
        <h1 className="font-heading mt-1 text-3xl">Kiss Cam Camera</h1>
        <p className="mt-2 text-sm text-[#f7f1e8]/65">{statusText}</p>
        <div className="mt-2 flex justify-center">
          <KissCamSignalBars quality={quality} />
        </div>
      </header>

      <div className="relative mt-5 aspect-[3/4] overflow-hidden rounded-3xl border border-[#d4af37]/35 bg-black/40 shadow-lg">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
          autoPlay
        />
        {!cameraOn && status === "waiting" ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/70">
            Press Start Camera to share video with the wedding screen.
          </div>
        ) : null}
        {switching ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold">
            Switching camera…
          </div>
        ) : null}
      </div>

      {message ? (
        <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-950/40 px-3 py-2 text-center text-sm text-rose-100">
          {message}
        </p>
      ) : null}

      {!sessionId ? (
        <div className="mt-4 space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#e8d5b5]/80">
            Enter pairing code
          </label>
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            maxLength={8}
            className="h-12 w-full rounded-xl border border-white/15 bg-[#3a2f28] px-4 text-center font-heading text-2xl tracking-[0.3em]"
            placeholder="ABC123"
          />
          <Button className="h-12 w-full" onClick={() => void resolveCode()}>
            Continue
          </Button>
        </div>
      ) : null}

      <div className="mt-auto grid gap-3 pt-6">
        <Button
          size="xl"
          className="h-14 w-full bg-[#8b3a45] text-lg text-white hover:bg-[#732f38]"
          onClick={() => void startCamera()}
          disabled={!sessionId || status === "connecting" || switching}
        >
          Start Camera
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="h-12 w-full"
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
          className="h-12 w-full border-white/20 text-[#f7f1e8]"
          onClick={() => void stopCamera()}
          disabled={switching}
        >
          Stop Camera
        </Button>
      </div>
    </main>
  );
}
