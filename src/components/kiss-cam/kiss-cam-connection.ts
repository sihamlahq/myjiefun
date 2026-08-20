"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { fetchIceServers } from "@/components/kiss-cam/kiss-cam-ice";
import { signalingChannelName } from "@/components/kiss-cam/kiss-cam-session";
import type { ConnectionQuality } from "@/components/kiss-cam/kiss-cam-types";

type SignalMessage =
  | { type: "hello"; role: "display" | "camera" }
  | { type: "heartbeat"; role: "display" | "camera"; ts: number }
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit }
  | { type: "bye" }
  | { type: "control"; action: "start" | "reset" | "preview" | "love" };

type Handlers = {
  onRemoteStream?: (stream: MediaStream | null) => void;
  onConnectionState?: (state: RTCPeerConnectionState | "reconnecting") => void;
  onPeerPresence?: (present: boolean) => void;
  onQuality?: (quality: ConnectionQuality) => void;
  onError?: (message: string) => void;
  onControl?: (action: "start" | "reset" | "preview" | "love") => void;
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
      iceCandidatePoolSize: 4,
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

    this.channel
      .on("broadcast", { event: "signal" }, ({ payload }) => {
        void this.onSignal(payload as SignalMessage);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void this.send({ type: "hello", role: this.role });
          this.startHeartbeat();
        }
      });

    if (this.role === "camera" && this.localStream) {
      await this.attachLocalStream(this.localStream);
    }

    this.startStats();
  }

  async attachLocalStream(stream: MediaStream) {
    this.localStream = stream;
    if (!this.pc) return;
    for (const track of stream.getTracks()) {
      if (track.kind === "video") {
        try {
          // Motion keeps LED playback smoother on venue Wi‑Fi.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (track as any).contentHint = "motion";
        } catch {
          // ignore unsupported
        }
      }
      const existing = this.pc.getSenders().find((s) => s.track?.kind === track.kind);
      if (existing) {
        await existing.replaceTrack(track);
        if (track.kind === "video") await this.tuneVideoSender(existing);
      } else {
        const sender = this.pc.addTrack(track, stream);
        if (track.kind === "video") await this.tuneVideoSender(sender);
      }
    }
    if (this.role === "camera") {
      await this.createAndSendOffer();
    }
  }

  /**
   * Swap only the outbound video track (camera flip) without tearing down
   * the peer connection. Avoids a full renegotiation when possible.
   */
  async replaceVideoTrack(track: MediaStreamTrack | null) {
    if (!this.pc) return;
    if (track) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (track as any).contentHint = "motion";
      } catch {
        // ignore
      }
      this.localStream = new MediaStream([track]);
    } else {
      this.localStream = null;
    }

    const videoSender =
      this.pc.getSenders().find((s) => s.track?.kind === "video") ??
      this.pc.getSenders().find((s) => s.track == null);

    if (videoSender) {
      await videoSender.replaceTrack(track);
      if (track) await this.tuneVideoSender(videoSender);
      return;
    }

    if (track) {
      const newSender = this.pc.addTrack(track, this.localStream ?? new MediaStream([track]));
      await this.tuneVideoSender(newSender);
      if (this.role === "camera") await this.createAndSendOffer();
    }
  }

  /** Prefer steady 30fps with enough bitrate for a clear 720p/1080p LED feed. */
  private async tuneVideoSender(sender: RTCRtpSender) {
    try {
      await this.preferEfficientCodecs(sender);

      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      const settings = sender.track?.getSettings?.() ?? {};
      const w = typeof settings.width === "number" ? settings.width : 1280;
      const h = typeof settings.height === "number" ? settings.height : 720;
      const pixels = w * h;
      const maxBitrate =
        pixels >= 1920 * 1080
          ? 4_500_000
          : pixels >= 1280 * 720
            ? 3_000_000
            : 2_000_000;

      for (const encoding of params.encodings) {
        encoding.maxBitrate = maxBitrate;
        encoding.maxFramerate = 30;
        encoding.scaleResolutionDownBy = 1;
        Object.assign(encoding, { priority: "high", networkPriority: "high" });
      }
      // Prefer smooth motion over locking resolution when bandwidth dips.
      Object.assign(params, { degradationPreference: "maintain-framerate" });
      await sender.setParameters(params);
    } catch (error) {
      console.warn("[kiss-cam] could not set HD sender params", error);
    }
  }

  private async preferEfficientCodecs(sender: RTCRtpSender) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const capabilities = (RTCRtpSender as any).getCapabilities?.("video") as
        | { codecs?: Array<{ mimeType: string; [k: string]: unknown }> }
        | undefined;
      if (!capabilities?.codecs?.length) return;
      // Prefer hardware-friendly H264, then VP8 (smooth), then VP9.
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transceiver = this.pc
        ?.getTransceivers()
        .find((t) => t.sender === sender) as any;
      if (transceiver?.setCodecPreferences) {
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
    this.statsTimer = setInterval(() => {
      void this.sampleQuality();
    }, 2000);
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
      let bitrateKbps: number | null = null;
      let packetLoss: number | null = null;
      let packetsLost = 0;
      let packetsReceived = 0;

      stats.forEach((report) => {
        if (report.type === "inbound-rtp" && report.kind === "video") {
          if (typeof report.bytesReceived === "number" && typeof report.timestamp === "number") {
            const key = "_prev";
            const prev = (this as unknown as { [k: string]: { bytes: number; ts: number } })[key];
            if (prev) {
              const dt = (report.timestamp - prev.ts) / 1000;
              if (dt > 0) {
                bitrateKbps = Math.round(((report.bytesReceived - prev.bytes) * 8) / dt / 1000);
              }
            }
            (this as unknown as { [k: string]: { bytes: number; ts: number } })[key] = {
              bytes: report.bytesReceived,
              ts: report.timestamp,
            };
          }
          if (typeof report.packetsLost === "number") packetsLost = report.packetsLost;
          if (typeof report.packetsReceived === "number") packetsReceived = report.packetsReceived;
        }
      });

      if (packetsReceived + packetsLost > 0) {
        packetLoss = packetsLost / (packetsReceived + packetsLost);
      }

      let score = 70;
      if (bitrateKbps != null) {
        if (bitrateKbps > 2000) score = 98;
        else if (bitrateKbps > 1200) score = 90;
        else if (bitrateKbps > 600) score = 75;
        else if (bitrateKbps > 250) score = 55;
        else score = 30;
      }
      if (packetLoss != null) {
        if (packetLoss > 0.08) score = Math.min(score, 25);
        else if (packetLoss > 0.03) score = Math.min(score, 50);
      }

      const label =
        score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 45 ? "fair" : "poor";

      this.handlers.onQuality?.({ score, label, bitrateKbps, packetLoss });
    } catch {
      this.handlers.onQuality?.({
        score: 0,
        label: "unknown",
        bitrateKbps: null,
        packetLoss: null,
      });
    }
  }

  async dispose() {
    this.disposed = true;
    this.stopHeartbeat();
    this.stopStats();
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

  async sendControl(action: "start" | "reset" | "preview" | "love") {
    await this.send({ type: "control", action });
  }
}
