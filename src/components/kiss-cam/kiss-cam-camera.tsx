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
  | "standby"
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
 * Venue-stable capture: open quickly at 720p30 (not 1080 first).
 * Soft encode starts at "medium" and climbs only when the link is strong —
 * same idea as the controller staying up on flaky Wi‑Fi.
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

  const softHd: MediaTrackConstraints = {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 30 },
  };

  const attempts: MediaStreamConstraints[] = [];

  // Fast path first — ideals usually succeed on the first try.
  if (preferredDeviceId) {
    attempts.push({
      audio: false,
      video: { deviceId: { ideal: preferredDeviceId }, ...softHd },
    });
  }
  attempts.push({
    audio: false,
    video: { facingMode: { ideal: facing }, ...softHd },
  });
  attempts.push({
    audio: false,
    video: { facingMode: { ideal: facing }, frameRate: { ideal: 30 } },
  });
  attempts.push({ audio: false, video: true });

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

  // Prefer stable 720p30; allow 1080 only if the device already has headroom.
  const upgrades: MediaTrackConstraints[] = [
    {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 30 },
    },
    {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, min: 24, max: 30 },
    },
    {
      width: { ideal: 960, max: 1280 },
      height: { ideal: 540, max: 720 },
      frameRate: { ideal: 24, max: 30 },
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
  /** Primary control slot: Go Live / Connect ↔ Loading Screen (swaps once live). */
  const [primaryAction, setPrimaryAction] = useState<"start" | "loading">("start");
  /** iOS / some browsers need one tap before getUserMedia — shown only if auto-connect is blocked. */
  const [needsConnectTap, setNeedsConnectTap] = useState(false);
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
  const placeholderTrackRef = useRef<MediaStreamTrack | null>(null);
  const pauseCameraForLoadingRef = useRef<(notify?: boolean) => Promise<void>>(async () => undefined);
  const startCameraRef = useRef<(mode?: "take" | "if-free") => Promise<void>>(
    async () => undefined,
  );

  const stopPlaceholderTrack = useCallback(() => {
    const track = placeholderTrackRef.current;
    placeholderTrackRef.current = null;
    if (!track) return;
    try {
      track.stop();
    } catch {
      // ignore
    }
  }, []);


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
    stopPlaceholderTrack();
    try {
      await connRef.current?.stopPublishing();
    } catch {
      // keep signaling even if the live slot is already released
    }
    stopTracksOnly();
    await releaseWakeLock();
    setLoadingScreen(false);
    setPrimaryAction("start");
    setNeedsConnectTap(false);
    // Stay joined to the session — standby with signaling connection.
    setStatus(connRef.current?.alive ? "standby" : "waiting");
    setQuality(null);
    setMessage(
      connRef.current?.alive
        ? "Connected · standby (tap Go Live to share camera again)"
        : null,
    );
  }, [releaseWakeLock, stopPlaceholderTrack, stopTracksOnly]);

  const pauseCameraForLoading = useCallback(
    async (notifyDisplay = true) => {
      if (switchingRef.current || loadingBusyRef.current || startingRef.current) return;
      loadingBusyRef.current = true;
      setMessage(null);

      const conn = connRef.current;
      // Toggle soft loading overlay — keep the live love-frame video (no black placeholder).
      if (loadingScreen) {
        setLoadingScreen(false);
        if (notifyDisplay && conn?.alive) {
          try {
            await conn.sendControl("loading-off");
          } catch {
            // ignore
          }
        }
        loadingBusyRef.current = false;
        return;
      }

      setLoadingScreen(true);
      if (notifyDisplay && conn?.alive) {
        try {
          await conn.sendControl("loading-on");
        } catch {
          // Display may already be offline.
        }
      }
      loadingBusyRef.current = false;
    },
    [loadingScreen],
  );
  pauseCameraForLoadingRef.current = pauseCameraForLoading;

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setStatus("error");
      setMessage("Kiss Cam signaling is not configured.");
      return;
    }

    const conn = new KissCamConnection(supabase, sessionId, "camera", {
      onConnectionState: (pcState) => {
        if (!conn.isPublishing) return;
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
      onPeerPresence: () => {
        // Signaling presence only — do not flip to "reconnecting" on missed beats.
        // WebRTC `onConnectionState` owns live / reconnect UI.
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
      onStandby: () => {
        stopPlaceholderTrack();
        // Keep local camera preview + wake lock so LED can switch back instantly.
        setLoadingScreen(false);
        setPrimaryAction("start");
        setNeedsConnectTap(false);
        setStatus("standby");
        setQuality(null);
        setMessage("Connected · standby (another phone is live — tap Go Live to switch)");
      },
      onPromote: () => {
        // LED selected this phone — publish without dropping the session.
        void startCameraRef.current();
      },
      onError: () => {
        if (!conn.isPublishing) return;
        setMessage("Unable to connect to the wedding screen. Please scan the QR code again.");
        setStatus("reconnecting");
      },
    });
    connRef.current = conn;
    setNeedsConnectTap(false);
    setStatus("connecting");
    setMessage("Connecting to wedding screen…");
    let didAutoStart = false;
    void conn
      .connect()
      .then(() => {
        if (cancelled || didAutoStart) return;
        didAutoStart = true;
        // Scan QR → open camera; claim live only if the slot is free (else standby).
        setStatus("connecting");
        setMessage("Connecting camera…");
        void startCameraRef.current("if-free");
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to join the wedding screen. Please scan the QR code again.",
        );
      });

    return () => {
      cancelled = true;
      void conn.dispose();
      if (connRef.current === conn) connRef.current = null;
    };
  }, [releaseWakeLock, sessionId, stopPlaceholderTrack, stopTracksOnly]);

  const startCamera = useCallback(async (claimMode: "take" | "if-free" = "take") => {
    if (switchingRef.current || startingRef.current || loadingBusyRef.current) return;
    startingRef.current = true;

    setMessage(null);
    setNeedsConnectTap(false);
    // Swap the primary button to Loading Screen immediately once we go live.
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
    setMessage(claimMode === "if-free" ? "Joining camera session…" : "Going live…");

    try {
      const conn = connRef.current;
      if (!conn?.alive) {
        throw new Error("Not joined to the wedding screen yet. Wait a moment and try again.");
      }

      // If we only paused for loading, reopen the lens and renegotiate media.
      if (conn.isPublishing) {
        const stream = streamRef.current ?? (await openCamera(facingRef.current));
        await bindPreview(stream);
        await requestWakeLock();
        const track = stream.getVideoTracks()[0] ?? null;
        await conn.replaceVideoTrack(track, { renegotiate: true });
        stopPlaceholderTrack();
        void conn.sendControl("loading-off").catch(() => undefined);
        setPrimaryAction("loading");
        setNeedsConnectTap(false);
        setStatus("connected");
        setMessage(null);
        startingRef.current = false;
        return;
      }

      stopPlaceholderTrack();

      // Reuse standby preview stream when possible (instant switch).
      let stream = streamRef.current;
      const liveTrack = stream?.getVideoTracks()[0];
      if (!stream || !liveTrack || liveTrack.readyState === "ended") {
        stopTracksOnly();
        stream = await openCamera(facingRef.current);
      }
      await bindPreview(stream);
      await requestWakeLock();
      await conn.startPublishing(stream, { mode: claimMode });
      if (!conn.isPublishing) {
        // Stay connected with local preview — LED can promote this phone later.
        setPrimaryAction("start");
        setNeedsConnectTap(false);
        setStatus("standby");
        setCameraOn(true);
        setMessage("Connected · standby (another phone is live — tap Go Live to switch)");
        startingRef.current = false;
        return;
      }
      void conn.sendControl("loading-off").catch(() => undefined);
      setPrimaryAction("loading");
      setNeedsConnectTap(false);
      setStatus("connected");
      setMessage(null);
    } catch (error) {
      setPrimaryAction("start");
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        // Auto-connect often needs one user gesture on iOS — keep session joined.
        setNeedsConnectTap(true);
        setStatus("standby");
        setMessage("Connected · tap once to allow the camera");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setStatus("error");
        setMessage("Camera unavailable. Please check your phone camera.");
      } else {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? `Unable to start camera: ${error.message}`
            : "Camera unavailable. Please check your phone camera.",
        );
      }
      stopPlaceholderTrack();
      stopTracksOnly();
    } finally {
      startingRef.current = false;
    }
  }, [bindPreview, isSecure, releaseWakeLock, requestWakeLock, sessionId, stopPlaceholderTrack, stopTracksOnly]);
  startCameraRef.current = startCamera;

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
    if (loveCooldownRef.current || !connRef.current?.alive || switchingRef.current) return;
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
  }, []);

  const triggerCountdown = useCallback(
    (value: 1 | 2 | 3) => {
      if (!connRef.current?.alive || switchingRef.current) return;
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
    [],
  );

  useEffect(() => {
    return () => {
      if (loveTimerRef.current) clearTimeout(loveTimerRef.current);
      if (loveClearRef.current) clearTimeout(loveClearRef.current);
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
      if (countdownClearRef.current) clearTimeout(countdownClearRef.current);
    };
  }, []);

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

  const controlsReady = Boolean(sessionId && connRef.current?.alive && status !== "error");
  const statusText = loadingScreen
    ? "Camera paused · Loading screen on LED"
    : status === "waiting"
      ? "Waiting for display..."
      : status === "standby"
        ? needsConnectTap
          ? "Connected · tap to allow camera"
          : "Connected · standby"
        : status === "connecting"
        ? "Connecting…"
        : status === "connected"
          ? `Connected ✓ · ${facingMode === "environment" ? "Rear" : "Front"}`
          : status === "lost"
            ? "Connection lost"
            : status === "reconnecting"
              ? "Reconnecting..."
              : "Something went wrong";

  return (
    <main className="kiss-cam-phone-shell mx-auto flex h-dvh max-h-dvh max-w-md flex-col overflow-hidden px-3 text-[#fff5f7]">
      <header className="shrink-0 text-center">
        <p className="text-[9px] font-semibold uppercase tracking-[0.32em] text-[#ffc9d4]/80">
          TableWedding
        </p>
        <h1 className="kiss-cam-love-title mt-0.5 text-[clamp(1.85rem,9vw,2.75rem)] leading-none">
          <span className="kiss-cam-love-title-accent mr-1 text-[0.72em]" aria-hidden>
            ♥
          </span>
          Kiss Cam
          <span className="kiss-cam-love-title-accent ml-1 text-[0.72em]" aria-hidden>
            ♥
          </span>
        </h1>
        <div className="mt-1 flex items-center justify-center gap-2">
          <p className="truncate text-xs text-[#fff5f7]/70">{statusText}</p>
          <KissCamSignalBars quality={quality} />
        </div>
      </header>

      {/* Preview uses the same live-heart-mask.png silhouette as the LED share */}
      <div className="relative kiss-cam-double-love mx-auto mt-2 w-full shrink min-h-0">
        <div className="kiss-cam-double-love-media">
          <video
            ref={videoRef}
            className="kiss-cam-double-love-video"
            muted
            playsInline
            autoPlay
            disablePictureInPicture
          />
          {!cameraOn && (status === "waiting" || status === "standby" || status === "connecting") ? (
            <div className="absolute inset-0 z-[1] flex items-center justify-center px-8 text-center text-xs leading-snug text-[#5a2f38]/85 sm:text-sm">
              {status === "connecting"
                ? "Connecting to the wedding screen…"
                : status === "standby"
                  ? needsConnectTap
                    ? "Tap Connect below to allow the camera (one-time)."
                    : "Connected in standby. Love and countdown work. Tap Go Live to share video."
                  : "Joining session…"}
            </div>
          ) : null}
          {switching ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#3a2430]/55 text-sm font-semibold">
              Switching camera…
            </div>
          ) : null}
        </div>
        <KissCamLoveBurst active={loveBurst} burstId={loveBurstId} size="phone" />
        <KissCamLoadingOverlay active={loadingScreen} size="phone" />
      </div>

      {message ? (
        <p className="mt-1.5 shrink-0 truncate rounded-xl border border-rose-300/35 bg-rose-950/45 px-2.5 py-1.5 text-center text-xs text-rose-50">
          {message}
        </p>
      ) : null}

      {!sessionId ? (
        <div className="mt-2 shrink-0 space-y-1.5">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#ffc9d4]/75">
            Enter pairing code
          </label>
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            maxLength={8}
            className="h-11 w-full rounded-xl border border-rose-200/25 bg-[#3a2430]/80 px-4 text-center font-heading text-xl tracking-[0.3em] text-[#fff5f7]"
            placeholder="ABC123"
          />
          <Button
            className="h-11 w-full touch-manipulation bg-[#c45a78] text-white hover:bg-[#a84864] active:scale-[0.98]"
            onClick={() => void resolveCode()}
          >
            Continue
          </Button>
        </div>
      ) : (
      <div className="mt-auto flex min-h-0 shrink-0 flex-col gap-1.5 pt-2">
        <div className="rounded-xl border border-rose-200/20 bg-[#3a2430]/65 px-2.5 py-1.5">
          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ffc9d4]/75">
            <span>Zoom</span>
            <span className="tabular-nums tracking-normal text-[#fff5f7]">
              {cameraOn && lenses.length ? formatLensLabel(activeLens) : "—"}
            </span>
          </div>
          {cameraOn && lenses.length > 1 ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {lenses.map((lens) => {
                const selected = Math.abs(lens.factor - activeLens) < 0.05;
                return (
                  <button
                    key={lens.key}
                    type="button"
                    className={`min-h-9 min-w-9 touch-manipulation rounded-full px-2.5 text-xs font-semibold transition-[transform,background-color,color] active:scale-95 ${
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
            <p className="text-center text-[10px] text-[#ffc9d4]/55">
              {cameraOn
                ? "Stock zoom lenses not available on this camera"
                : "Zoom unlocks after the camera connects"}
            </p>
          )}
        </div>

        {primaryAction === "loading" || loadingScreen ? (
          <Button
            type="button"
            size="xl"
            className="h-11 w-full touch-manipulation border border-[#ffc9d4]/40 bg-gradient-to-r from-[#ff8fab] to-[#c45a78] text-base font-semibold text-white shadow-[0_10px_28px_rgba(255,143,171,0.35)] hover:from-[#ff7a9a] hover:to-[#a84864] active:scale-[0.98]"
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
            {loadingScreen ? "Clear Loading Screen" : "Loading Screen"}
          </Button>
        ) : (
          <Button
            type="button"
            size="xl"
            className="h-11 w-full touch-manipulation bg-[#c45a78] text-base text-white shadow-[0_10px_28px_rgba(196,90,120,0.35)] hover:bg-[#a84864] active:scale-[0.98]"
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
            {status === "connecting"
              ? "Connecting…"
              : needsConnectTap
                ? "Connect Camera"
                : "Go Live"}
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          className="h-10 w-full touch-manipulation border border-[#ffc9d4]/40 bg-gradient-to-r from-[#ff8fab] to-[#c45a78] text-sm font-semibold text-white shadow-[0_8px_22px_rgba(255,143,171,0.35)] hover:from-[#ff7a9a] hover:to-[#a84864] active:scale-[0.97]"
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
          disabled={!controlsReady || switching || loveBusy}
          aria-pressed={loveBurst}
        >
          ♥ Love
        </Button>

        <div className="grid grid-cols-3 gap-1.5">
          {([1, 2, 3] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="lg"
              className={`h-11 touch-manipulation text-xl font-semibold text-white shadow-[0_8px_20px_rgba(90,40,55,0.28)] active:scale-[0.96] ${
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
              disabled={!controlsReady || switching}
              aria-label={`Show countdown ${value} on the wedding screen`}
            >
              {value}
            </Button>
          ))}
        </div>
        <p className="-mt-0.5 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-[#ffc9d4]/65">
          Countdown on screen
        </p>

        <div className="grid grid-cols-2 gap-1.5">
          <Button
            size="lg"
            variant="secondary"
            className="h-10 touch-manipulation border border-rose-200/20 bg-[#fff5f7]/12 text-xs text-[#fff5f7] hover:bg-[#fff5f7]/18 active:scale-[0.98]"
            onClick={() => void switchCamera()}
            disabled={!cameraOn || switching || status === "connecting"}
          >
            {switching
              ? "Switching…"
              : facingMode === "environment"
                ? "Front cam"
                : "Rear cam"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-10 touch-manipulation border-rose-200/25 text-xs text-[#ffd6e0] active:scale-[0.98]"
            onClick={() => void stopCamera()}
            disabled={switching}
          >
            Stop
          </Button>
        </div>
      </div>
      )}
    </main>
  );
}
