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
        description="Search, import, export, and maintain every invitation field from one polished control room."
      />
      {data.setupError ? <SetupCard message={data.setupError} /> : null}
      <GuestsManager guests={data.guests} tables={data.tables} groups={data.groups} />
    </div>
  );
}
