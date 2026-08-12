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
        description="On phone, pick a table under each guest. On desktop you can also drag."
      />
      {data.setupError ? <SetupCard message={data.setupError} /> : null}
      <SeatingBoard guests={data.guests} tables={data.tables} />
    </div>
  );
}
