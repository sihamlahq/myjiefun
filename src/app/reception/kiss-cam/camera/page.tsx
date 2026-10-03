import { Suspense } from "react";
import { KissCamCameraClient } from "@/components/kiss-cam/kiss-cam-camera";

export const dynamic = "force-dynamic";

export default function KissCamCameraPage() {
  return (
    <Suspense
      fallback={
        <main className="kiss-cam-phone-shell flex min-h-[40vh] items-center justify-center overflow-hidden px-3 text-[#fff5f7]">
          Loading camera…
        </main>
      }
    >
      <KissCamCameraClient />
    </Suspense>
  );
}
