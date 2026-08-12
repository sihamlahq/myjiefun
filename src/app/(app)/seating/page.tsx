import { PageHeader, SetupCard } from "@/components/page-chrome";
import { SeatingBoard } from "@/components/seating-board";
import { loadGuestsAndTables } from "@/lib/wedding-data";

export default async function SeatingPage() {
  const data = await loadGuestsAndTables();

  return (
    <div>
      <PageHeader
        eyebrow="Seat every guest"
        title="Seating"
        description="On each table, pick guests from the list to seat them. On phone you can also move guests with the table menu."
      />
      {data.setupError ? <SetupCard message={data.setupError} /> : null}
      <SeatingBoard guests={data.guests} tables={data.tables} />
    </div>
  );
}
