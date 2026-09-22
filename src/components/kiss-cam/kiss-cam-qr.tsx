"use client";

import { useMemo, useEffect, useState } from "react";
import QRCode from "qrcode";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cameraPagePath } from "@/components/kiss-cam/kiss-cam-session";

type KissCamQRProps = {
  sessionId: string | null;
  shortCode: string | null;
  refreshing?: boolean;
  onRefresh: () => void;
};

export function KissCamQRCode({
  sessionId,
  shortCode,
  refreshing = false,
  onRefresh,
}: KissCamQRProps) {
  const url = useMemo(
    () =>
      sessionId
        ? cameraPagePath(
            sessionId,
            typeof window !== "undefined" ? window.location.origin : undefined,
          )
        : "",
    [sessionId],
  );

  const controllerUrl = useMemo(() => {
    if (!sessionId) return "/reception/kiss-cam/controller";
    if (typeof window === "undefined") {
      return `/reception/kiss-cam/controller?session=${encodeURIComponent(sessionId)}`;
    }
    const controller = new URL(
      "/reception/kiss-cam/controller",
      window.location.origin,
    );
    controller.searchParams.set("session", sessionId);
    return controller.toString();
  }, [sessionId]);

  const codeUrl = useMemo(() => {
    if (!sessionId) return "/reception/kiss-cam/camera";
    const q = new URLSearchParams({ session: sessionId });
    if (shortCode) q.set("code", shortCode);
    return `/reception/kiss-cam/camera?${q.toString()}`;
  }, [sessionId, shortCode]);

  return (
    <div className="grid gap-3">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,transparent)] bg-[#fffaf3]/90 p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--primary)]">
          Controller QR
        </p>
        <QRCodeBlock url={controllerUrl} alt="Kiss Cam controller QR code" />
        <p className="text-center text-[11px] leading-snug text-[var(--foreground)]/50">
          Scan this with the phone that will control the Kiss Cam.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--foreground)_10%,transparent)] bg-[#fffaf3]/90 p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--primary)]">
          Camera Sharing QR
        </p>
        <QRCodeBlock url={url} alt="Kiss Cam camera sharing QR code" loading={refreshing} />
        {shortCode ? (
          <div className="text-center">
            <p className="font-heading text-2xl tracking-[0.2em] text-[var(--foreground)]">
              {shortCode}
            </p>
            <Link
              href={codeUrl}
              className="mt-1 inline-block text-xs text-[var(--primary)] underline-offset-2 hover:underline"
            >
              or enter code
            </Link>
          </div>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          className="h-10 w-full"
          disabled={refreshing}
          onClick={onRefresh}
        >
          {refreshing ? "Refreshing…" : "Refresh Camera QR"}
        </Button>
        <p className="text-center text-[11px] leading-snug text-[var(--foreground)]/50">
          This QR is only for connecting a phone camera to this Kiss Cam session.
        </p>
      </div>
    </div>
  );
}

function QRCodeBlock({
  url,
  alt,
  loading = false,
}: {
  url: string;
  alt: string;
  loading?: boolean;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

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

  return (
    <div className="relative flex h-[180px] w-[180px] items-center justify-center rounded-xl border border-stone-200/70 bg-white/70">
      {dataUrl && !loading ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={alt} className="h-[150px] w-[150px] rounded-lg" />
      ) : (
        <div className="h-[150px] w-[150px] animate-pulse rounded-lg bg-stone-200/60" />
      )}
    </div>
  );
}
