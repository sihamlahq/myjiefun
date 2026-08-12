import { PageHeader, SetupCard } from "@/components/page-chrome";
import { SeatingBoard } from "@/components/seating-board";
import { loadWeddingData } from "@/lib/wedding-data";

export default async function SeatingPage() {
  const data = await loadWeddingData();

  return (
    <div>
      <PageHeader
        eyebrow="Seat every guest"
        title="Seating"
        description="Assign unassigned guests with the table shortcut, or drag them onto table cards."
      />
      {data.setupError ? <SetupCard message={data.setupError} /> : null}
      <SeatingBoard guests={data.guests} tables={data.tables} />
    </div>
  );
}
