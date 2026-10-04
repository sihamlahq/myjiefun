import { PageHeader } from "@/components/page-chrome";
import { KissCamRecordingsPanel } from "@/components/kiss-cam-recordings-panel";

export default function KissCamVideosPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Reception media"
        title="Kiss Cam Videos"
        description="View, download, or delete live Kiss Cam clips saved from the phone camera."
      />
      <KissCamRecordingsPanel />
    </div>
  );
}
