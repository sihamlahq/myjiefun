"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  KissCamConnection,
  type KissCamControlAction,
} from "@/components/kiss-cam/kiss-cam-connection";
import { KissCamLoadingOverlay } from "@/components/kiss-cam/kiss-cam-loading";
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

/** Stock-style zoom step (physical lens switch or optical zoom stop — not soft digital). */
type LensOption = {
  key: string;
  factor: number;
  label: string;
  deviceId?: string;
  /** Optical zoom constraint value when staying on one multi-cam device (e.g. iPhone). */
  zoom?: number;
};

type TrackZoomCaps = MediaTrackCapabilities & {
  zoom?: { min: number; max: number; step?: number };
  facingMode?: string[];
};

type TrackZoomSettings = MediaTrackSettings & {
  zoom?: number;
  deviceId?: string;
};

function labelMatchesFacing(label: string, facing: Facing) {
  const l = label.toLowerCase();
  if (facing === "user") {
    return /front|user|face|selfie/.test(l);
  }
  return /back|rear|environment|world|main|triple|dual|wide|tele|ultra/.test(l);
}

function isFrontLabel(label: string) {
  return /front|user|face|selfie/.test(label.toLowerCase());
}

/** Guess stock zoom factor from a camera label (Samsung / Pixel / iOS naming). */
function lensFactorFromLabel(label: string): number | null {
  const l = label.toLowerCase();
  if (isFrontLabel(l)) return null;
  if (/ultra|ultra[\s-]?wide|ultrawide|0\.5/.test(l)) return 0.5;
  if (/periscope|5[\s]?[x×]/.test(l)) return 5;
  if (/3[\s]?[x×]/.test(l)) return 3;
  if (/2[\s]?[x×]|telephoto|tele\b/.test(l)) return 2;
  if (/back|rear|wide|environment|dual|triple|camera/.test(l)) return 1;
  return null;
}

function formatLensLabel(factor: number) {
  if (factor === 0.5) return "0.5×";
  if (Number.isInteger(factor)) return `${factor}×`;
  return `${factor.toFixed(1)}×`;
}

/**
 * Build stock zoom options:
 * 1) Prefer switching physical rear lenses (sharp, like the Camera app)
 * 2) Else snap the device zoom constraint to optical stops (1× / 2× / 3×…) — never fine digital creep
 */
function buildLensOptions(
  devices: MediaDeviceInfo[],
  track: MediaStreamTrack | null,
  facing: Facing,
): LensOption[] {
  const byFactor = new Map<number, LensOption>();

  if (facing === "environment") {
    const rear = devices.filter(
      (d) => d.kind === "videoinput" && d.label && !isFrontLabel(d.label),
    );
    for (const device of rear) {
      const factor = lensFactorFromLabel(device.label);
      if (factor == null) continue;
      // Keep the first (usually primary) device for each factor.
      if (byFactor.has(factor)) continue;
      byFactor.set(factor, {
        key: `device-${device.deviceId}`,
        factor,
        label: formatLensLabel(factor),
        deviceId: device.deviceId,
      });
    }
  }

  // Single multi-camera module (common on iPhone): use discrete optical zoom stops.
  if (byFactor.size <= 1 && track && typeof track.getCapabilities === "function") {
    try {
      const caps = track.getCapabilities() as TrackZoomCaps;
      const z = caps.zoom;
      if (z && typeof z.min === "number" && typeof z.max === "number" && z.max > z.min) {
        const stops = [0.5, 1, 2, 3, 5].filter((f) => f >= z.min - 0.05 && f <= z.max + 0.05);
        const unique = stops.length >= 2 ? stops : [z.min, Math.min(z.max, Math.max(z.min, 1))];
        for (const factor of unique) {
          const zoom = Math.min(z.max, Math.max(z.min, factor));
          byFactor.set(factor, {
            key: `zoom-${factor}`,
            factor,
            label: formatLensLabel(factor),
            zoom,
          });
        }
      }
    } catch {
      // ignore
    }
  }

  const list = [...byFactor.values()].sort((a, b) => a.factor - b.factor);
  return list;
}

