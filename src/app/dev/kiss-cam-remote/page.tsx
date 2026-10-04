"use client";

import { Suspense } from "react";
import { KissCamRemote } from "@/components/kiss-cam/kiss-cam-remote";

/** Dev preview of the mobile remote panel (no auth). */
export default function KissCamRemoteDevPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-[#2a1a22] p-6 text-white">Loading…</main>}>
      <KissCamRemote coupleNames="Alex & Jordan" />
    </Suspense>
  );
}
