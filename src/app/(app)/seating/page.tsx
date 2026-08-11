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
        description="Drag guests between tables and the unassigned list. Changes save instantly through Supabase actions."
      />
      {data.setupError ? <SetupCard message={data.setupError} /> : null}
      <SeatingBoard guests={data.guests} tables={data.tables} />
    </div>
  );
}
