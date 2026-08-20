"use client";

import { useEffect, useRef } from "react";

type KissCamCanvasCompositorProps = {
  video: HTMLVideoElement | null;
  enabled: boolean;
  layout: "center" | "portrait" | "rounded" | "full";
  fadeIn: boolean;
  className?: string;
};

/**
 * Draws the live camera into a cinematic frame with warm grading + vignette.
 * Uses devicePixelRatio so the feed stays sharp on 1080p/4K LED walls.
 */
export function KissCamCanvasCompositor({
  video,
  enabled,
  layout,
  fadeIn,
  className = "",
}: KissCamCanvasCompositorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const opacityRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) {
      opacityRef.current = 0;
      return;
    }

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const draw = () => {
      if (document.hidden) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const parent = canvas.parentElement;
      const cssW = parent?.clientWidth || 640;
      const cssH = parent?.clientHeight || 360;
      // Cap DPR so 4K walls stay sharp without blowing GPU memory.
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const bufW = Math.max(1, Math.round(cssW * dpr));
      const bufH = Math.max(1, Math.round(cssH * dpr));

      if (canvas.width !== bufW || canvas.height !== bufH) {
        canvas.width = bufW;
        canvas.height = bufH;
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
      }

      // Draw in CSS pixel space with DPR transform.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const w = cssW;
      const h = cssH;

      const targetOpacity = video && video.readyState >= 2 ? 1 : 0;
      opacityRef.current += (targetOpacity - opacityRef.current) * (fadeIn ? 0.04 : 0.2);

      if (opacityRef.current < 0.01 || !video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // Frame geometry — slightly larger so faces fill more of the LED.
      let fw = w * 0.48;
      let fh = h * 0.58;
      let fx = (w - fw) / 2;
      let fy = h * 0.14;
      let radius = 18;

      if (layout === "portrait") {
        fw = w * 0.32;
        fh = h * 0.64;
        fx = (w - fw) / 2;
        fy = h * 0.12;
        radius = 22;
      } else if (layout === "rounded") {
        fw = w * 0.44;
        fh = h * 0.54;
        fx = (w - fw) / 2;
        fy = h * 0.14;
        radius = Math.min(fw, fh) / 2;
      } else if (layout === "full") {
        fw = w;
        fh = h;
        fx = 0;
        fy = 0;
        radius = 0;
      }

      ctx.save();
      ctx.globalAlpha = opacityRef.current;

      if (layout !== "full") {
        ctx.shadowColor = "rgba(40, 20, 20, 0.4)";
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 8;
      }

      roundRectPath(ctx, fx, fy, fw, fh, radius);
      ctx.clip();
      ctx.shadowColor = "transparent";

      const vw = video.videoWidth || 1920;
      const vh = video.videoHeight || 1080;
      const scale = Math.max(fw / vw, fh / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const dx = fx + (fw - dw) / 2;
      const dy = fy + (fh - dh) / 2;

      // Light grade only — heavy sepia/saturate was softening the HD feed.
      ctx.filter = "sepia(0.06) saturate(0.95) brightness(1.03) contrast(1.06)";
      ctx.drawImage(video, dx, dy, dw, dh);
      ctx.filter = "none";

      const wash = ctx.createLinearGradient(fx, fy, fx, fy + fh);
      wash.addColorStop(0, "rgba(255, 236, 210, 0.06)");
      wash.addColorStop(0.55, "rgba(232, 180, 160, 0.03)");
      wash.addColorStop(1, "rgba(90, 40, 50, 0.1)");
      ctx.fillStyle = wash;
      ctx.fillRect(fx, fy, fw, fh);

      const vig = ctx.createRadialGradient(
        fx + fw / 2,
        fy + fh / 2,
        Math.min(fw, fh) * 0.35,
        fx + fw / 2,
        fy + fh / 2,
        Math.max(fw, fh) * 0.75,
      );
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(40, 20, 25, 0.22)");
      ctx.fillStyle = vig;
      ctx.fillRect(fx, fy, fw, fh);

      ctx.restore();

      if (layout !== "full") {
        ctx.save();
        ctx.globalAlpha = opacityRef.current * 0.9;
        ctx.strokeStyle = "rgba(184, 149, 106, 0.85)";
        ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.002);
        roundRectPath(ctx, fx, fy, fw, fh, radius);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 248, 235, 0.35)";
        ctx.lineWidth = 1;
        roundRectPath(ctx, fx + 3, fy + 3, fw - 6, fh - 6, Math.max(0, radius - 3));
        ctx.stroke();
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [video, enabled, layout, fadeIn]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden
    />
  );
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
