import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  canEncodeVideo,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
} from "mediabunny";

/**
 * Transcode a WebM (or other) blob to MP4/H.264 for iPhone Photos.
 * Requires a browser that can decode the source and encode AVC (typically Chrome/desktop).
 * Returns null if conversion isn't possible.
 */
export async function convertRecordingToIphoneMp4(
  sourceBlob: Blob,
  onProgress?: (progress: number) => void,
): Promise<Blob | null> {
  if (sourceBlob.size <= 0) return null;
  if ((sourceBlob.type || "").toLowerCase().includes("mp4")) {
    return sourceBlob;
  }

  try {
    if (typeof VideoEncoder === "undefined") return null;
    const canAvc = await canEncodeVideo("avc");
    if (!canAvc) return null;

    const input = new Input({
      source: new BlobSource(sourceBlob),
      formats: ALL_FORMATS,
    });
    const target = new BufferTarget();
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: "in-memory" }),
      target,
    });

    const conversion = await Conversion.init({
      input,
      output,
      // Always re-encode — WebM VP8/VP9 cannot be copied into MP4.
      copy: false,
      video: {
        codec: "avc",
        bitrate: 2_500_000,
        keyFrameInterval: 2,
      },
      audio: {
        // Kiss Cam recordings are video-only; discard any stray audio.
        discard: true,
      },
      showWarnings: false,
    });

    if (!conversion.isValid) {
      await conversion.cancel().catch(() => undefined);
      return null;
    }

    if (onProgress) {
      conversion.onProgress = (progress) => {
        onProgress(progress);
      };
    }

    await conversion.execute();
    const buffer = target.buffer;
    if (!buffer || buffer.byteLength <= 0) return null;
    return new Blob([buffer], { type: "video/mp4" });
  } catch {
    return null;
  }
}
