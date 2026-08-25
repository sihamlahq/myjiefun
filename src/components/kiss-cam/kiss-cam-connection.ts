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
  | "countdown-3";

type SignalMessage =
  | { type: "hello"; role: "display" | "camera" }
  | { type: "heartbeat"; role: "display" | "camera"; ts: number }
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit }
  | { type: "bye" }
  | { type: "control"; action: KissCamControlAction };

type Handlers = {
  onRemoteStream?: (stream: MediaStream | null) => void;
  onConnectionState?: (state: RTCPeerConnectionState | "reconnecting") => void;
  onPeerPresence?: (present: boolean) => void;
  onQuality?: (quality: ConnectionQuality) => void;
  onError?: (message: string) => void;
  onControl?: (action: KissCamControlAction) => void;
};

/**
 * Perfect negotiation: display is polite, camera (offerer of media) is impolite.
 * Camera creates the offer when it has a local stream.
 */
export class KissCamConnection {
  private pc: RTCPeerConnection | null = null;
  private channel: RealtimeChannel | null = null;
  private makingOffer = false;
  private ignoreOffer = false;
  private isSettingRemoteAnswerPending = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private statsTimer: ReturnType<typeof setInterval> | null = null;
  private lastPeerBeat = 0;
  private localStream: MediaStream | null = null;
  private disposed = false;
  /** Adaptive encode profile — camera role only; changes via setParameters. */
  private qualityController = new AdaptiveVideoQualityController({
    initialProfile: "high",
    downgradeHoldSamples: 3,
    upgradeHoldSamples: 6,
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
    private role: "display" | "camera",
    private handlers: Handlers = {},
  ) {}

  get polite() {
    return this.role === "display";
  }

  async connect() {
    this.disposed = false;
    const { iceServers } = await fetchIceServers();
    this.pc = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 8,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        void this.send({ type: "ice", candidate: event.candidate.toJSON() });
      }
    };

    this.pc.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      // ReplaceTrack resume does not fire ontrack again — listen for unmute
      // so the LED rebinds when the camera comes back after loading.
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

    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      if (!state) return;
      if (state === "failed" || state === "disconnected") {
        this.handlers.onConnectionState?.("reconnecting");
        void this.tryIceRestart();
      } else {
        this.handlers.onConnectionState?.(state);
      }
    };

    this.channel = this.supabase.channel(signalingChannelName(this.sessionId), {
      config: { broadcast: { self: false } },
    });

    this.channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      void this.onSignal(payload as SignalMessage);
    });

    // Wait until Realtime is actually subscribed before sending offers/controls.
    // Otherwise the first camera offer is often dropped while buttons later work.
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Kiss Cam signaling timed out. Check the network and try again."));
      }, 12_000);

      this.channel!.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          void this.send({ type: "hello", role: this.role });
          this.startHeartbeat();
          resolve();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          clearTimeout(timeout);
          reject(new Error(`Kiss Cam signaling failed (${status}).`));
        }
      });
    });

    if (this.disposed) return;

    if (this.role === "camera" && this.localStream) {
      await this.attachLocalStream(this.localStream);
    }

    this.startStats();
  }

  get alive() {
    return (
      !this.disposed &&
      this.pc != null &&
      this.channel != null &&
      this.pc.connectionState !== "closed"
    );
  }

  async attachLocalStream(stream: MediaStream) {
    this.localStream = stream;
    this.contentHintApplied = false;
    if (!this.pc) return;
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
    if (this.role === "camera") {
      await this.createAndSendOffer();
    }
  }

  /**
   * Swap the outbound video track without tearing down the peer connection.
   * Pass `{ renegotiate: true }` after a loading pause so the LED picks up
   * the live camera again — buttons use signaling; video needs a fresh offer.
   */
  async replaceVideoTrack(track: MediaStreamTrack | null, opts?: { renegotiate?: boolean }) {
    if (!this.pc) return;
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
          this.role === "camera" && (opts?.renegotiate === true || needIceRestart);
        if (shouldRenegotiate) {
          await this.createAndSendOffer(needIceRestart);
        }
      }
      return;
    }

    if (track) {
      const newSender = this.pc.addTrack(track, this.localStream ?? new MediaStream([track]));
      await this.applyVideoProfile(newSender, this.qualityController.current);
      if (this.role === "camera") await this.createAndSendOffer(needIceRestart);
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

  private async tryIceRestart() {
    if (this.role !== "camera" || !this.pc) return;
    try {
      await this.createAndSendOffer(true);
    } catch {
      // Fall through — peer may re-hello
    }
  }

  private async onSignal(message: SignalMessage) {
    if (!this.pc || this.disposed) return;

    if (message.type === "hello") {
      this.lastPeerBeat = Date.now();
      this.handlers.onPeerPresence?.(true);
      if (this.role === "camera" && this.localStream) {
        await this.createAndSendOffer();
      }
      return;
    }

    if (message.type === "heartbeat") {
      this.lastPeerBeat = Date.now();
      this.handlers.onPeerPresence?.(true);
      return;
    }

    if (message.type === "bye") {
      this.handlers.onPeerPresence?.(false);
      this.handlers.onRemoteStream?.(null);
      return;
    }

    if (message.type === "control") {
      this.handlers.onControl?.(message.action);
      return;
    }

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

  private async send(payload: SignalMessage) {
    if (!this.channel) return;
    await this.channel.send({
      type: "broadcast",
      event: "signal",
      payload,
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      void this.send({ type: "heartbeat", role: this.role, ts: Date.now() });
      if (this.lastPeerBeat && Date.now() - this.lastPeerBeat > 8000) {
        this.handlers.onPeerPresence?.(false);
        this.handlers.onConnectionState?.("reconnecting");
      }
    }, 2500);
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
    if (!this.pc) return;
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
    this.stopHeartbeat();
    this.stopStats();
    this.qualityController.reset("high");
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
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.handlers.onRemoteStream?.(null);
  }

  async sendControl(action: KissCamControlAction) {
    await this.send({ type: "control", action });
  }
}
