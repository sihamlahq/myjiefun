"use client";

import { cn } from "@/lib/utils";
import type { ConnectionQuality } from "@/components/kiss-cam/kiss-cam-types";

export function KissCamSignalBars({
  quality,
  className,
}: {
  quality: ConnectionQuality | null;
  className?: string;
}) {
  const score = quality?.score ?? 0;
  const bars = score >= 85 ? 4 : score >= 70 ? 3 : score >= 45 ? 2 : score > 0 ? 1 : 0;
  const color =
    quality?.label === "excellent" || quality?.label === "good"
      ? "bg-emerald-500"
      : quality?.label === "fair"
        ? "bg-amber-500"
        : quality?.label === "poor"
          ? "bg-rose-600"
          : "bg-stone-300";

  return (
    <div className={cn("inline-flex items-end gap-0.5", className)} title={qualityLabel(quality)}>
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className={cn(
            "w-1 rounded-sm transition-colors",
            n <= bars ? color : "bg-stone-300/70",
          )}
          style={{ height: 4 + n * 3 }}
        />
      ))}
      <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground)]/55">
        {qualityLabel(quality)}
        {quality?.bitrateKbps != null ? ` · ${quality.bitrateKbps} kbps` : ""}
      </span>
    </div>
  );
}

function qualityLabel(quality: ConnectionQuality | null) {
  if (!quality || quality.label === "unknown") return "No signal";
  return quality.label;
}

export function CameraStatusDot({
  state,
}: {
  state: "waiting" | "connecting" | "connected" | "disconnected" | "reconnecting";
}) {
  const filled = state === "connected";
  const label =
    state === "connected"
      ? "Connected"
      : state === "connecting"
        ? "Connecting"
        : state === "reconnecting"
          ? "Reconnecting"
          : state === "disconnected"
            ? "Disconnected"
            : "Waiting";
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium">
      <span
        className={cn(
          "inline-block h-2.5 w-2.5 rounded-full",
          filled && "bg-emerald-500",
          state === "waiting" && "border-2 border-stone-400 bg-transparent",
          state === "connecting" && "animate-pulse bg-amber-400",
          state === "reconnecting" && "animate-pulse bg-amber-500",
          state === "disconnected" && "border-2 border-rose-500 bg-transparent",
        )}
      />
      Camera: {label}
    </span>
  );
}
