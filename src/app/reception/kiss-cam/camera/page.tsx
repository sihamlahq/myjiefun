import { Suspense } from "react";
import { KissCamCameraClient } from "@/components/kiss-cam/kiss-cam-camera";

export const dynamic = "force-dynamic";

export default function KissCamCameraPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center bg-[#2a221c] text-[#f7f1e8]">
          Loading camera…
        </main>
      }
    >
      <KissCamCameraClient />
    </Suspense>
  );
}
