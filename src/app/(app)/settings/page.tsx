import { PageHeader, SetupCard } from "@/components/page-chrome";
import { SettingsForm } from "@/components/settings-form";
import { SettingsLogBook } from "@/components/settings-log-book";
import { loadAuditLogs, loadWeddingData, withDefaultSettings } from "@/lib/wedding-data";

export default async function SettingsPage() {
  const [data, audit] = await Promise.all([loadWeddingData(), loadAuditLogs(200)]);
  const settings = withDefaultSettings(data.settings);

  return (
    <div>
      <PageHeader
        eyebrow="Wedding control"
        title="Settings"
        description="Tune wedding details, theme, guest rules, and review the staff activity log book."
      />
      {data.setupError ? <SetupCard message={data.setupError} /> : null}
      <div className="space-y-5">
        <SettingsForm settings={settings} guestCount={data.guests.length} />
        {audit.setupError ? (
          <SetupCard message={audit.setupError} />
        ) : (
          <SettingsLogBook logs={audit.logs} />
        )}
      </div>
    </div>
  );
}
