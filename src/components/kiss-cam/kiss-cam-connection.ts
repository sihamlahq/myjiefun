"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { fetchIceServers } from "@/components/kiss-cam/kiss-cam-ice";
import { signalingChannelName } from "@/components/kiss-cam/kiss-cam-session";
import type { ConnectionQuality } from "@/components/kiss-cam/kiss-cam-types";
import {
  AdaptiveVideoQualityController,
  VIDEO_ENCODING_PROFILES,
  classifyNetworkBand,
  scoreFromNetwork,
  type NetworkSample,
  type VideoQualityProfile,
} from "@/components/kiss-cam/kiss-cam-video-quality";

export type KissCamControlAction =
  | "start"
  | "reset"
  | "preview"
  | "love"
  | "loading-on"
  | "loading-off"
  | "countdown-1"
  | "countdown-2"
  | "countdown-3"
  | "fullscreen-on"
  | "fullscreen-off"
  | "fullscreen-toggle";

type ClientRole = "display" | "camera" | "remote";

type SignalEnvelope = { from: string };

export type KissCamClaimMode = "take" | "if-free";

export type KissCamCameraPeer = {
  clientId: string;
  label: string;
  publishing: boolean;
  lastBeat: number;
};

type SignalMessage = SignalEnvelope &
  (
    | { type: "hello"; role: ClientRole; label?: string }
    | { type: "heartbeat"; role: ClientRole; ts: number; publishing?: boolean; label?: string }
    | { type: "claim"; mode?: KissCamClaimMode }
    | { type: "standby" }
    | { type: "publisher"; clientId: string | null }
    | { type: "promote"; clientId: string }
    /** Mobile remote asks the LED to switch the live camera. */
    | { type: "remote-promote"; clientId: string }
    /** LED tells remotes the active pairing QR (id + short code). */
    | { type: "session-info"; sessionId: string; shortCode: string }
    | { type: "roster"; cameras: Array<{ clientId: string; label: string; publishing: boolean }> }
    | { type: "offer"; sdp: RTCSessionDescriptionInit }
    | { type: "answer"; sdp: RTCSessionDescriptionInit }
    | { type: "ice"; candidate: RTCIceCandidateInit }
    | { type: "bye" }
    | { type: "control"; action: KissCamControlAction }
  );

type OutgoingSignal = SignalMessage extends infer M
  ? M extends { from: string }
    ? Omit<M, "from">
    : never
  : never;

type Handlers = {
  onRemoteStream?: (stream: MediaStream | null) => void;
  onConnectionState?: (state: RTCPeerConnectionState | "reconnecting") => void;
  onPeerPresence?: (present: boolean) => void;
  onQuality?: (quality: ConnectionQuality) => void;
  onError?: (message: string) => void;
  onControl?: (action: KissCamControlAction) => void;
  /** This phone lost the live camera slot — keep signaling; local preview may stay. */
  onStandby?: () => void;
  onPublisherChange?: (selfIsPublisher: boolean, publisherId: string | null) => void;
  /** LED: connected camera phones (live + standby). */
  onRoster?: (cameras: KissCamCameraPeer[], publisherId: string | null) => void;
  /** Phone: LED asked this device to become the live camera. */
  onPromote?: () => void;
  /** Remote: LED pairing QR metadata so mobile shows the same code. */
  onSessionInfo?: (info: { sessionId: string; shortCode: string }) => void;
};

