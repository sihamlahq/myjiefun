import { Suspense } from "react";
import { KissCamCameraClient } from "@/components/kiss-cam/kiss-cam-camera";

export const dynamic = "force-dynamic";

export default function KissCamCameraPage() {
  return (
    <Suspense
      fallback={
        <main className="kiss-cam-phone-shell flex h-dvh max-h-dvh items-center justify-center overflow-hidden text-[#fff5f7]">
          Loading camera…
        </main>
      }
    >
      <KissCamCameraClient />
    </Suspense>
  );
}
