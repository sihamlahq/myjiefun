import { loadWeddingData, withDefaultSettings } from "@/lib/wedding-data";
import { KissCamController } from "@/components/kiss-cam/kiss-cam-controller";

export const dynamic = "force-dynamic";

export default async function KissCamPage() {
  const data = await loadWeddingData();
  const settings = withDefaultSettings(data.settings);

  return (
    <KissCamController
      coupleNames={settings.wedding.coupleNames}
      weddingTitle={settings.wedding.title}
    />
  );
}
