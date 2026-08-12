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
        description="Tap Confirm to mark RSVP, or change status from the list — no extra edit steps."
      />
      {data.setupError ? <SetupCard message={data.setupError} /> : null}
      <GuestsManager guests={data.guests} tables={data.tables} groups={data.groups} />
    </div>
  );
}
