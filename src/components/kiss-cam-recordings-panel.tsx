"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Eye, Loader2, RefreshCw, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { KissCamRecordingListItem } from "@/lib/kiss-cam/recording";

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

export function KissCamRecordingsPanel() {
  const [recordings, setRecordings] = useState<KissCamRecordingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{
    id: string;
    url: string;
    fileName: string;
  } | null>(null);

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

  async function fetchSigned(id: string) {
    const res = await fetch(`/api/kiss-cam/recording/${id}`, { cache: "no-store" });
    const json = (await res.json()) as {
      url?: string;
      fileName?: string;
      error?: string;
    };
    if (!res.ok || !json.url) {
      throw new Error(json.error || "Unable to open recording");
    }
    return {
      url: json.url,
      fileName: json.fileName || `kiss-cam-${id}.webm`,
    };
  }

  async function onView(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const signed = await fetchSigned(id);
      setViewer({ id, ...signed });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open recording");
    } finally {
      setBusyId(null);
    }
  }

  async function onDownload(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const signed = await fetchSigned(id);
      const anchor = document.createElement("a");
      anchor.href = signed.url;
      anchor.download = signed.fileName;
      anchor.rel = "noopener";
      anchor.target = "_blank";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
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
      setViewer((prev) => (prev?.id === id ? null : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete recording");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Recorded clips</CardTitle>
            <CardDescription>
              Auto-saved when a phone goes live. View, download, or delete from here.
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
                      {item.mimeType ? ` · ${item.mimeType}` : ""}
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
                      <Download className="h-3.5 w-3.5" />
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
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Kiss Cam video preview"
          onClick={() => setViewer(null)}
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
                  onClick={() => void onDownload(viewer.id)}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setViewer(null)}>
                  Close
                </Button>
              </div>
            </div>
            <video
              key={viewer.url}
              src={viewer.url}
              controls
              playsInline
              autoPlay
              className="aspect-video max-h-[min(70vh,720px)] w-full bg-black object-contain"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