function createClientId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `kc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Quick recovery when ICE truly fails. */
const ICE_RESTART_FAILED_MS = 800;
/**
 * Mobile Wi‑Fi often dips to `disconnected` for several seconds (radio power-save /
 * AP roaming) and recovers on its own. Restarting ICE too early causes drop loops.
 */
const ICE_RESTART_DISCONNECTED_MS = 10_000;
const ICE_RESTART_MAX_ATTEMPTS = 4;
/** After ICE restarts fail, rebuild the peer (keep Realtime signaling — like controller). */
const MEDIA_REBUILD_MAX = 3;
const HEARTBEAT_INTERVAL_MS = 2500;
/** Missed signaling beats ≠ media drop — keep this loose on flaky venue Wi‑Fi. */
const HEARTBEAT_MISS_MS = 20_000;

/**
 * Perfect negotiation: display is polite, camera (offerer of media) is impolite.
 * Only one camera publishes WebRTC at a time; other phones stay on signaling (standby).
 */
export class KissCamConnection {
  readonly clientId = createClientId();
  private pc: RTCPeerConnection | null = null;
  private channel: RealtimeChannel | null = null;
  private iceServers: RTCIceServer[] = [];
  private turnConfigured = false;
  /** Prefer TURN relay after host/srflx paths keep failing on venue Wi‑Fi. */
  private preferRelay = false;
  private makingOffer = false;
  private ignoreOffer = false;
  private isSettingRemoteAnswerPending = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private statsTimer: ReturnType<typeof setInterval> | null = null;
  private iceRestartTimer: ReturnType<typeof setTimeout> | null = null;
  private iceRestartAttempts = 0;
  private mediaRebuildAttempts = 0;
  private mediaRebuildInFlight = false;
  private lastPeerBeat = 0;
  private localStream: MediaStream | null = null;
  private disposed = false;
  /** Camera is the active WebRTC publisher (display always has a peer). */
  private publishing = false;
  /** Display: which camera client currently owns the live slot. */
  private publisherId: string | null = null;
  private publisherWaiters: Array<(id: string | null) => void> = [];
  /** Display roster of camera phones still on signaling. */
  private cameras = new Map<string, { label: string; publishing: boolean; lastBeat: number }>();
  /** LED pairing short code — remotes mirror this so mobile QR matches desktop. */
  private pairingShortCode: string | null = null;
  private phoneLabel =
    typeof navigator !== "undefined"
      ? `Phone ${(navigator.userAgent.match(/iPhone|Android|Mobile/i)?.[0] ?? "Cam").slice(0, 8)}-${this.clientId.slice(0, 4)}`
      : `Phone-${this.clientId.slice(0, 4)}`;
  /** Adaptive encode — soft start, fast downshift (controller-like resilience). */
  private qualityController = new AdaptiveVideoQualityController({
    initialProfile: "medium",
    downgradeHoldSamples: 1,
    upgradeHoldSamples: 8,
  });
  private contentHintApplied = false;
  private prevOutboundBytes: { bytes: number; ts: number } | null = null;
  private prevInboundBytes: { bytes: number; ts: number } | null = null;
  private prevPacketsLost = 0;
  private prevPacketsSent = 0;
  private prevPacketsReceived = 0;

  constructor(
    private supabase: SupabaseClient,
    private sessionId: string,
    private role: "display" | "camera" | "remote",
    private handlers: Handlers = {},
  ) {}

  get polite() {
    return this.role === "display";
  }

  get isPublishing() {
    return this.publishing;
  }

  get currentPublisherId() {
    return this.publisherId;
  }

  get isRemote() {
    return this.role === "remote";
  }

  getCameraRoster(): KissCamCameraPeer[] {
    return this.rosterList();
  }

  async connect() {
    this.disposed = false;
    const { iceServers, turnConfigured } = await fetchIceServers();
    this.iceServers = iceServers;
    this.turnConfigured = turnConfigured;

    // Display always has a peer; camera phones join signaling first and only
    // open WebRTC after they claim the live publisher slot.
    // Remote is signaling-only (no WebRTC) so it never steals the LED stream.
    if (this.role === "display") {
      this.createPeerConnection();
    }

    this.channel = this.supabase.channel(signalingChannelName(this.sessionId), {
      config: { broadcast: { self: false } },
    });

    this.channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      void this.onSignal(payload as SignalMessage);
    });

    // Wait until Realtime is actually subscribed before sending offers/controls.
    // Otherwise the first camera offer is often dropped while buttons later work.
    // Re-SUBSCRIBED (Realtime reconnect) still sends hello for presence — media
    // renegotiation is gated in onSignal so we don't tear down a healthy PC.
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error("Kiss Cam signaling timed out. Check the network and try again."));
      }, 12_000);

      this.channel!.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void this.send({
            type: "hello",
            role: this.role,
            ...(this.role === "camera" ? { label: this.phoneLabel } : {}),
            ...(this.role === "remote" ? { label: "Mobile remote" } : {}),
          });
          this.startHeartbeat();
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            resolve();
          }
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            reject(new Error(`Kiss Cam signaling failed (${status}).`));
          }
        }
      });
    });

    if (this.disposed) return;

    if (this.role === "camera" && this.localStream) {
      await this.startPublishing(this.localStream);
    }

    if (this.role !== "remote") {
      this.startStats();
    }
  }

  get alive() {
    return !this.disposed && this.channel != null;
  }

  private createPeerConnection() {
    this.closePeerConnection();
    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 8,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
      // After repeated failures on guest Wi‑Fi, force TURN when configured.
      ...(this.preferRelay && this.turnConfigured
        ? { iceTransportPolicy: "relay" as RTCIceTransportPolicy }
        : {}),
    });
    this.pc = pc;
    this.makingOffer = false;
    this.ignoreOffer = false;
    this.isSettingRemoteAnswerPending = false;
    this.iceRestartAttempts = 0;
    this.contentHintApplied = false;
    this.prevOutboundBytes = null;
    this.prevInboundBytes = null;
    this.prevPacketsLost = 0;
    this.prevPacketsSent = 0;
    this.prevPacketsReceived = 0;

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      if (this.role === "camera" && !this.publishing) return;
      void this.send({ type: "ice", candidate: event.candidate.toJSON() });
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      event.track.onunmute = () => {
        this.handlers.onRemoteStream?.(
          event.streams[0] ?? new MediaStream([event.track]),
        );
      };
      event.track.onmute = () => {
        // Keep the MediaStream reference; compositor handles blank frames.
      };
      this.handlers.onRemoteStream?.(stream);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (!state || this.pc !== pc) return;
      if (state === "connected" || state === "connecting") {
        this.clearIceRestartTimer();
        if (state === "connected") {
          this.iceRestartAttempts = 0;
          this.mediaRebuildAttempts = 0;
        }
        this.handlers.onConnectionState?.(state);
        return;
      }
      if (state === "failed") {
        this.handlers.onConnectionState?.("reconnecting");
        this.scheduleIceRestart(ICE_RESTART_FAILED_MS);
        return;
      }
      if (state === "disconnected") {
        // Do not flap UI yet — many phones recover before the grace window ends.
        this.scheduleIceRestart(ICE_RESTART_DISCONNECTED_MS);
        return;
      }
      this.handlers.onConnectionState?.(state);
    };
  }

  private closePeerConnection() {
    this.clearIceRestartTimer();
    if (!this.pc) return;
    this.pc.onicecandidate = null;
    this.pc.ontrack = null;
    this.pc.onconnectionstatechange = null;
    this.pc.close();
    this.pc = null;
  }

  /**
   * Take / request the live camera slot.
   * - `take` (default): become live; other phones stand down (keep signaling).
   * - `if-free`: join as standby when someone else is already live.
   */
  async startPublishing(stream: MediaStream, opts?: { mode?: KissCamClaimMode }) {
    if (this.role !== "camera" || this.disposed || !this.channel) return;
    const mode: KissCamClaimMode = opts?.mode ?? "take";
    this.localStream = stream;

    if (mode === "if-free" && this.publisherId && this.publisherId !== this.clientId) {
      this.publishing = false;
      this.handlers.onStandby?.();
      this.handlers.onPublisherChange?.(false, this.publisherId);
      return;
    }

    this.publishing = true;
    const ack = this.waitForPublisherAck(2200);
    await this.send({ type: "claim", mode });
    const publisher = await ack;
    if (this.disposed) return;
    if (publisher && publisher !== this.clientId) {
      this.publishing = false;
      // Keep localStream for instant Go Live / promote later.
      this.closePeerConnection();
      this.handlers.onStandby?.();
      this.handlers.onPublisherChange?.(false, publisher);
      return;
    }
    this.publisherId = this.clientId;
    this.createPeerConnection();
    await this.attachLocalStream(stream);
    this.handlers.onPublisherChange?.(true, this.clientId);
  }

  /** Keep Love / countdown signaling; drop WebRTC so another phone can go live. */
  async stopPublishing() {
    if (this.role !== "camera") return;
    const wasPublishing = this.publishing;
    this.publishing = false;
    this.contentHintApplied = false;
    this.closePeerConnection();
    // Keep localStream so standby can re-publish instantly without re-opening the lens.
    if (wasPublishing && this.channel) {
      await this.send({ type: "standby" });
    }
    this.handlers.onPublisherChange?.(
      false,
      this.publisherId === this.clientId ? null : this.publisherId,
    );
  }

  /** LED: make a standby phone the live camera without dropping its signaling. */
  async promoteCamera(clientId: string) {
    if (this.disposed || !clientId) return;
    if (this.role === "remote") {
      await this.send({ type: "remote-promote", clientId });
      return;
    }
    if (this.role !== "display") return;
    await this.setPublisher(clientId);
    await this.send({ type: "promote", clientId });
  }

  /** LED: publish the active pairing code so mobile remotes show the same QR. */
  setPairingInfo(shortCode: string | null) {
    this.pairingShortCode = shortCode ? shortCode.trim().toUpperCase() : null;
  }

  async broadcastSessionInfo() {
    if (this.role !== "display" || this.disposed || !this.pairingShortCode) return;
    await this.send({
      type: "session-info",
      sessionId: this.sessionId,
      shortCode: this.pairingShortCode,
    });
  }

  async attachLocalStream(stream: MediaStream) {
    this.localStream = stream;
    this.contentHintApplied = false;
    if (!this.pc) return;
    if (this.role === "camera" && !this.publishing) return;
    for (const track of stream.getTracks()) {
      if (track.kind === "video") {
        this.applyContentHintOnce(track);
      }
      const existing = this.pc.getSenders().find((s) => s.track?.kind === track.kind);
      if (existing) {
        await existing.replaceTrack(track);
        if (track.kind === "video") {
          await this.applyVideoProfile(existing, this.qualityController.current);
        }
      } else {
        const sender = this.pc.addTrack(track, stream);
        if (track.kind === "video") {
          await this.applyVideoProfile(sender, this.qualityController.current);
        }
      }
    }
    if (this.role === "camera" && this.publishing) {
      await this.createAndSendOffer();
    }
  }

  /**
   * Swap the outbound video track without tearing down the peer connection.
   * Pass `{ renegotiate: true }` after a loading pause so the LED picks up
   * the live camera again — buttons use signaling; video needs a fresh offer.
   */
  async replaceVideoTrack(track: MediaStreamTrack | null, opts?: { renegotiate?: boolean }) {
    if (!this.pc || (this.role === "camera" && !this.publishing)) return;
    if (track) {
      this.contentHintApplied = false;
      this.applyContentHintOnce(track);
      this.localStream = new MediaStream([track]);
    } else {
      this.localStream = null;
      this.contentHintApplied = false;
    }

    const videoSender =
      this.pc.getSenders().find((s) => s.track?.kind === "video") ??
      this.pc.getSenders().find((s) => s.track == null);

    const needIceRestart =
      this.pc.connectionState === "failed" ||
      this.pc.connectionState === "disconnected" ||
      this.pc.iceConnectionState === "failed" ||
      this.pc.iceConnectionState === "disconnected";

    if (videoSender) {
      await videoSender.replaceTrack(track);
      if (track) {
        await this.applyVideoProfile(videoSender, this.qualityController.current);
        const shouldRenegotiate =
          this.role === "camera" &&
          this.publishing &&
          (opts?.renegotiate === true || needIceRestart);
        if (shouldRenegotiate) {
          await this.createAndSendOffer(needIceRestart);
        }
      }
      return;
    }

    if (track) {
      const newSender = this.pc.addTrack(track, this.localStream ?? new MediaStream([track]));
      await this.applyVideoProfile(newSender, this.qualityController.current);
      if (this.role === "camera" && this.publishing) await this.createAndSendOffer(needIceRestart);
    }
  }

  /** Apply contentHint once per track identity — not every stats tick. */
  private applyContentHintOnce(track: MediaStreamTrack) {
    if (this.contentHintApplied && track === this.localStream?.getVideoTracks()[0]) return;
    try {
      // Motion keeps LED playback smoother on venue Wi‑Fi.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (track as any).contentHint = "motion";
      this.contentHintApplied = true;
    } catch {
      // ignore unsupported
    }
  }

  /**
   * Adaptive encode profile via setParameters only — never reconnects / renegotiates
   * solely for quality changes.
   */
  private async applyVideoProfile(sender: RTCRtpSender, profileId: VideoQualityProfile) {
    try {
      await this.preferEfficientCodecs(sender);

      const profile = VIDEO_ENCODING_PROFILES[profileId];
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }

      for (const encoding of params.encodings) {
        encoding.maxBitrate = profile.maxBitrate;
        encoding.maxFramerate = profile.maxFramerate;
        encoding.scaleResolutionDownBy = profile.scaleResolutionDownBy;
        Object.assign(encoding, { priority: "high", networkPriority: "high" });
      }
      // Prefer smooth motion when bandwidth dips — resolution steps via scaleResolutionDownBy.
      Object.assign(params, { degradationPreference: "maintain-framerate" });
      await sender.setParameters(params);
    } catch (error) {
      console.warn("[kiss-cam] could not set adaptive sender params", error);
    }
  }

  private async preferEfficientCodecs(sender: RTCRtpSender) {
    try {
      const capabilities = RTCRtpSender.getCapabilities?.("video");
      if (!capabilities?.codecs?.length) return;
      // H.264 first — hardware encode on iPhone + Samsung; then VP8 for smooth fallback.
      const rank = (mime: string) => {
        const m = mime.toLowerCase();
        if (m.includes("h264")) return 0;
        if (m.includes("vp8")) return 1;
        if (m.includes("vp9")) return 2;
        if (m.includes("av1")) return 3;
        return 9;
      };
      const ordered = [...capabilities.codecs].sort(
        (a, b) => rank(a.mimeType) - rank(b.mimeType),
      );
      const transceiver = this.pc?.getTransceivers().find((t) => t.sender === sender);
      if (transceiver && typeof transceiver.setCodecPreferences === "function") {
        transceiver.setCodecPreferences(ordered);
      }
    } catch {
      // Optional API — ignore.
    }
  }

  private async createAndSendOffer(iceRestart = false) {
    if (!this.pc) return;
    if (this.role === "camera" && !this.publishing) return;
    try {
      this.makingOffer = true;
      const offer = await this.pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
      await this.pc.setLocalDescription(offer);
      if (this.pc.localDescription) {
        await this.send({ type: "offer", sdp: this.pc.localDescription });
      }
    } catch (error) {
      this.handlers.onError?.(
        error instanceof Error ? error.message : "Unable to create connection offer",
      );
    } finally {
      this.makingOffer = false;
    }
  }

  private scheduleIceRestart(delayMs: number) {
    if (this.role !== "camera" || !this.publishing) return;
    if (this.iceRestartTimer) return;
    if (this.iceRestartAttempts >= ICE_RESTART_MAX_ATTEMPTS) {
      // ICE restart budget spent — rebuild PC while keeping signaling (controller-style).
      void this.rebuildMediaLink();
      return;
    }
    this.iceRestartTimer = setTimeout(() => {
      this.iceRestartTimer = null;
      const state = this.pc?.connectionState;
      const stillBroken = state === "failed" || state === "disconnected";
      if (!stillBroken || !this.publishing) return;
      if (this.iceRestartAttempts >= ICE_RESTART_MAX_ATTEMPTS) {
        void this.rebuildMediaLink();
        return;
      }
      // Only surface "reconnecting" once ICE actually needs a restart.
      this.handlers.onConnectionState?.("reconnecting");
      this.iceRestartAttempts += 1;
      void this.tryIceRestart();
    }, delayMs);
  }

  /** True when the peer connection is healthy enough that a re-offer would only churn. */
  private mediaLinkHealthy() {
    const state = this.pc?.connectionState;
    return state === "connected" || state === "connecting";
  }

  private clearIceRestartTimer() {
    if (this.iceRestartTimer) {
      clearTimeout(this.iceRestartTimer);
      this.iceRestartTimer = null;
    }
  }

  private async tryIceRestart() {
    if (this.role !== "camera" || !this.publishing || !this.pc) return;
    try {
      await this.createAndSendOffer(true);
    } catch {
      // Fall through — peer may re-hello / rebuild
    }
  }

  /**
   * Full media reconnect without dropping Supabase signaling (Love/countdown stay up).
   * Mirrors the controller’s “immortal channel” model when WebRTC needs a hard reset.
   */
  private async rebuildMediaLink() {
    if (this.role !== "camera" || !this.publishing || this.disposed) return;
    if (this.mediaRebuildInFlight) return;
    if (this.mediaRebuildAttempts >= MEDIA_REBUILD_MAX) {
      this.handlers.onConnectionState?.("failed");
      this.handlers.onError?.(
        "Camera link could not recover on this Wi‑Fi. Keep Love/countdown; tap Go Live to retry video.",
      );
      return;
    }

    this.mediaRebuildInFlight = true;
    this.mediaRebuildAttempts += 1;
    this.handlers.onConnectionState?.("reconnecting");

    // After the first rebuild, prefer TURN if the venue blocks host candidates.
    if (this.turnConfigured && this.mediaRebuildAttempts >= 1) {
      this.preferRelay = true;
    }

    const stream = this.localStream;
    try {
      this.createPeerConnection();
      if (stream) {
        this.qualityController.reset("medium");
        await this.attachLocalStream(stream);
      } else {
        await this.createAndSendOffer(true);
      }
    } catch (error) {
      this.handlers.onError?.(
        error instanceof Error ? error.message : "Unable to rebuild camera link",
      );
    } finally {
      this.mediaRebuildInFlight = false;
    }
  }

  private isMediaFromPeer(message: SignalMessage) {
    if (this.role === "display") {
      return Boolean(this.publisherId && message.from === this.publisherId);
    }
    return this.publishing;
  }

  private notePresence(message: SignalMessage) {
    if (this.role === "camera" || this.role === "remote") {
      if ("role" in message && message.role === "display") {
        this.lastPeerBeat = Date.now();
        this.handlers.onPeerPresence?.(true);
      }
      return;
    }
    if (this.publisherId && message.from === this.publisherId) {
      this.lastPeerBeat = Date.now();
      this.handlers.onPeerPresence?.(true);
    }
  }

  private async onSignal(message: SignalMessage) {
    if (this.disposed) return;
    if (!message.from || message.from === this.clientId) return;

    if (message.type === "hello") {
      this.notePresence(message);
      if (this.role === "display") {
        if (message.role === "camera") {
          this.upsertCamera(message.from, message.label, false);
          await this.broadcastRoster();
        }
        // Always ack publisher; remotes also get a fresh roster for phone switching.
        await this.send({ type: "publisher", clientId: this.publisherId });
        if (message.role === "remote") {
          await this.broadcastRoster();
          await this.broadcastSessionInfo();
        }
      }
      // Realtime often re-hellos after a brief channel blip. Re-offering while
      // already connected causes renegotiation storms and looks like drop loops.
      if (this.role === "camera" && this.publishing && message.role === "display") {
        if (!this.mediaLinkHealthy()) {
          const iceRestart =
            this.pc?.connectionState === "failed" ||
            this.pc?.connectionState === "disconnected";
          await this.createAndSendOffer(iceRestart);
        }
      }
      return;
    }

    if (message.type === "heartbeat") {
      this.notePresence(message);
      if (this.role === "display" && message.role === "camera") {
        this.upsertCamera(message.from, message.label, Boolean(message.publishing));
      }
      return;
    }

    if (message.type === "claim" && this.role === "display") {
      const mode: KissCamClaimMode = message.mode ?? "take";
      if (mode === "if-free" && this.publisherId && this.publisherId !== message.from) {
        this.upsertCamera(message.from, undefined, false);
        await this.send({ type: "publisher", clientId: this.publisherId });
        await this.broadcastRoster();
        return;
      }
      this.upsertCamera(message.from, undefined, true);
      await this.setPublisher(message.from);
      return;
    }

    if (message.type === "standby" && this.role === "display") {
      this.upsertCamera(message.from, undefined, false);
      if (this.publisherId === message.from) {
        await this.setPublisher(null);
      } else {
        await this.broadcastRoster();
      }
      return;
    }

    if (message.type === "remote-promote" && this.role === "display") {
      await this.promoteCamera(message.clientId);
      return;
    }

    if (message.type === "session-info" && this.role === "remote") {
      this.handlers.onSessionInfo?.({
        sessionId: message.sessionId,
        shortCode: message.shortCode,
      });
      return;
    }

    if (message.type === "promote" && this.role === "camera") {
      if (message.clientId === this.clientId) {
        this.handlers.onPromote?.();
      }
      return;
    }

    if (message.type === "roster") {
      if (this.role === "remote") {
        const cameras: KissCamCameraPeer[] = (message.cameras ?? []).map((cam) => ({
          clientId: cam.clientId,
          label: cam.label,
          publishing: cam.publishing,
          lastBeat: Date.now(),
        }));
        for (const cam of cameras) {
          this.cameras.set(cam.clientId, {
            label: cam.label,
            publishing: cam.publishing,
            lastBeat: cam.lastBeat,
          });
        }
        // Drop cameras no longer listed.
        for (const id of [...this.cameras.keys()]) {
          if (!cameras.some((c) => c.clientId === id)) this.cameras.delete(id);
        }
        this.handlers.onRoster?.(this.rosterList(), this.publisherId);
      }
      return;
    }

    if (message.type === "publisher" && (this.role === "camera" || this.role === "remote")) {
      this.publisherId = message.clientId;
      this.lastPeerBeat = Date.now();
      this.handlers.onPeerPresence?.(true);
      const selfIsPublisher = message.clientId === this.clientId;
      this.handlers.onPublisherChange?.(selfIsPublisher, message.clientId);
      this.resolvePublisherWaiters(message.clientId);
      if (this.role === "remote") {
        this.handlers.onRoster?.(this.rosterList(), message.clientId);
        return;
      }
      if (!selfIsPublisher && this.publishing) {
        this.publishing = false;
        this.closePeerConnection();
        this.handlers.onStandby?.();
      }
      return;
    }

    if (message.type === "bye") {
      if (this.role === "display") {
        this.cameras.delete(message.from);
        if (this.publisherId === message.from) {
          await this.setPublisher(null);
        } else {
          await this.broadcastRoster();
        }
      }
      return;
    }

    if (message.type === "control") {
      this.handlers.onControl?.(message.action);
      return;
    }

    if (message.type === "offer" && this.role === "display" && !this.publisherId && message.from) {
      this.publisherId = message.from;
    }

    if (!this.pc || !this.isMediaFromPeer(message)) return;

    try {
      if (message.type === "offer" || message.type === "answer") {
        const description = message.sdp;
        const offerCollision =
          description.type === "offer" &&
          (this.makingOffer || this.pc.signalingState !== "stable");

        this.ignoreOffer = !this.polite && offerCollision;
        if (this.ignoreOffer) return;

        this.isSettingRemoteAnswerPending = description.type === "answer";
        await this.pc.setRemoteDescription(description);
        this.isSettingRemoteAnswerPending = false;

        if (description.type === "offer") {
          await this.pc.setLocalDescription(await this.pc.createAnswer());
          if (this.pc.localDescription) {
            await this.send({ type: "answer", sdp: this.pc.localDescription });
          }
        }
      } else if (message.type === "ice") {
        try {
          await this.pc.addIceCandidate(message.candidate);
        } catch (error) {
          if (!this.ignoreOffer && !this.isSettingRemoteAnswerPending) {
            throw error;
          }
        }
      }
    } catch (error) {
      this.handlers.onError?.(
        error instanceof Error ? error.message : "Signaling error",
      );
    }
  }

  private async setPublisher(clientId: string | null) {
    const changed = this.publisherId !== clientId;
    this.publisherId = clientId;
    if (clientId) {
      this.upsertCamera(clientId, undefined, true);
      for (const [id, meta] of this.cameras) {
        if (id !== clientId && meta.publishing) {
          this.cameras.set(id, { ...meta, publishing: false });
        }
      }
    }
    if (changed) {
      // New PC for the next publisher. Keep the last LED frame until ontrack
      // delivers the new stream (instant visual switch, no black flash).
      this.createPeerConnection();
      this.handlers.onPeerPresence?.(Boolean(clientId));
      this.handlers.onPublisherChange?.(false, clientId);
      if (!clientId) {
        this.lastPeerBeat = 0;
        this.handlers.onRemoteStream?.(null);
      }
    } else {
      // Same publisher re-claimed (phone remount / Start again) — keep PC, refresh ack.
      this.handlers.onPeerPresence?.(Boolean(clientId));
    }
    await this.send({ type: "publisher", clientId });
    await this.broadcastRoster();
  }

  private upsertCamera(clientId: string, label: string | undefined, publishing: boolean) {
    if (this.role !== "display") return;
    const prev = this.cameras.get(clientId);
    this.cameras.set(clientId, {
      label: label?.trim() || prev?.label || `Phone ${clientId.slice(0, 4)}`,
      publishing,
      lastBeat: Date.now(),
    });
    this.emitRoster();
  }

  private rosterList(): KissCamCameraPeer[] {
    return [...this.cameras.entries()]
      .map(([clientId, meta]) => ({
        clientId,
        label: meta.label,
        publishing: meta.publishing || this.publisherId === clientId,
        lastBeat: meta.lastBeat,
      }))
      .sort((a, b) => {
        if (a.publishing !== b.publishing) return a.publishing ? -1 : 1;
        return a.label.localeCompare(b.label);
      });
  }

  private emitRoster() {
    if (this.role !== "display") return;
    this.handlers.onRoster?.(this.rosterList(), this.publisherId);
  }

  private async broadcastRoster() {
    if (this.role !== "display") return;
    this.emitRoster();
    const cameras = this.rosterList().map(({ clientId, label, publishing }) => ({
      clientId,
      label,
      publishing,
    }));
    await this.send({ type: "roster", cameras });
  }

  private waitForPublisherAck(ms: number) {
    return new Promise<string | null>((resolve) => {
      let settled = false;
      const finish = (id: string | null) => {
        if (settled) return;
        settled = true;
        this.publisherWaiters = this.publisherWaiters.filter((waiter) => waiter !== onAck);
        resolve(id);
      };
      const timer = setTimeout(() => finish(this.publisherId), ms);
      // Any publisher broadcast after our claim is an ack (won or lost).
      const onAck = (id: string | null) => {
        clearTimeout(timer);
        finish(id);
      };
      this.publisherWaiters.push(onAck);
    });
  }

  private resolvePublisherWaiters(id: string | null) {
    // Waiters remove themselves when they settle — do not wipe the list first.
    for (const waiter of [...this.publisherWaiters]) waiter(id);
  }

  private async send(payload: OutgoingSignal) {
    if (!this.channel) return;
    await this.channel.send({
      type: "broadcast",
      event: "signal",
      payload: { ...payload, from: this.clientId },
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      void this.send({
        type: "heartbeat",
        role: this.role,
        ts: Date.now(),
        publishing: this.publishing,
        ...(this.role === "camera" ? { label: this.phoneLabel } : {}),
      });
      // Drop stale roster entries on the LED (standby phones that left silently).
      if (this.role === "display") {
        const now = Date.now();
        let changed = false;
        for (const [id, meta] of this.cameras) {
          if (now - meta.lastBeat > HEARTBEAT_MISS_MS) {
            this.cameras.delete(id);
            changed = true;
            if (this.publisherId === id) {
              void this.setPublisher(null);
            }
          }
        }
        if (changed) void this.broadcastRoster();
      }
      // Signaling silence only updates presence — never force a WebRTC reconnect.
      // Missed Realtime beats are common on venue Wi‑Fi while media stays up.
      if (this.role === "camera" && this.lastPeerBeat && Date.now() - this.lastPeerBeat > HEARTBEAT_MISS_MS) {
        this.handlers.onPeerPresence?.(false);
      }
      if (
        this.role === "display" &&
        this.publisherId &&
        this.lastPeerBeat &&
        Date.now() - this.lastPeerBeat > HEARTBEAT_MISS_MS
      ) {
        this.handlers.onPeerPresence?.(false);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startStats() {
    this.stopStats();
    // ~1s polls — enough for adaptation, cheap for phones.
    this.statsTimer = setInterval(() => {
      void this.sampleQuality();
    }, 1000);
  }

  private stopStats() {
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
  }

  private async sampleQuality() {
    if (!this.pc || (this.role === "camera" && !this.publishing)) return;
    try {
      const stats = await this.pc.getStats();
      const sample = this.parseNetworkSample(stats);
      const band = classifyNetworkBand(sample);

      // Camera: adapt outbound encode profile (setParameters only — no reconnect).
      if (this.role === "camera") {
        const changed = this.qualityController.observe(sample);
        if (changed) {
          const sender = this.pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) await this.applyVideoProfile(sender, changed);
        }
      }

      const profile =
        this.role === "camera"
          ? this.qualityController.current
          : this.inferReceiveProfile(sample);

      const { score, label } = scoreFromNetwork(band, profile, sample);
      const bitrateKbps =
        sample.mediaBitrateBps != null
          ? Math.round(sample.mediaBitrateBps / 1000)
          : sample.availableBitrateBps != null
            ? Math.round(sample.availableBitrateBps / 1000)
            : null;

      this.handlers.onQuality?.({
        score,
        label,
        bitrateKbps,
        packetLoss: sample.packetLoss,
        profile,
        frameWidth: sample.frameWidth,
        frameHeight: sample.frameHeight,
        framesPerSecond: sample.framesPerSecond,
        rttMs: sample.rttMs,
      });
    } catch {
      this.handlers.onQuality?.({
        score: 0,
        label: "unknown",
        bitrateKbps: null,
        packetLoss: null,
        profile: null,
        frameWidth: null,
        frameHeight: null,
        framesPerSecond: null,
        rttMs: null,
      });
    }
  }

  private parseNetworkSample(stats: RTCStatsReport): NetworkSample {
    let rttMs: number | null = null;
    let availableBitrateBps: number | null = null;
    let mediaBitrateBps: number | null = null;
    let packetLoss: number | null = null;
    let qualityLimitationReason: string | null = null;
    let frameWidth: number | null = null;
    let frameHeight: number | null = null;
    let framesPerSecond: number | null = null;

    stats.forEach((report) => {
      if (report.type === "candidate-pair" && (report as { state?: string }).state === "succeeded") {
        const pair = report as {
          currentRoundTripTime?: number;
          availableOutgoingBitrate?: number;
          nominated?: boolean;
        };
        if (pair.nominated !== false) {
          if (typeof pair.currentRoundTripTime === "number") {
            rttMs = Math.round(pair.currentRoundTripTime * 1000);
          }
          if (typeof pair.availableOutgoingBitrate === "number") {
            availableBitrateBps = pair.availableOutgoingBitrate;
          }
        }
      }

      if (report.type === "outbound-rtp" && (report as { kind?: string }).kind === "video") {
        const out = report as {
          bytesSent?: number;
          timestamp?: number;
          packetsSent?: number;
          frameWidth?: number;
          frameHeight?: number;
          framesPerSecond?: number;
          qualityLimitationReason?: string;
        };
        if (typeof out.bytesSent === "number" && typeof out.timestamp === "number") {
          const prev = this.prevOutboundBytes;
          if (prev) {
            const dt = (out.timestamp - prev.ts) / 1000;
            if (dt > 0) {
              mediaBitrateBps = ((out.bytesSent - prev.bytes) * 8) / dt;
            }
          }
          this.prevOutboundBytes = { bytes: out.bytesSent, ts: out.timestamp };
        }
        if (typeof out.packetsSent === "number") {
          this.prevPacketsSent = out.packetsSent;
        }
        if (typeof out.frameWidth === "number") frameWidth = out.frameWidth;
        if (typeof out.frameHeight === "number") frameHeight = out.frameHeight;
        if (typeof out.framesPerSecond === "number") framesPerSecond = out.framesPerSecond;
        if (typeof out.qualityLimitationReason === "string") {
          qualityLimitationReason = out.qualityLimitationReason;
        }
      }

      // Camera-side loss is reported on remote-inbound-rtp (RTCP feedback).
      if (report.type === "remote-inbound-rtp" && (report as { kind?: string }).kind === "video") {
        const remote = report as {
          packetsLost?: number;
          roundTripTime?: number;
          fractionLost?: number;
        };
        if (typeof remote.fractionLost === "number") {
          packetLoss = remote.fractionLost;
        } else if (typeof remote.packetsLost === "number" && this.prevPacketsSent > 0) {
          const lostDelta = remote.packetsLost - this.prevPacketsLost;
          // Approximate loss rate over the interval using cumulative counters.
          if (lostDelta >= 0) {
            packetLoss = Math.min(1, lostDelta / Math.max(1, this.prevPacketsSent));
          }
          this.prevPacketsLost = remote.packetsLost;
        }
        if (rttMs == null && typeof remote.roundTripTime === "number") {
          rttMs = Math.round(remote.roundTripTime * 1000);
        }
      }

      if (report.type === "inbound-rtp" && (report as { kind?: string }).kind === "video") {
        const inn = report as {
          bytesReceived?: number;
          timestamp?: number;
          packetsLost?: number;
          packetsReceived?: number;
          frameWidth?: number;
          frameHeight?: number;
          framesPerSecond?: number;
          jitter?: number;
        };
        if (typeof inn.bytesReceived === "number" && typeof inn.timestamp === "number") {
          const prev = this.prevInboundBytes;
          if (prev) {
            const dt = (inn.timestamp - prev.ts) / 1000;
            if (dt > 0) {
              // Prefer outbound bitrate when camera; inbound fills display role.
              if (this.role === "display" || mediaBitrateBps == null) {
                mediaBitrateBps = ((inn.bytesReceived - prev.bytes) * 8) / dt;
              }
            }
          }
          this.prevInboundBytes = { bytes: inn.bytesReceived, ts: inn.timestamp };
        }
        if (
          typeof inn.packetsReceived === "number" &&
          typeof inn.packetsLost === "number" &&
          this.role === "display"
        ) {
          const recvDelta = inn.packetsReceived - this.prevPacketsReceived;
          const lostDelta = inn.packetsLost - this.prevPacketsLost;
          if (recvDelta + lostDelta > 0) {
            packetLoss = Math.max(0, lostDelta) / (recvDelta + Math.max(0, lostDelta));
          }
          this.prevPacketsReceived = inn.packetsReceived;
          this.prevPacketsLost = inn.packetsLost;
        }
        if (typeof inn.frameWidth === "number") frameWidth = inn.frameWidth;
        if (typeof inn.frameHeight === "number") frameHeight = inn.frameHeight;
        if (typeof inn.framesPerSecond === "number") framesPerSecond = inn.framesPerSecond;
      }
    });

    return {
      rttMs,
      packetLoss,
      availableBitrateBps,
      mediaBitrateBps,
      qualityLimitationReason,
      frameWidth,
      frameHeight,
      framesPerSecond,
    };
  }

  /** Map received resolution to a profile class for display-side UI labels. */
  private inferReceiveProfile(sample: NetworkSample): VideoQualityProfile {
    const h = sample.frameHeight;
    if (h != null) {
      if (h >= 1000) return "ultra";
      if (h >= 700) return "high";
      if (h >= 500) return "medium";
      return "low";
    }
    return "high";
  }

  async dispose() {
    this.disposed = true;
    this.publishing = false;
    this.stopHeartbeat();
    this.stopStats();
    this.clearIceRestartTimer();
    this.qualityController.reset("medium");
    this.preferRelay = false;
    this.mediaRebuildAttempts = 0;
    this.mediaRebuildInFlight = false;
    this.contentHintApplied = false;
    this.prevOutboundBytes = null;
    this.prevInboundBytes = null;
    try {
      await this.send({ type: "bye" });
    } catch {
      // ignore
    }
    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.closePeerConnection();
    this.handlers.onRemoteStream?.(null);
  }

  async sendControl(action: KissCamControlAction) {
    await this.send({ type: "control", action });
  }
}
