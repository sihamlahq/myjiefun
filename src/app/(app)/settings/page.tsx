import { PageHeader, SetupCard } from "@/components/page-chrome";
import { SettingsForm } from "@/components/settings-form";
import { loadWeddingData, withDefaultSettings } from "@/lib/wedding-data";

export default async function SettingsPage() {
  const data = await loadWeddingData();
  const settings = withDefaultSettings(data.settings);

  return (
    <div>
      <PageHeader
        eyebrow="Wedding control"
        title="Settings"
        description="Tune the couple details, premium theme, guest taxonomy, seating defaults, and check-in rules."
      />
      {data.setupError ? <SetupCard message={data.setupError} /> : null}
      <SettingsForm settings={settings} />
    </div>
  );
}
