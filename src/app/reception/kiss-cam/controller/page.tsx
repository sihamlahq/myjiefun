"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { KissCamMobileController } from "@/components/kiss-cam/kiss-cam-mobile-controller";

function ControllerContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  return <KissCamMobileController sessionId={sessionId} />;
}

export default function KissCamMobileControllerPage() {
  return (
    <Suspense
      fallback={
        <main className="kiss-cam-phone-shell flex min-h-[100dvh] items-center justify-center text-[#fff5f7]">
          Loading controller…
        </main>
      }
    >
      <ControllerContent />
    </Suspense>
  );
}
