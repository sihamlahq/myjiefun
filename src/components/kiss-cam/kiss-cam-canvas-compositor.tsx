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
 * Default "love" fills the large single-heart stage opening with the live feed.
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
 * Single large heart that fills the LED black heart opening.
 * Cover-fills with the live camera so no black margins remain inside the silhouette.
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
  // Match the large black stage cutout (≈70% wide × 84% tall, above the ribbon).
  // Path is normalized to the heart's real bounds (not the padded 24×24 viewBox).
  const boxH = stageH * 0.86;
  const boxW = Math.min(stageW * 0.74, boxH * 1.18);
  const boxX = (stageW - boxW) / 2;
  const boxY = stageH * 0.05;

  const heart = singleHeartPath2D(boxX, boxY, boxW, boxH);

  // Opaque heart mask, then source-in the live cover video.
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.fill(heart);

  ctx.globalCompositeOperation = "source-in";
  ctx.globalAlpha = opacity;
  // Overscan so anti-aliased lobe edges never reveal the black stage.
  const scale = Math.max(boxW / vw, boxH / vh) * 1.16;
  const dw = vw * scale;
  const dh = vh * scale;
  const dx = boxX + (boxW - dw) / 2;
  const dy = boxY + (boxH - dh) / 2;
  ctx.drawImage(video, dx, dy, dw, dh);
  ctx.restore();

  // Soft rose outline on top of the filled video.
  ctx.save();
  ctx.globalAlpha = opacity * 0.95;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255, 201, 212, 0.95)";
  ctx.lineWidth = Math.max(3, Math.min(stageW, stageH) * 0.004);
  ctx.stroke(heart);
  ctx.strokeStyle = "rgba(255, 248, 250, 0.4)";
  ctx.lineWidth = Math.max(1, Math.min(stageW, stageH) * 0.0014);
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
