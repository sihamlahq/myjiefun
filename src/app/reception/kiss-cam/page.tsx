import { redirect } from "next/navigation";
import { loadWeddingData, withDefaultSettings } from "@/lib/wedding-data";
import { KissCamController } from "@/components/kiss-cam/kiss-cam-controller";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function KissCamPage() {
  // Defense in depth — middleware also blocks anonymous access to this LED page.
  let user = null;
  try {
    const supabase = await createClient();
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }
  if (!user) {
    redirect("/login?next=/reception/kiss-cam");
  }

  const data = await loadWeddingData();
  const settings = withDefaultSettings(data.settings);

  return (
    <KissCamController
      coupleNames={settings.wedding.coupleNames}
      weddingTitle={settings.wedding.title}
    />
  );
}
