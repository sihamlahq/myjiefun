import { PageHeader, SetupCard } from "@/components/page-chrome";
import { ReportsPanel } from "@/components/reports-panel";
import { loadWeddingData } from "@/lib/wedding-data";

export default async function ReportsPage() {
  const data = await loadWeddingData();

  return (
    <div>
      <PageHeader
        eyebrow="Planner intelligence"
        title="Reports"
        description="Export operational views for attendance, RSVP, occupancy, VIPs, no-shows, timelines, and groups."
      />
      {data.setupError ? <SetupCard message={data.setupError} /> : null}
      <ReportsPanel
        guests={data.guests}
        tables={data.tables}
        groups={data.groups}
        events={data.checkInEvents}
      />
    </div>
  );
}
