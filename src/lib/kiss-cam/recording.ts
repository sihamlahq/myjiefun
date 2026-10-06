/** Hard cap matching the Storage bucket file_size_limit (50 MiB). */
export const KISS_CAM_RECORDING_MAX_BYTES = 50 * 1024 * 1024;

export const KISS_CAM_RECORDING_BUCKET = "kiss-cam-recordings";

export const KISS_CAM_RECORDING_MIME = [
  "video/webm",
  "video/mp4",
  "video/quicktime",
] as const;

export type KissCamRecordingListItem = {
  id: string;
  sessionId: string;
  shortCode: string | null;
  storagePath: string;
  bytes: number | null;
  mimeType: string | null;
  status: "pending" | "ready" | "failed";
  createdAt: string;
};

/** iPhone Photos / Safari play MP4 (H.264) and QuickTime — not WebM/VP8/VP9. */
export function isIphonePlayableMime(mimeType: string | null | undefined): boolean {
  const mime = (mimeType || "").toLowerCase();
  return mime.includes("mp4") || mime.includes("quicktime");
}

export function recordingFileExtension(mimeType: string | null | undefined): "mp4" | "webm" {
  return isIphonePlayableMime(mimeType) ? "mp4" : "webm";
}

export function recordingFormatLabel(mimeType: string | null | undefined): string {
  const mime = (mimeType || "").toLowerCase();
  if (mime.includes("mp4")) return "MP4";
  if (mime.includes("quicktime")) return "MOV";
  if (mime.includes("webm")) return "WebM";
  return mimeType || "Unknown";
}
