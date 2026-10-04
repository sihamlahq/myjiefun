import { Suspense } from "react";
import { redirect } from "next/navigation";
import { loadWeddingData, withDefaultSettings } from "@/lib/wedding-data";
import { KissCamRemote } from "@/components/kiss-cam/kiss-cam-remote";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Mobile remote — controls the desktop LED Kiss Cam website only.
 * Signaling/control panel; never hosts the stage or local fullscreen.
 */
export default async function KissCamRemotePage() {
  let user = null;
  try {
    const supabase = await createClient();
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }
  if (!user) {
    redirect("/login?next=/reception/kiss-cam/remote");
  }

  const data = await loadWeddingData();
  const settings = withDefaultSettings(data.settings);

  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-[#2a1a22] text-[#fff5f7]">
          Loading remote…
        </main>
      }
    >
      <KissCamRemote coupleNames={settings.wedding.coupleNames} />
    </Suspense>
  );
}
