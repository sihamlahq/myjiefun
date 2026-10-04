"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import Link from "next/link";
import { remotePagePath, canonicalSiteUrl } from "@/components/kiss-cam/kiss-cam-session";

type KissCamRemoteQRProps = {
  sessionId: string | null;
  shortCode: string | null;
  className?: string;
};

/**
 * Laptop LED panel QR — phone scans this to open the exact session-linked remote
 * at /reception/kiss-cam/remote (same controls as the laptop panel).
 */
export function KissCamRemoteQR({ sessionId, shortCode, className = "" }: KissCamRemoteQRProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const absoluteUrl = useMemo(() => {
    if (!sessionId) return "";
    return remotePagePath(sessionId, shortCode, canonicalSiteUrl());
  }, [sessionId, shortCode]);

  const localHref = useMemo(() => {
    if (!sessionId) return "/reception/kiss-cam/remote";
    const q = new URLSearchParams({ session: sessionId });
    if (shortCode) q.set("code", shortCode);
    return `/reception/kiss-cam/remote?${q.toString()}`;
  }, [sessionId, shortCode]);

  useEffect(() => {
    if (!absoluteUrl) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(absoluteUrl, {
      width: 220,
      margin: 2,
      color: { dark: "#3a2a22", light: "#fff5f7" },
      errorCorrectionLevel: "M",
    }).then((png) => {
      if (!cancelled) setDataUrl(png);
    });
    return () => {
      cancelled = true;
    };
  }, [absoluteUrl]);

  if (!sessionId) return null;

  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-2xl border border-[#ffc9d4]/35 bg-[#3a2f28]/95 p-3 text-[#fff5f7] shadow-[0_16px_40px_rgba(0,0,0,.35)] backdrop-blur-md ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffc9d4]/90">
        Scan for LED remote
      </p>
      <div className="relative flex h-[140px] w-[140px] items-center justify-center rounded-xl border border-white/15 bg-[#fff5f7]">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt="QR code to open Kiss Cam LED remote on your phone"
            className="h-[120px] w-[120px] rounded-lg"
          />
        ) : (
          <div className="h-[120px] w-[120px] animate-pulse rounded-lg bg-white/40" />
        )}
      </div>
      {shortCode ? (
        <p className="font-heading text-lg tracking-[0.2em] text-[#fff5f7]">{shortCode}</p>
      ) : null}
      <p className="text-center text-[11px] leading-snug text-[#f7f1e8]/65">
        Opens the phone remote linked to this laptop — same controls, not a new session.
      </p>
      <Link
        href={localHref}
        className="flex h-9 w-full items-center justify-center rounded-xl border border-[#ffc9d4]/35 bg-[#c45a78]/25 text-xs font-semibold text-[#fff5f7] hover:bg-[#c45a78]/40"
      >
        Open mobile remote
      </Link>
    </div>
  );
}
