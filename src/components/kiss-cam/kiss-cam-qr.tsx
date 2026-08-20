"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import Link from "next/link";
import { cameraPagePath, SESSION_TTL_MS } from "@/components/kiss-cam/kiss-cam-session";

type KissCamQRProps = {
  sessionId: string | null;
  shortCode: string | null;
  expiresAt: number | null;
  onExpired: () => void;
};

export function KissCamQRCode({ sessionId, shortCode, expiresAt, onExpired }: KissCamQRProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const expiredFired = useRef(false);

  const url = useMemo(
    () => (sessionId ? cameraPagePath(sessionId, typeof window !== "undefined" ? window.location.origin : undefined) : ""),
    [sessionId],
  );

  const codeUrl = useMemo(() => {
    if (!sessionId) return "/reception/kiss-cam/camera";
    const q = new URLSearchParams({ session: sessionId });
    if (shortCode) q.set("code", shortCode);
    return `/reception/kiss-cam/camera?${q.toString()}`;
  }, [sessionId, shortCode]);

  useEffect(() => {
    expiredFired.current = false;
  }, [sessionId, expiresAt]);

  useEffect(() => {
    if (!url) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: { dark: "#3a2a22", light: "#fffaf3" },
      errorCorrectionLevel: "M",
    }).then((png) => {
      if (!cancelled) setDataUrl(png);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!expiresAt || now < expiresAt || expiredFired.current) return;
    expiredFired.current = true;
    onExpired();
  }, [now, expiresAt, onExpired]);

  const remaining = expiresAt ? Math.max(0, expiresAt - now) : SESSION_TTL_MS;
  const progress = Math.min(1, remaining / SESSION_TTL_MS);
  const seconds = Math.ceil(remaining / 1000);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,transparent)] bg-[#fffaf3]/90 p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--primary)]">
        Scan to connect camera
      </p>
      <div className="relative flex h-[200px] w-[200px] items-center justify-center">
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(184,149,106,.2)" strokeWidth="3" />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="rgba(139,90,70,.85)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${progress * 289} 289`}
          />
        </svg>
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="Kiss Cam camera pairing QR code" className="h-[150px] w-[150px] rounded-lg" />
        ) : (
          <div className="h-[150px] w-[150px] animate-pulse rounded-lg bg-stone-200/60" />
        )}
      </div>
      <p className="text-xs tabular-nums text-[var(--foreground)]/55">Expires in {seconds}s</p>
      {shortCode ? (
        <div className="text-center">
          <p className="font-heading text-2xl tracking-[0.2em] text-[var(--foreground)]">{shortCode}</p>
          <Link
            href={codeUrl}
            className="mt-1 inline-block text-xs text-[var(--primary)] underline-offset-2 hover:underline"
          >
            or enter code
          </Link>
        </div>
      ) : null}
    </div>
  );
}
