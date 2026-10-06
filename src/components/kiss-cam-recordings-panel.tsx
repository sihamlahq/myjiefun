"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Eye, Loader2, RefreshCw, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { KissCamRecordingListItem } from "@/lib/kiss-cam/recording";
import {
  isIphonePlayableMime,
  recordingFileExtension,
  recordingFormatLabel,
} from "@/lib/kiss-cam/recording";

function formatBytes(bytes: number | null) {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusLabel(status: KissCamRecordingListItem["status"]) {
  if (status === "ready") return "Ready";
  if (status === "pending") return "Uploading";
  return "Failed";
}

type ViewerState = {
  id: string;
  url: string | null;
  fileName: string;
  mimeType: string | null;
  phase: "loading-url" | "buffering" | "ready" | "error";
  error?: string;
};

export function KissCamRecordingsPanel() {
  const [recordings, setRecordings] = useState<KissCamRecordingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const closeViewer = useCallback(() => {
    revokeObjectUrl();
    setViewer(null);
  }, [revokeObjectUrl]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kiss-cam/recording", { cache: "no-store" });
      const json = (await res.json()) as {
        recordings?: KissCamRecordingListItem[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Unable to load recordings");
      setRecordings(json.recordings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load recordings");
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!viewer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeViewer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer, closeViewer]);

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

  async function fetchSigned(id: string, opts?: { download?: boolean }) {
    const qs = opts?.download ? "?download=1" : "";
    const res = await fetch(`/api/kiss-cam/recording/${id}${qs}`, { cache: "no-store" });
    const json = (await res.json()) as {
      url?: string;
      fileName?: string;
      mimeType?: string | null;
      error?: string;
    };
    if (!res.ok || !json.url) {
      throw new Error(json.error || "Unable to open recording");
    }
    return {
      url: json.url,
      fileName: json.fileName || `kiss-cam-${id}.webm`,
      mimeType: json.mimeType ?? null,
    };
  }

  async function onView(id: string) {
    const item = recordings.find((row) => row.id === id);
    const fallbackName = item
      ? `kiss-cam-${item.shortCode || id.slice(0, 8)}.${recordingFileExtension(item.mimeType)}`
      : `kiss-cam-${id}.webm`;

    revokeObjectUrl();
    // Open the modal immediately so the click feels responsive.
    setViewer({
      id,
      url: null,
      fileName: fallbackName,
      mimeType: item?.mimeType ?? null,
      phase: "loading-url",
    });
    setBusyId(id);
    setError(null);

    try {
      const signed = await fetchSigned(id);
      setViewer({
        id,
        url: signed.url,
        fileName: signed.fileName,
        mimeType: signed.mimeType ?? item?.mimeType ?? null,
        phase: "buffering",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to open recording";
      setViewer({
        id,
        url: null,
        fileName: fallbackName,
        mimeType: item?.mimeType ?? null,
        phase: "error",
        error: message,
      });
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  // Explicit play once the signed URL is attached. Autoplay often fails after
  // the async signed-URL fetch (user-gesture already expired).
  useEffect(() => {
    if (!viewer?.url) return;
    const el = videoRef.current;
    if (!el) return;
    const viewerId = viewer.id;
    const viewerUrl = viewer.url;

    let cancelled = false;
    const markReady = () => {
      if (!cancelled) {
        setViewer((prev) =>
          prev && prev.id === viewerId && prev.url === viewerUrl && prev.phase !== "error"
            ? { ...prev, phase: "ready" }
            : prev,
        );
      }
    };

    const tryPlay = () => {
      void el
        .play()
        .then(markReady)
        .catch(() => {
          // Autoplay blocked — controls are visible; user can press play.
          markReady();
        });
    };

    const onReadyEnough = () => tryPlay();
    const onError = () => {
      if (cancelled) return;
      setViewer((prev) =>
        prev && prev.id === viewerId
          ? {
              ...prev,
              phase: "error",
              error: "Unable to play this clip. Try Download instead.",
            }
          : prev,
      );
    };

    el.addEventListener("loadeddata", onReadyEnough);
    el.addEventListener("canplay", onReadyEnough);
    el.addEventListener("error", onError);
    const safety = window.setTimeout(markReady, 12_000);
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      tryPlay();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      el.removeEventListener("loadeddata", onReadyEnough);
      el.removeEventListener("canplay", onReadyEnough);
      el.removeEventListener("error", onError);
    };
    // Only re-bind when the clip URL changes — not when phase flips to ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [viewer?.id, viewer?.url]);

  async function onDownload(id: string) {
    const item = recordings.find((row) => row.id === id);
    if (item && !isIphonePlayableMime(item.mimeType)) {
      const ok = confirm(
        "This clip is WebM (common when recorded from Android/Chrome).\n\n" +
          "iPhone Photos and Safari cannot play WebM. It will play on Mac/Windows/Android, or after converting to MP4 (e.g. with VLC).\n\n" +
          "Download anyway?",
      );
      if (!ok) return;
    }

    setBusyId(id);
    setError(null);
    try {
      // Cross-origin Supabase URLs ignore <a download>, so fetch as a blob
      // (same-origin object URL) and/or use a signed URL with attachment disposition.
      const signed = await fetchSigned(id, { download: true });
      let objectUrl: string | null = null;
      try {
        const fileRes = await fetch(signed.url);
        if (!fileRes.ok) {
          throw new Error(`Download failed (${fileRes.status})`);
        }
        const blob = await fileRes.blob();
        objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = signed.fileName;
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } catch {
        // Fallback: open attachment-disposition signed URL (no SPA navigation).
        const anchor = document.createElement("a");
        anchor.href = signed.url;
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } finally {
        if (objectUrl) {
          // Revoke after the browser has a chance to start the download.
          window.setTimeout(() => URL.revokeObjectURL(objectUrl!), 60_000);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download recording");
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(id: string) {
    if (
      !confirm(
        "Delete this Kiss Cam video permanently? This cannot be undone.",
      )
    ) {
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/kiss-cam/recording/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Unable to delete recording");
      setRecordings((prev) => prev.filter((item) => item.id !== id));
      if (viewer?.id === id) closeViewer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete recording");
    } finally {
      setBusyId(null);
    }
  }

  const viewerBusy =
    viewer?.phase === "loading-url" || viewer?.phase === "buffering";

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Recorded clips</CardTitle>
            <CardDescription>
              Auto-saved when a phone goes live. MP4 clips play on iPhone; WebM does not
              (convert or open on Mac/Android).
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
          ) : null}

          {loading && !recordings.length ? (
            <p className="flex items-center gap-2 text-sm text-black/55">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading recordings…
            </p>
          ) : null}

          {!loading && recordings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 bg-black/[0.02] px-4 py-10 text-center">
              <Video className="mx-auto h-8 w-8 text-[var(--primary)]/70" />
              <p className="mt-3 text-sm font-medium">No Kiss Cam videos yet</p>
              <p className="mt-1 text-sm text-black/55">
                Go live from a paired phone — clips upload automatically (up to 50MB).
              </p>
            </div>
          ) : null}

          <ul className="divide-y divide-black/8">
            {recordings.map((item) => {
              const busy = busyId === item.id;
              const ready = item.status === "ready";
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {formatWhen(item.createdAt)}
                      {item.shortCode ? (
                        <span className="ml-2 font-mono text-xs font-medium text-black/50">
                          #{item.shortCode}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-black/55">
                      {statusLabel(item.status)} · {formatBytes(item.bytes)}
                      {item.mimeType ? ` · ${recordingFormatLabel(item.mimeType)}` : ""}
                      {item.status === "ready" ? (
                        <span
                          className={
                            isIphonePlayableMime(item.mimeType)
                              ? "ml-2 text-emerald-700"
                              : "ml-2 text-amber-700"
                          }
                        >
                          {isIphonePlayableMime(item.mimeType)
                            ? "· iPhone OK"
                            : "· not for iPhone Photos"}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!ready || busy}
                      onClick={() => void onView(item.id)}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      View
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={!ready || busy}
                      onClick={() => void onDownload(item.id)}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      Download
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => void onDelete(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {viewer ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Kiss Cam video preview"
          onClick={closeViewer}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-[#1a1014] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-[#fff5f7]">
              <p className="truncate text-sm font-medium">{viewer.fileName}</p>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busyId === viewer.id}
                  onClick={() => void onDownload(viewer.id)}
                >
                  {busyId === viewer.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={closeViewer}>
                  Close
                </Button>
              </div>
            </div>

            <div className="relative bg-black">
              {viewerBusy ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/55 text-sm text-white">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p>
                    {viewer.phase === "loading-url"
                      ? "Opening clip…"
                      : "Buffering video…"}
                  </p>
                </div>
              ) : null}

              {viewer.phase === "error" ? (
                <div className="flex aspect-video max-h-[min(70vh,720px)] w-full flex-col items-center justify-center gap-3 px-6 text-center text-[#fff5f7]">
                  <p className="text-sm">{viewer.error || "Unable to play this clip."}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void onDownload(viewer.id)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download instead
                  </Button>
                </div>
              ) : viewer.url ? (
                <video
                  key={viewer.url}
                  ref={videoRef}
                  src={viewer.url}
                  controls
                  playsInline
                  preload="auto"
                  className="aspect-video max-h-[min(70vh,720px)] w-full bg-black object-contain"
                />
              ) : (
                <div className="aspect-video max-h-[min(70vh,720px)] w-full bg-black" />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
