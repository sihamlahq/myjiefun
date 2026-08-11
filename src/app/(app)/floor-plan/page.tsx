import { FloorPlanCanvas } from "@/components/floor-plan-canvas";
import { PageHeader, SetupCard } from "@/components/page-chrome";
import { loadWeddingData } from "@/lib/wedding-data";

export default async function FloorPlanPage() {
  const data = await loadWeddingData();

  return (
    <div>
      <PageHeader
        eyebrow="Ballroom view"
        title="Floor plan"
        description="Scroll and zoom the ballroom on mobile, tap tables for guests, or switch to the list view. Enable Move tables only when editing layout."
      />
      {data.setupError ? <SetupCard message={data.setupError} /> : null}
      <FloorPlanCanvas tables={data.tables} guests={data.guests} />
    </div>
  );
}
