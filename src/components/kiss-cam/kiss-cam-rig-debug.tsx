"use client";

/**
 * Development-only Character Rig Debug helpers for Kiss Cam puppets.
 * Never enabled in production builds.
 */

export function isKissCamRigDebugEnabled(search?: string | null): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.NEXT_PUBLIC_KISS_CAM_RIG_DEBUG === "1") return true;
  if (typeof search === "string" && search.length) {
    try {
      const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
      if (q.get("rigDebug") === "1") return true;
    } catch {
      // ignore
    }
  }
  if (typeof window !== "undefined") {
    try {
      if (new URLSearchParams(window.location.search).get("rigDebug") === "1") return true;
      if (window.localStorage.getItem("kissCamRigDebug") === "1") return true;
    } catch {
      // ignore
    }
  }
  return false;
}

export type RigPivot = {
  id: string;
  label: string;
  /** Percent of puppet stage width/height */
  x: number;
  y: number;
  color?: string;
};

export type RigLayerBox = {
  id: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  color?: string;
};

type KissCamRigDebugOverlayProps = {
  enabled: boolean;
  pivots: RigPivot[];
  layers: RigLayerBox[];
  handTargets?: RigPivot[];
  title?: string;
};

/** Overlay drawn inside a positioned puppet stage (same box as the character). */
export function KissCamRigDebugOverlay({
  enabled,
  pivots,
  layers,
  handTargets = [],
  title,
}: KissCamRigDebugOverlayProps) {
  if (!enabled || process.env.NODE_ENV === "production") return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[60] overflow-visible"
      data-kiss-cam-rig-debug="true"
      aria-hidden
    >
      {title ? (
        <div className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-lime-300">
          {title}
        </div>
      ) : null}

      {layers.map((layer) => (
        <div
          key={layer.id}
          className="absolute box-border border border-dashed"
          style={{
            left: `${layer.left}%`,
            top: `${layer.top}%`,
            width: `${layer.width}%`,
            height: `${layer.height}%`,
            borderColor: layer.color || "rgba(0,255,180,0.55)",
          }}
        >
          <span
            className="absolute -top-3 left-0 whitespace-nowrap rounded bg-black/75 px-1 text-[8px] font-medium text-cyan-200"
            style={{ color: layer.color || "#a5f3fc" }}
          >
            {layer.label}
          </span>
        </div>
      ))}

      {pivots.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="relative h-3 w-3"
            style={{ color: p.color || "#fbbf24" }}
          >
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current" />
            <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
            <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
          </div>
          <span className="absolute left-3 top-[-2px] whitespace-nowrap rounded bg-black/80 px-1 text-[8px] font-semibold text-amber-200">
            {p.label}
          </span>
        </div>
      ))}

      {handTargets.map((t) => (
        <div
          key={t.id}
          className="absolute"
          style={{
            left: `${t.x}%`,
            top: `${t.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="h-4 w-4 rounded-full border-2 border-fuchsia-400 bg-fuchsia-400/25"
            title={t.label}
          />
          <span className="absolute left-4 top-0 whitespace-nowrap rounded bg-black/80 px-1 text-[8px] font-semibold text-fuchsia-200">
            {t.label}
          </span>
        </div>
      ))}
    </div>
  );
}
