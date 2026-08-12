import { GuestsManager } from "@/components/guests-manager";
import { PageHeader, SetupCard } from "@/components/page-chrome";
import { loadGuestsPageData } from "@/lib/wedding-data";

export default async function GuestsPage() {
  const data = await loadGuestsPageData();

  return (
    <div>
      <PageHeader eyebrow="Guest directory" title="Guests" />
      {data.setupError ? <SetupCard message={data.setupError} /> : null}
      <GuestsManager
        guests={data.guests}
        tables={data.tables}
        categories={data.categories}
        dietaryCategories={data.dietaryCategories}
      />
    </div>
  );
}
