import { GuestsManager } from "@/components/guests-manager";
import { PageHeader, SetupCard } from "@/components/page-chrome";
import { loadWeddingData } from "@/lib/wedding-data";

export default async function GuestsPage() {
  const data = await loadWeddingData();

  return (
    <div>
      <PageHeader
        eyebrow="Guest directory"
        title="Guests"
        description="Upload CSV or Excel with name, group, rsvp_status, expected_count, relationship, category. Tap Confirm to mark RSVP."
      />
      {data.setupError ? <SetupCard message={data.setupError} /> : null}
      <GuestsManager guests={data.guests} tables={data.tables} groups={data.groups} />
    </div>
  );
}
