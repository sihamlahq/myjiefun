"use client";

import { useEffect, useRef } from "react";

type KissCamCanvasCompositorProps = {
  video: HTMLVideoElement | null;
  enabled: boolean;
  layout: "love" | "center" | "portrait" | "rounded" | "full";
  fadeIn: boolean;
  className?: string;
};

/**
 * Draws the live camera into a cinematic frame.
 * Default "love" clips to the same wide double-heart as the phone preview
 * and cover-fills with the exact live feed (no black placeholder).
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

    const targetFpsFromVideo = () => {
      try {
        const stream = video?.srcObject;
        if (stream instanceof MediaStream) {
          const track = stream.getVideoTracks()[0];
          const fps = track?.getSettings?.().frameRate;
          if (typeof fps === "number" && fps >= 45) return 60;
        }
      } catch {
        // ignore
      }
      return 30;
    };

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);
      if (document.hidden) return;
      const minFrameMs = 1000 / targetFpsFromVideo();
      if (now - lastDraw < minFrameMs - 1) return;
      lastDraw = now;

      const parent = canvas.parentElement;
      const cssW = parent?.clientWidth || 640;
      const cssH = parent?.clientHeight || 360;
      // Sharp on retina / LED laptop screens without overdoing GPU cost.
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
      opacityRef.current += (targetOpacity - opacityRef.current) * (fadeIn ? 0.12 : 0.3);

      if (opacityRef.current < 0.01 || !video || video.readyState < 2) {
        return;
      }

      const vw = video.videoWidth || 1920;
      const vh = video.videoHeight || 1080;

      if (layout === "love") {
        drawLoveCamera(ctx, video, w, h, vw, vh, opacityRef.current);
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

      roundRectPath(ctx, fx, fy, fw, fh, radius);
      ctx.clip();

      const scale = Math.max(fw / vw, fh / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const dx = fx + (fw - dw) / 2;
      const dy = fy + (fh - dh) / 2;

      ctx.drawImage(video, dx, dy, dw, dh);

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

/**
 * Phone-matched wide double-heart: clip path in a centered box, cover-fill live video.
 * Paths use the same objectBoundingBox shapes as `#kiss-cam-double-love-clip`.
 */
function drawLoveCamera(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  stageW: number,
  stageH: number,
  vw: number,
  vh: number,
  opacity: number,
) {
  // Match phone preview proportions (aspect ~5 / 3.55) and keep it large on LED.
  const boxW = Math.min(stageW * 0.92, stageH * (5 / 3.55) * 0.95);
  const boxH = boxW * (3.55 / 5);
  const boxX = (stageW - boxW) / 2;
  const boxY = stageH * 0.06;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  doubleLovePath(ctx, boxX, boxY, boxW, boxH);
  ctx.clip();

  const scale = Math.max(boxW / vw, boxH / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const dx = boxX + (boxW - dw) / 2;
  const dy = boxY + (boxH - dh) / 2;
  ctx.drawImage(video, dx, dy, dw, dh);
  ctx.restore();

  // Soft rose outline like the phone stroke — not a black fill.
  ctx.save();
  ctx.globalAlpha = opacity * 0.95;
  ctx.strokeStyle = "rgba(255, 201, 212, 0.95)";
  ctx.lineWidth = Math.max(2, Math.min(stageW, stageH) * 0.003);
  ctx.beginPath();
  doubleLovePath(ctx, boxX, boxY, boxW, boxH);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 248, 250, 0.4)";
  ctx.lineWidth = Math.max(1, Math.min(stageW, stageH) * 0.0012);
  ctx.beginPath();
  doubleLovePath(ctx, boxX, boxY, boxW, boxH);
  ctx.stroke();
  ctx.restore();
}

/** objectBoundingBox twin-heart paths scaled into a rectangle. */
function doubleLovePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  // Left heart (from kiss-cam-double-love-clip)
  ctx.moveTo(x + 0.34 * w, y + 0.96 * h);
  ctx.bezierCurveTo(
    x + 0.34 * w,
    y + 0.96 * h,
    x - 0.02 * w,
    y + 0.62 * h,
    x - 0.02 * w,
    y + 0.34 * h,
  );
  ctx.bezierCurveTo(
    x - 0.02 * w,
    y + 0.16 * h,
    x + 0.1 * w,
    y + 0.06 * h,
    x + 0.24 * w,
    y + 0.1 * h,
  );
  ctx.bezierCurveTo(
    x + 0.31 * w,
    y + 0.12 * h,
    x + 0.36 * w,
    y + 0.22 * h,
    x + 0.38 * w,
    y + 0.34 * h,
  );
  ctx.bezierCurveTo(
    x + 0.4 * w,
    y + 0.22 * h,
    x + 0.47 * w,
    y + 0.1 * h,
    x + 0.56 * w,
    y + 0.1 * h,
  );
  ctx.bezierCurveTo(
    x + 0.7 * w,
    y + 0.06 * h,
    x + 0.8 * w,
    y + 0.18 * h,
    x + 0.78 * w,
    y + 0.34 * h,
  );
  ctx.bezierCurveTo(
    x + 0.76 * w,
    y + 0.58 * h,
    x + 0.5 * w,
    y + 0.88 * h,
    x + 0.34 * w,
    y + 0.96 * h,
  );

  // Right heart
  ctx.moveTo(x + 0.66 * w, y + 0.96 * h);
  ctx.bezierCurveTo(
    x + 0.66 * w,
    y + 0.96 * h,
    x + 0.3 * w,
    y + 0.62 * h,
    x + 0.3 * w,
    y + 0.34 * h,
  );
  ctx.bezierCurveTo(
    x + 0.28 * w,
    y + 0.18 * h,
    x + 0.38 * w,
    y + 0.06 * h,
    x + 0.52 * w,
    y + 0.1 * h,
  );
  ctx.bezierCurveTo(
    x + 0.59 * w,
    y + 0.12 * h,
    x + 0.64 * w,
    y + 0.22 * h,
    x + 0.66 * w,
    y + 0.34 * h,
  );
  ctx.bezierCurveTo(
    x + 0.68 * w,
    y + 0.22 * h,
    x + 0.75 * w,
    y + 0.1 * h,
    x + 0.84 * w,
    y + 0.1 * h,
  );
  ctx.bezierCurveTo(
    x + 0.98 * w,
    y + 0.06 * h,
    x + 1.08 * w,
    y + 0.18 * h,
    x + 1.06 * w,
    y + 0.34 * h,
  );
  ctx.bezierCurveTo(
    x + 1.04 * w,
    y + 0.58 * h,
    x + 0.82 * w,
    y + 0.88 * h,
    x + 0.66 * w,
    y + 0.96 * h,
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
