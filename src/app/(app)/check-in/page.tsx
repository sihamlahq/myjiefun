import { CheckInPanel } from "@/components/check-in-panel";
import { PageHeader, SetupCard } from "@/components/page-chrome";
import { loadWeddingData } from "@/lib/wedding-data";

export default async function CheckInPage() {
  const data = await loadWeddingData();

  return (
    <div>
      <PageHeader
        eyebrow="Reception desk"
        title="Check-in"
        description="Fast, mobile-first arrivals with fuzzy search, group entry, partial party counts, and walk-ins."
      />
      {data.setupError ? <SetupCard message={data.setupError} /> : null}
      <CheckInPanel guests={data.guests} tables={data.tables} />
    </div>
  );
}
