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
