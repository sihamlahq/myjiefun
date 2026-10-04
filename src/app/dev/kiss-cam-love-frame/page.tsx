"use client";

import { useEffect, useState } from "react";
import {
  KissCamDisplay,
  KISS_CAM_COUPLE_VIDEO_SRC,
  KISS_CAM_LOVE_FRAME_SRC,
} from "@/components/kiss-cam/kiss-cam-display";

/**
 * Dev visual test for frame-in-front layering:
 * 1) Idle — couple mp4 full-bleed (not clipped into a heart mask)
 * 2) Live — fake camera under love-frame.png (feed through heart hole)
 * 3) Love burst — soft glow (no milky plate) over live frame
 * 4) Loading — soft spark only (no milky white plate)
 */
export default function KissCamLoveFrameTestPage() {
  const [mode, setMode] = useState<"idle" | "live">("idle");
  const [fakeStream, setFakeStream] = useState<MediaStream | null>(null);
  const [loveBurst, setLoveBurst] = useState(false);
  const [loveBurstId, setLoveBurstId] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== "live") {
      setFakeStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const t0 = performance.now();
    const paint = (now: number) => {
      raf = requestAnimationFrame(paint);
      const t = (now - t0) / 1000;
      const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      g.addColorStop(0, `hsl(${(t * 40) % 360} 85% 55%)`);
      g.addColorStop(0.5, `hsl(${(t * 40 + 80) % 360} 90% 60%)`);
      g.addColorStop(1, `hsl(${(t * 40 + 160) % 360} 85% 50%)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "bold 64px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("LIVE THROUGH HEART", canvas.width / 2, canvas.height / 2);
    };
    raf = requestAnimationFrame(paint);

    const stream = canvas.captureStream(30);
    setFakeStream(stream);

    return () => {
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((track) => track.stop());
    };
  }, [mode]);

  const triggerLove = () => {
    setMode("live");
    setLoveBurstId((n) => n + 1);
    setLoveBurst(true);
    window.setTimeout(() => setLoveBurst(false), 2200);
  };

  return (
    <main className="min-h-dvh bg-[#1a1014] p-4 text-[#fff5f7]">
      <h1 className="mb-2 text-center text-lg font-semibold tracking-wide">
        Kiss Cam frame-in-front test
      </h1>
      <p className="mb-3 text-center text-sm text-white/70">
        Idle = full-bleed couple video. Live = camera under love-frame.png.
      </p>
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            mode === "idle" ? "bg-[#c45a78]" : "bg-white/10"
          }`}
          onClick={() => setMode("idle")}
        >
          Idle (couple video)
        </button>
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            mode === "live" && !loveBurst ? "bg-[#c45a78]" : "bg-white/10"
          }`}
          onClick={() => setMode("live")}
        >
          Live (through heart)
        </button>
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            loveBurst ? "bg-[#ff8fab] text-[#2a1a22]" : "bg-white/10"
          }`}
          onClick={triggerLove}
        >
          ♥ Love burst
        </button>
      </div>
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl">
        <KissCamDisplay
          phase="idle"
          countdownValue={null}
          coupleNames="CJ & YC"
          cameraEnabled
          cameraLayout="love"
          remoteStream={mode === "live" ? fakeStream : null}
          fallbackVideoSrc={KISS_CAM_COUPLE_VIDEO_SRC}
          celebrate={false}
          loveBurst={loveBurst}
          fillViewport={false}
        />
      </div>
      <p className="mt-3 text-center text-xs text-white/55">
        Frame asset: {KISS_CAM_LOVE_FRAME_SRC}
        {loveBurstId > 0 ? ` · love burst #${loveBurstId}` : ""}
      </p>
    </main>
  );
}
