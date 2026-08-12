import { CheckInPanel } from "@/components/check-in-panel";
import { PageHeader, SetupCard } from "@/components/page-chrome";
import { loadGuestsAndTables } from "@/lib/wedding-data";

export default async function CheckInPage() {
  const data = await loadGuestsAndTables();

  return (
    <div>
      <PageHeader
        eyebrow="Reception desk"
        title="Check-in"
        description="Search a guest, tap Check in. Use filters for waiting or arrived."
      />
      {data.setupError ? <SetupCard message={data.setupError} /> : null}
      <CheckInPanel guests={data.guests} tables={data.tables} />
    </div>
  );
}
