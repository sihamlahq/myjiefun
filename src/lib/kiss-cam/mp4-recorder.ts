import {
  BufferTarget,
  canEncodeVideo,
  MediaStreamVideoTrackSource,
  Mp4OutputFormat,
  Output,
} from "mediabunny";

const DEFAULT_BITRATE = 2_500_000;

export async function canRecordIphoneMp4(
  width = 1280,
  height = 720,
  frameRate = 30,
): Promise<boolean> {
  try {
    if (typeof VideoEncoder === "undefined") return false;
    return await canEncodeVideo("avc", {
      width,
      height,
      bitrate: DEFAULT_BITRATE,
      frameRate,
    });
  } catch {
    return false;
  }
}

export type KissCamMp4Recorder = {
  /** Finalize and return an iPhone-playable MP4 blob. */
  stop: () => Promise<Blob>;
  /** Abort without producing a file. */
  cancel: () => Promise<void>;
};

/**
 * Record a MediaStream video track to MP4/H.264 (AVC) via WebCodecs.
 * This is what iPhone Photos can open — unlike MediaRecorder WebM on Chrome/Android.
 */
export async function startKissCamMp4Recorder(
  track: MediaStreamVideoTrack,
  opts?: { bitrate?: number; frameRate?: number },
): Promise<KissCamMp4Recorder> {
  const settings = track.getSettings();
  const width = Math.max(2, Math.floor(settings.width || 1280));
  const height = Math.max(2, Math.floor(settings.height || 720));
  const frameRate =
    opts?.frameRate ??
    (typeof settings.frameRate === "number" && settings.frameRate > 0
      ? Math.min(30, Math.round(settings.frameRate))
      : 30);
  const bitrate = opts?.bitrate ?? DEFAULT_BITRATE;

  const supported = await canEncodeVideo("avc", {
    width,
    height,
    bitrate,
    frameRate,
  });
  if (!supported) {
    throw new Error("This phone cannot encode MP4/H.264");
  }

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });

  const source = new MediaStreamVideoTrackSource(
    track,
    {
      codec: "avc",
      bitrate,
      keyFrameInterval: 2,
      sizeChangeBehavior: "contain",
    },
    { frameRate },
  );

  output.addVideoTrack(source);
  await output.start();

  let settled = false;

  return {
    async stop() {
      if (settled) return new Blob([], { type: "video/mp4" });
      settled = true;
      await output.finalize();
      const buffer = target.buffer;
      if (!buffer || buffer.byteLength <= 0) {
        return new Blob([], { type: "video/mp4" });
      }
      return new Blob([buffer], { type: "video/mp4" });
    },
    async cancel() {
      if (settled) return;
      settled = true;
      await output.cancel();
    },
  };
}
