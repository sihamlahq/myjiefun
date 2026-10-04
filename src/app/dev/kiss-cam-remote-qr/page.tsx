"use client";

import { KissCamRemoteQR } from "@/components/kiss-cam/kiss-cam-remote-qr";
import { KissCamQRCode } from "@/components/kiss-cam/kiss-cam-qr";

/** Dev preview: camera QR vs LED-remote QR (what the laptop panel shows). */
export default function KissCamRemoteQrDevPage() {
  const sessionId = "demo-led-session";
  const shortCode = "MBZ39L";

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 bg-[#2a1a22] p-4 text-[#fff5f7]">
      <h1 className="text-center text-lg font-semibold">Laptop panel QR preview</h1>
      <p className="text-center text-sm text-white/65">
        Top = camera phones. Bottom = scan on a second phone for exact LED remote controls.
      </p>
      <KissCamQRCode
        sessionId={sessionId}
        shortCode={shortCode}
        refreshing={false}
        hideRefresh
        onRefresh={() => undefined}
      />
      <KissCamRemoteQR sessionId={sessionId} shortCode={shortCode} />
    </main>
  );
}
