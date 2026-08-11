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
        description="Drag tables into position, save coordinates, and preview each table's checked-in guests."
      />
      {data.setupError ? <SetupCard message={data.setupError} /> : null}
      <FloorPlanCanvas tables={data.tables} guests={data.guests} />
    </div>
  );
}
