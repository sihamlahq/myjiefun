"use client";

import { useEffect, useRef } from "react";

type KissCamCanvasCompositorProps = {
  video: HTMLVideoElement | null;
  enabled: boolean;
  layout: "love" | "center" | "portrait" | "rounded" | "full";
  fadeIn: boolean;
  /** Keep the dark heart window visible even before video frames arrive. */
  showLoveWindow?: boolean;
  className?: string;
};

/**
 * Draws camera / couple video into a cinematic frame.
 * Love layout = only inside the dark heart silhouette (never a full-screen rect).
 */
export function KissCamCanvasCompositor({
  video,
  enabled,
  layout,
  fadeIn,
  showLoveWindow = false,
  className = "",
}: KissCamCanvasCompositorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const opacityRef = useRef(0);
  const sizeRef = useRef({ cssW: 0, cssH: 0, dpr: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const loveWindow = layout === "love" && (enabled || showLoveWindow);
    if (!canvas || (!enabled && !loveWindow)) {
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

      const hasVideo = Boolean(video && video.readyState >= 2 && !video.paused);
      const hasStreamStill =
        Boolean(video && video.readyState >= 2 && video.srcObject instanceof MediaStream);
      const paintVideo = hasVideo || hasStreamStill;
      const targetOpacity = paintVideo ? 1 : 0;
      opacityRef.current += (targetOpacity - opacityRef.current) * (fadeIn ? 0.12 : 0.3);

      if (layout === "love") {
        const vw = video?.videoWidth || 1920;
        const vh = video?.videoHeight || 1080;
        drawLoveCamera(
          ctx,
          paintVideo ? video : null,
          w,
          h,
          vw,
          vh,
          paintVideo ? Math.max(opacityRef.current, 0.08) : 0,
        );
        return;
      }

      if (opacityRef.current < 0.01 || !video || video.readyState < 2) {
        return;
      }

      const vw = video.videoWidth || 1920;
      const vh = video.videoHeight || 1080;

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
  }, [video, enabled, layout, fadeIn, showLoveWindow]);

  if (!enabled && !(layout === "love" && showLoveWindow)) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden
    />
  );
}

/**
 * Dark love window + optional video clipped exactly to that silhouette.
 * Never draws a rectangular video layer outside the heart.
 */
function drawLoveCamera(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement | null,
  stageW: number,
  stageH: number,
  vw: number,
  vh: number,
  opacity: number,
) {
  // Large central heart opening (above bottom ribbon / chrome).
  const boxH = stageH * 0.78;
  const boxW = Math.min(stageW * 0.62, boxH * 1.05);
  const boxX = (stageW - boxW) / 2;
  const boxY = stageH * 0.07;

  const heart = singleHeartPath2D(boxX, boxY, boxW, boxH);

  // 1) Always paint the dark love shape (empty window).
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#0a0610";
  ctx.fill(heart);
  ctx.restore();

  // 2) Clip video to the same heart — nothing draws outside.
  if (video && opacity > 0.01) {
    ctx.save();
    ctx.clip(heart);
    ctx.globalAlpha = Math.min(1, opacity);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // Cover-fill inside the heart bounds only.
    const scale = Math.max(boxW / vw, boxH / vh) * 1.08;
    const dw = vw * scale;
    const dh = vh * scale;
    const dx = boxX + (boxW - dw) / 2;
    const dy = boxY + (boxH - dh) / 2;
    ctx.drawImage(video, dx, dy, dw, dh);
    ctx.restore();
  }

  // 3) Rose rim on the love shape (matches the frame, not a second video panel).
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(232, 121, 154, 0.95)";
  ctx.lineWidth = Math.max(3, Math.min(stageW, stageH) * 0.0045);
  ctx.stroke(heart);
  ctx.strokeStyle = "rgba(255, 248, 250, 0.55)";
  ctx.lineWidth = Math.max(1.5, Math.min(stageW, stageH) * 0.0018);
  ctx.stroke(heart);
  ctx.restore();
}

/**
 * Classic heart from kiss-cam hearts.svg. The path does not fill the full 24×24
 * viewBox (empty padding above/below), so we normalize to content bounds.
 */
const HEART_PATH =
  "M12 21s-7.2-4.6-9.6-9.2C.6 8.2 2.4 4.8 6 4.8c2 0 3.3 1.2 4 2.2.7-1 2-2.2 4-2.2 3.6 0 5.4 3.4 3.6 7C19.2 16.4 12 21 12 21z";
const HEART_BOUNDS = { x: 0.55, y: 4.55, w: 22.9, h: 16.55 };

function singleHeartPath2D(x: number, y: number, w: number, h: number) {
  const path = new Path2D();
  path.addPath(
    new Path2D(HEART_PATH),
    new DOMMatrix()
      .translate(x, y)
      .scale(w / HEART_BOUNDS.w, h / HEART_BOUNDS.h)
      .translate(-HEART_BOUNDS.x, -HEART_BOUNDS.y),
  );
  return path;
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
