import { DashboardLiveBoard } from "@/components/dashboard-live-board";
import { PageHeader, SetupCard } from "@/components/page-chrome";
import { loadWeddingData, withDefaultSettings } from "@/lib/wedding-data";

export default async function DashboardPage() {
  const data = await loadWeddingData();
  const settings = withDefaultSettings(data.settings);

  return (
    <div>
      <PageHeader
        eyebrow="Wedding command center"
        title="Dashboard"
        description={`${settings.wedding.coupleNames} · ${settings.wedding.venue || "Venue pending"} · live status`}
      />

      {data.setupError ? <SetupCard message={data.setupError} /> : null}

      <DashboardLiveBoard
        initialGuests={data.guests}
        initialTables={data.tables}
        initialCheckInEvents={data.checkInEvents}
      />
    </div>
  );
}