function readActiveLensFactor(track: MediaStreamTrack | null, lenses: LensOption[]): number {
  if (!lenses.length) return 1;
  try {
    const settings = track?.getSettings?.() as TrackZoomSettings | undefined;
    if (settings?.deviceId) {
      const byDevice = lenses.find((l) => l.deviceId === settings.deviceId);
      if (byDevice) return byDevice.factor;
    }
    if (typeof settings?.zoom === "number") {
      let best = lenses[0]!;
      let bestDist = Infinity;
      for (const lens of lenses) {
        const target = lens.zoom ?? lens.factor;
        const dist = Math.abs(target - settings.zoom);
        if (dist < bestDist) {
          bestDist = dist;
          best = lens;
        }
      }
      return best.factor;
    }
  } catch {
    // ignore
  }
  return lenses.find((l) => l.factor === 1)?.factor ?? lenses[0]!.factor;
}

/**
 * Flagship phone profile (iPhone 11+ / Galaxy S23 Ultra class):
 * prefer 1080p60 — the smooth “normal” video mode these devices handle well.
 * Fall back to 1080p30, then 720p30. Never 4K over WebRTC.
 */
async function openCamera(facing: Facing, deviceId?: string): Promise<MediaStream> {
  let preferredDeviceId = deviceId;
  if (!preferredDeviceId) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === "videoinput");
      // Prefer the main wide (1×) rear / front camera — not ultra-wide.
      const labeled = cams.filter((d) => d.label && labelMatchesFacing(d.label, facing));
      const wide = labeled.find((d) => lensFactorFromLabel(d.label) === 1);
      preferredDeviceId = wide?.deviceId ?? labeled[0]?.deviceId;
    } catch {
      // ignore
    }
  }

  const hd60 = {
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 },
    frameRate: { ideal: 60, min: 30, max: 60 },
  } as const;

  const hd30 = {
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 },
    frameRate: { ideal: 30, min: 24, max: 30 },
  } as const;

  const attempts: MediaStreamConstraints[] = [];

  const pushFacing = (video: MediaTrackConstraints) => {
    if (preferredDeviceId) {
      attempts.push({
        audio: false,
        video: { deviceId: { exact: preferredDeviceId }, ...video },
      });
    }
    attempts.push({
      audio: false,
      video: { facingMode: { exact: facing }, ...video },
    });
    attempts.push({
      audio: false,
      video: { facingMode: { ideal: facing }, ...video },
    });
  };

  // Try smoothest first, then solid quality fallbacks.
  pushFacing(hd60);
  pushFacing(hd30);
  attempts.push(
    {
      audio: false,
      video: {
        facingMode: { ideal: facing },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, min: 24 },
      },
    },
    {
      audio: false,
      video: { facingMode: { ideal: facing }, frameRate: { ideal: 30 } },
    },
    { audio: false, video: true },
  );

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      await tuneCaptureTrack(stream);
      return stream;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function tuneCaptureTrack(stream: MediaStream) {
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  try {
    // Motion = steadier frame pacing on LED (better than "detail" for live share).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (track as any).contentHint = "motion";
  } catch {
    // ignore
  }

  // Nudge toward flagship 1080p60 when the device allows it.
  const upgrades: MediaTrackConstraints[] = [
    {
      width: { ideal: 1920, max: 1920 },
      height: { ideal: 1080, max: 1080 },
      frameRate: { ideal: 60, max: 60 },
    },
    {
      width: { ideal: 1920, max: 1920 },
      height: { ideal: 1080, max: 1080 },
      frameRate: { ideal: 30, min: 24, max: 30 },
    },
    {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 30 },
    },
  ];

  for (const constraints of upgrades) {
    try {
      await track.applyConstraints(constraints);
      return;
    } catch {
      // try next
    }
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
  const [loveBurstId, setLoveBurstId] = useState(0);
  const [loveBusy, setLoveBusy] = useState(false);
  const [loadingScreen, setLoadingScreen] = useState(false);
  /** Primary control slot: Start Camera ↔ Loading Screen (swaps instantly on press). */
  const [primaryAction, setPrimaryAction] = useState<"start" | "loading">("start");
  const [countdownBusy, setCountdownBusy] = useState<1 | 2 | 3 | null>(null);
  const [lenses, setLenses] = useState<LensOption[]>([]);
  const [activeLens, setActiveLens] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const connRef = useRef<KissCamConnection | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const facingRef = useRef<Facing>("environment");
  const switchingRef = useRef(false);
  const loveCooldownRef = useRef(false);
  const loveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loveClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownCooldownRef = useRef(false);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lensesRef = useRef<LensOption[]>([]);
  const startingRef = useRef(false);
  const loadingBusyRef = useRef(false);
  const pauseCameraForLoadingRef = useRef<(notify?: boolean) => Promise<void>>(async () => undefined);


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

  const syncLensesFromStream = useCallback(async (stream: MediaStream | null) => {
    const track = stream?.getVideoTracks()[0] ?? null;
    let devices: MediaDeviceInfo[] = [];
    try {
      // Labels are often empty until after the first permission grant.
      devices = await navigator.mediaDevices.enumerateDevices();
    } catch {
      devices = [];
    }
    const options = buildLensOptions(devices, track, facingRef.current);
    lensesRef.current = options;
    setLenses(options);
    setActiveLens(readActiveLensFactor(track, options));
  }, []);

  const bindPreview = useCallback(
    async (stream: MediaStream) => {
      streamRef.current = stream;
      setCameraOn(true);
      await syncLensesFromStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // iOS often needs a fresh play() after srcObject swap.
        videoRef.current.load?.();
        await videoRef.current.play().catch(() => undefined);
      }
    },
    [syncLensesFromStream],
  );

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
    lensesRef.current = [];
    setLenses([]);
    setActiveLens(1);
  }, []);

  const stopCamera = useCallback(async () => {
    startingRef.current = false;
    loadingBusyRef.current = false;
    await connRef.current?.dispose();
    connRef.current = null;
    stopTracksOnly();
    await releaseWakeLock();
    setLoadingScreen(false);
    setPrimaryAction("start");
    setStatus("waiting");
    setQuality(null);
    setMessage(null);
  }, [releaseWakeLock, stopTracksOnly]);

  const pauseCameraForLoading = useCallback(
    async (notifyDisplay = true) => {
      if (switchingRef.current || loadingBusyRef.current || startingRef.current) return;
      if (primaryAction === "start" && !cameraOn) return;
      loadingBusyRef.current = true;

      // Swap the primary button to Start Camera immediately.
      setPrimaryAction("start");
      setLoadingScreen(true);
      setMessage(null);

      const conn = connRef.current;
      // Tell the LED first, then drop only the camera track.
      // Keep the WebRTC + realtime session alive so Start Camera can resume quickly.
      if (notifyDisplay && conn?.alive) {
        try {
          await conn.sendControl("loading-on");
        } catch {
          // Display may already be offline; still pause local camera.
        }
      }

      try {
        if (conn?.alive) {
          await conn.replaceVideoTrack(null);
        }
      } catch {
        // ignore — local stop still proceeds
      }

      stopTracksOnly();
      await releaseWakeLock();
      setStatus("waiting");
      setQuality(null);
      loadingBusyRef.current = false;
    },
    [cameraOn, primaryAction, releaseWakeLock, stopTracksOnly],
  );
  pauseCameraForLoadingRef.current = pauseCameraForLoading;

  const startCamera = useCallback(async () => {
    if (switchingRef.current || startingRef.current || loadingBusyRef.current) return;
    startingRef.current = true;

    setMessage(null);
    // Swap the primary button to Loading Screen immediately.
    setPrimaryAction("loading");
    setLoadingScreen(false);

    if (!isSecure) {
      setPrimaryAction("start");
      setStatus("error");
      setMessage("Camera requires HTTPS. Open this page on a secure (https) link.");
      startingRef.current = false;
      return;
    }

    if (!sessionId) {
      setPrimaryAction("start");
      setStatus("error");
      setMessage("This camera session has expired. Please scan a new QR code.");
      startingRef.current = false;
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setPrimaryAction("start");
      setStatus("error");
      setMessage("Camera unavailable. Please check your phone camera.");
      startingRef.current = false;
      return;
    }

    setStatus("connecting");

    try {
      const existing = connRef.current?.alive ? connRef.current : null;

      // If we only paused for loading, reuse the live peer connection.
      if (existing) {
        const stream = await openCamera(facingRef.current);
        await bindPreview(stream);
        await requestWakeLock();
        const track = stream.getVideoTracks()[0] ?? null;
        await existing.replaceVideoTrack(track);
        void existing.sendControl("loading-off").catch(() => undefined);
        setPrimaryAction("loading");
        setStatus("connected");
        setMessage(null);
        startingRef.current = false;
        return;
      }

      // Fresh connect (first start, or connection was fully stopped).
      if (connRef.current) {
        try {
          await connRef.current.dispose();
        } catch {
          // ignore
        }
        connRef.current = null;
      }
      stopTracksOnly();

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
        onControl: (action) => {
          if (action === "loading-on") {
            void pauseCameraForLoadingRef.current(false);
          }
          if (action === "loading-off") {
            setLoadingScreen(false);
          }
        },
        onError: () => {
          setMessage("Unable to connect to the wedding screen. Please scan the QR code again.");
          setStatus("reconnecting");
        },
      });
      connRef.current = conn;
      await conn.connect();
      await conn.attachLocalStream(stream);
      void conn.sendControl("loading-off").catch(() => undefined);
      setPrimaryAction("loading");
      setStatus("connected");
      setMessage(null);
    } catch (error) {
      setPrimaryAction("start");
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMessage("Camera access is required to use the mobile camera.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setMessage("Camera unavailable. Please check your phone camera.");
      } else {
        setMessage(
          error instanceof Error
            ? `Unable to start camera: ${error.message}`
            : "Camera unavailable. Please check your phone camera.",
        );
      }
      setStatus("error");
      stopTracksOnly();
    } finally {
      startingRef.current = false;
    }
  }, [bindPreview, isSecure, requestWakeLock, sessionId, stopTracksOnly]);

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

  const selectLens = useCallback(
    async (lens: LensOption) => {
      if (!cameraOn || switchingRef.current) return;
      if (lens.factor === activeLens) return;

      // Optical zoom stop on the same multi-cam module (iPhone-style) — sharp.
      if (lens.zoom != null && !lens.deviceId) {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        setActiveLens(lens.factor);
        try {
          await track.applyConstraints({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            advanced: [{ zoom: lens.zoom } as any],
          });
        } catch {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await track.applyConstraints({ zoom: lens.zoom } as any);
          } catch {
            setMessage("This zoom lens is not available on this phone.");
          }
        }
        return;
      }

      // Physical lens switch (Samsung / Pixel stock camera style) — sharp.
      if (!lens.deviceId) return;
      switchingRef.current = true;
      setSwitching(true);
      setMessage(null);
      setActiveLens(lens.factor);

      const previousStream = streamRef.current;
      try {
        const stream = await openCamera(facingRef.current, lens.deviceId);
        previousStream?.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {
            // ignore
          }
        });
        await bindPreview(stream);
        await connRef.current?.replaceVideoTrack(stream.getVideoTracks()[0] ?? null);
        await requestWakeLock();
      } catch {
        setActiveLens(readActiveLensFactor(streamRef.current?.getVideoTracks()[0] ?? null, lensesRef.current));
        setMessage("Could not switch to that lens. Staying on the current camera.");
      } finally {
        switchingRef.current = false;
        setSwitching(false);
      }
    },
    [activeLens, bindPreview, cameraOn, requestWakeLock],
  );

  const triggerLove = useCallback(() => {
    // Short cooldown only — keeping the button disabled for the full animation
    // made taps feel dead / laggy on phones.
    if (loveCooldownRef.current || !cameraOn || switchingRef.current) return;
    loveCooldownRef.current = true;
    setLoveBusy(true);

    setLoveBurstId((id) => id + 1);
    setLoveBurst(true);
    // Fire signaling after paint so the UI reacts instantly.
    queueMicrotask(() => {
      void connRef.current?.sendControl("love").catch(() => undefined);
    });

    if (loveTimerRef.current) clearTimeout(loveTimerRef.current);
    if (loveClearRef.current) clearTimeout(loveClearRef.current);

    loveTimerRef.current = setTimeout(() => {
      loveCooldownRef.current = false;
      setLoveBusy(false);
      loveTimerRef.current = null;
    }, 350);

    loveClearRef.current = setTimeout(() => {
      setLoveBurst(false);
      loveClearRef.current = null;
    }, 1800);
  }, [cameraOn]);

  const triggerCountdown = useCallback(
    (value: 1 | 2 | 3) => {
      if (!cameraOn || switchingRef.current) return;
      // Allow pressing the same digit again immediately — only skip double-fire
      // from pointerdown + click on the same gesture (~120ms).
      if (countdownCooldownRef.current) return;
      countdownCooldownRef.current = true;
      setCountdownBusy(value);

      const action = `countdown-${value}` as KissCamControlAction;
      queueMicrotask(() => {
        void connRef.current?.sendControl(action).catch(() => undefined);
      });

      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
      if (countdownClearRef.current) clearTimeout(countdownClearRef.current);

      countdownTimerRef.current = setTimeout(() => {
        countdownCooldownRef.current = false;
        countdownTimerRef.current = null;
      }, 120);

      countdownClearRef.current = setTimeout(() => {
        setCountdownBusy(null);
        countdownClearRef.current = null;
      }, 700);
    },
    [cameraOn],
  );

  useEffect(() => {
    return () => {
      if (loveTimerRef.current) clearTimeout(loveTimerRef.current);
      if (loveClearRef.current) clearTimeout(loveClearRef.current);
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
      if (countdownClearRef.current) clearTimeout(countdownClearRef.current);
    };
  }, []);

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

  const statusText = loadingScreen
    ? "Camera paused · Loading screen on LED"
    : status === "waiting"
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
            className="h-full w-full object-cover [transform:translateZ(0)]"
            muted
            playsInline
            autoPlay
            disablePictureInPicture
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
        <KissCamLoveBurst active={loveBurst} burstId={loveBurstId} size="phone" />
        <KissCamLoadingOverlay active={loadingScreen} size="phone" />
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
          <Button
            className="h-12 w-full touch-manipulation bg-[#c45a78] text-white hover:bg-[#a84864] active:scale-[0.98]"
            onClick={() => void resolveCode()}
          >
            Continue
          </Button>
        </div>
      ) : null}

      <div className="mt-auto grid gap-3 pt-6">
        <div className="rounded-2xl border border-rose-200/20 bg-[#3a2430]/65 px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffc9d4]/75">
            <span>Zoom</span>
            <span className="tabular-nums tracking-normal text-[#fff5f7]">
              {cameraOn && lenses.length ? formatLensLabel(activeLens) : "—"}
            </span>
          </div>
          {cameraOn && lenses.length > 1 ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {lenses.map((lens) => {
                const selected = Math.abs(lens.factor - activeLens) < 0.05;
                return (
                  <button
                    key={lens.key}
                    type="button"
                    className={`min-h-11 min-w-11 touch-manipulation rounded-full px-3 text-sm font-semibold transition-[transform,background-color,color] active:scale-95 ${
                      selected
                        ? "bg-[#ff8fab] text-white shadow-[0_6px_16px_rgba(255,143,171,0.35)]"
                        : "bg-[#fff5f7]/12 text-[#fff5f7] hover:bg-[#fff5f7]/2"
                    }`}
                    disabled={switching}
                    aria-pressed={selected}
                    aria-label={`Zoom ${lens.label}`}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      void selectLens(lens);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      void selectLens(lens);
                    }}
                  >
                    {lens.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-[11px] text-[#ffc9d4]/55">
              {cameraOn
                ? "Stock zoom lenses not available on this camera"
                : "Start camera to use stock zoom lenses"}
            </p>
          )}
        </div>

        {primaryAction === "loading" ? (
          <Button
            type="button"
            size="xl"
            className="h-14 w-full touch-manipulation border border-[#ffc9d4]/40 bg-gradient-to-r from-[#ff8fab] to-[#c45a78] text-lg font-semibold text-white shadow-[0_10px_28px_rgba(255,143,171,0.35)] hover:from-[#ff7a9a] hover:to-[#a84864] active:scale-[0.98]"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              void pauseCameraForLoading(true);
            }}
            onClick={(e) => {
              e.preventDefault();
              void pauseCameraForLoading(true);
            }}
            disabled={switching || status === "connecting"}
            aria-pressed={loadingScreen}
          >
            Loading Screen
          </Button>
        ) : (
          <Button
            type="button"
            size="xl"
            className="h-14 w-full touch-manipulation bg-[#c45a78] text-lg text-white shadow-[0_10px_28px_rgba(196,90,120,0.35)] hover:bg-[#a84864] active:scale-[0.98]"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              void startCamera();
            }}
            onClick={(e) => {
              e.preventDefault();
              void startCamera();
            }}
            disabled={!sessionId || status === "connecting" || switching}
          >
            {status === "connecting" ? "Starting…" : "Start Camera"}
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          className="h-12 w-full touch-manipulation border border-[#ffc9d4]/40 bg-gradient-to-r from-[#ff8fab] to-[#c45a78] text-base font-semibold text-white shadow-[0_8px_22px_rgba(255,143,171,0.35)] hover:from-[#ff7a9a] hover:to-[#a84864] active:scale-[0.97]"
          onPointerDown={(e) => {
            // Instant feedback on mobile (avoids 300ms-feel click lag).
            if (e.button !== 0) return;
            e.preventDefault();
            triggerLove();
          }}
          onClick={(e) => {
            // Keyboard / accessibility fallback when pointerdown didn't fire.
            e.preventDefault();
            triggerLove();
          }}
          disabled={!cameraOn || switching || loveBusy}
          aria-pressed={loveBurst}
        >
          ♥ Love
        </Button>

        <div className="grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="lg"
              className={`h-14 touch-manipulation text-2xl font-semibold text-white shadow-[0_8px_20px_rgba(90,40,55,0.28)] active:scale-[0.96] ${
                countdownBusy === value
                  ? "bg-[#ff8fab]"
                  : "bg-[#5a2f38] hover:bg-[#7a3f4c]"
              }`}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                triggerCountdown(value);
              }}
              onClick={(e) => {
                e.preventDefault();
                triggerCountdown(value);
              }}
              disabled={!cameraOn || switching}
              aria-label={`Show countdown ${value} on the wedding screen`}
            >
              {value}
            </Button>
          ))}
        </div>
        <p className="-mt-1 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-[#ffc9d4]/65">
          Countdown on screen
        </p>

        <Button
          size="lg"
          variant="secondary"
          className="h-12 w-full touch-manipulation border border-rose-200/20 bg-[#fff5f7]/12 text-[#fff5f7] hover:bg-[#fff5f7]/18 active:scale-[0.98]"
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
          className="h-12 w-full touch-manipulation border-rose-200/25 text-[#ffd6e0] active:scale-[0.98]"
          onClick={() => void stopCamera()}
          disabled={switching}
        >
          Stop Camera
        </Button>
      </div>
    </main>
  );
}
