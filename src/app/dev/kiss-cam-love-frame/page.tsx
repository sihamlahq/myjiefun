"use client";

import { useEffect, useRef, useState } from "react";
import { KissCamCanvasCompositor } from "@/components/kiss-cam/kiss-cam-canvas-compositor";

/**
 * Dev-only visual test: bright fake "camera" into the large heart frame.
 * Open /dev/kiss-cam-love-frame and confirm no black gaps inside the heart.
 */
export default function KissCamLoveFrameTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setVideoEl(video);

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t0 = performance.now();
    const paint = (now: number) => {
      raf = requestAnimationFrame(paint);
      const t = (now - t0) / 1000;
      // Bright non-black fill so any black gap in the love clip is obvious.
      const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      g.addColorStop(0, `hsl(${(t * 40) % 360} 85% 55%)`);
      g.addColorStop(0.5, `hsl(${(t * 40 + 80) % 360} 90% 60%)`);
      g.addColorStop(1, `hsl(${(t * 40 + 160) % 360} 85% 50%)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "bold 72px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("LIVE CAMERA TEST", canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = "600 36px system-ui, sans-serif";
      ctx.fillText("heart frame should be fully covered", canvas.width / 2, canvas.height / 2 + 40);
      // Grid so letterboxing / uncovered edges show clearly.
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      for (let x = 0; x < canvas.width; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    };
    raf = requestAnimationFrame(paint);

    const stream = canvas.captureStream(30);
    video.srcObject = stream;
    void video.play().then(() => setReady(true)).catch(() => setReady(true));

    return () => {
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    };
  }, []);

  return (
    <main className="min-h-dvh bg-[#1a1014] p-4 text-[#fff5f7]">
      <h1 className="mb-2 text-center text-lg font-semibold tracking-wide">
        Kiss Cam heart-frame coverage test
      </h1>
      <p className="mb-4 text-center text-sm text-white/70">
        Bright fake live feed. The large black heart opening must be fully covered — no black margins.
      </p>
      <div
        className="relative mx-auto aspect-video w-full max-w-5xl overflow-hidden rounded-xl bg-[#3a2430]"
        data-testid="love-frame-stage"
      >
        <video
          ref={videoRef}
          className="pointer-events-none absolute h-px w-px opacity-0"
          muted
          playsInline
          autoPlay
          aria-hidden
        />
        <KissCamCanvasCompositor
          video={videoEl}
          enabled={ready}
          layout="love"
          fadeIn={false}
        />
      </div>
      <p className="mt-3 text-center text-xs text-white/55">
        Status: {ready ? "compositing live test feed" : "starting…"}
      </p>
    </main>
  );
}
