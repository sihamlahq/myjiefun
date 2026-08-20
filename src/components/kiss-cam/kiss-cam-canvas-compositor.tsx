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
 * Draws the live camera into a cinematic frame.
 * Tuned for a sharper, smoother LED image: steady 30fps draw, higher DPR,
 * larger frame, and high-quality smoothing without heavy per-frame filters.
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
  const sizeRef = useRef({ cssW: 0, cssH: 0, dpr: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) {
      opacityRef.current = 0;
      return;
    }

    // desynchronized reduces input/composite latency on supporting browsers.
    const ctx =
      canvas.getContext("2d", { alpha: true, desynchronized: true, willReadFrequently: false }) ??
      canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let lastDraw = 0;
    const minFrameMs = 1000 / 30; // Match capture — steady 30fps on LED.

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);
      if (document.hidden) return;
      if (now - lastDraw < minFrameMs - 1) return;
      lastDraw = now;

      const parent = canvas.parentElement;
      const cssW = parent?.clientWidth || 640;
      const cssH = parent?.clientHeight || 360;
      // Allow sharper pixels on high-DPI LED / laptop screens.
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const bufW = Math.max(1, Math.round(cssW * dpr));
      const bufH = Math.max(1, Math.round(cssH * dpr));

      if (
        sizeRef.current.cssW !== cssW ||
        sizeRef.current.cssH !== cssH ||
        sizeRef.current.dpr !== dpr ||
        canvas.width !== bufW ||
        canvas.height !== bufH
      ) {
        canvas.width = bufW;
        canvas.height = bufH;
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
        sizeRef.current = { cssW, cssH, dpr };
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const w = cssW;
      const h = cssH;

      const targetOpacity = video && video.readyState >= 2 ? 1 : 0;
      opacityRef.current += (targetOpacity - opacityRef.current) * (fadeIn ? 0.1 : 0.28);

      if (opacityRef.current < 0.01 || !video || video.readyState < 2) {
        return;
      }

      // Larger frame so faces read clearer / higher on the LED.
      let fw = w * 0.66;
      let fh = h * 0.74;
      let fx = (w - fw) / 2;
      let fy = h * 0.08;
      let radius = 22;

      if (layout === "portrait") {
        fw = w * 0.42;
        fh = h * 0.74;
        fx = (w - fw) / 2;
        fy = h * 0.08;
        radius = 26;
      } else if (layout === "rounded") {
        fw = w * 0.58;
        fh = h * 0.68;
        fx = (w - fw) / 2;
        fy = h * 0.1;
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

      // No canvas shadowBlur — it is very expensive every frame.
      roundRectPath(ctx, fx, fy, fw, fh, radius);
      ctx.clip();

      const vw = video.videoWidth || 1920;
      const vh = video.videoHeight || 1080;
      const scale = Math.max(fw / vw, fh / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const dx = fx + (fw - dw) / 2;
      const dy = fy + (fh - dh) / 2;

      // No ctx.filter — CSS filters on canvas re-rasterize every frame and soften detail.
      ctx.drawImage(video, dx, dy, dw, dh);

      // Very light vignette only — avoid washes that soften the feed.
      ctx.fillStyle = "rgba(40, 20, 30, 0.05)";
      ctx.fillRect(fx, fy + fh * 0.78, fw, fh * 0.22);

      ctx.restore();

      if (layout !== "full") {
        ctx.save();
        ctx.globalAlpha = opacityRef.current * 0.95;
        ctx.strokeStyle = "rgba(232, 121, 154, 0.9)";
        ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.0025);
        roundRectPath(ctx, fx, fy, fw, fh, radius);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 245, 248, 0.45)";
        ctx.lineWidth = 1;
        roundRectPath(ctx, fx + 3, fy + 3, fw - 6, fh - 6, Math.max(0, radius - 3));
        ctx.stroke();
        ctx.restore();
      }
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
