import { PageHeader, SetupCard } from "@/components/page-chrome";
import { TablesManager } from "@/components/tables-manager";
import { loadWeddingData } from "@/lib/wedding-data";

export default async function TablesPage() {
  const data = await loadWeddingData();

  return (
    <div>
      <PageHeader
        eyebrow="Ballroom inventory"
        title="Tables"
        description="Create, edit, duplicate, retire, and expand reception tables with capacities and statuses."
      />
      {data.setupError ? <SetupCard message={data.setupError} /> : null}
      <TablesManager tables={data.tables} guests={data.guests} />
    </div>
  );
}
