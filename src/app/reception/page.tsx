import { ReceptionLiveBoard } from "@/components/reception-live-board";
import { Card, CardContent } from "@/components/ui/card";
import { loadWeddingData, withDefaultSettings } from "@/lib/wedding-data";

export const dynamic = "force-dynamic";

export default async function ReceptionPage() {
  const data = await loadWeddingData();
  const settings = withDefaultSettings(data.settings);
  const subtitle = [settings.wedding.date, settings.wedding.venue].filter(Boolean).join(" · ");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,175,55,.2),transparent_26%),radial-gradient(circle_at_85%_5%,rgba(139,115,85,.18),transparent_28%)]" />
      <div className="reception-orb absolute left-10 top-10 h-56 w-56 rounded-full bg-[var(--accent)]/25 blur-3xl" />
      <div className="reception-orb reception-orb-delay absolute bottom-10 right-10 h-72 w-72 rounded-full bg-[var(--secondary)]/25 blur-3xl" />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center px-4 py-10 text-center sm:px-8">
        {data.setupError ? (
          <Card className="mt-10 max-w-2xl bg-white/85">
            <CardContent className="p-6">
              <p className="font-heading text-3xl">Connect Supabase to show live reception data.</p>
              <p className="mt-2 text-sm text-[var(--foreground)]/60">{data.setupError}</p>
            </CardContent>
          </Card>
        ) : (
          <ReceptionLiveBoard
            initialGuests={data.guests}
            initialTables={data.tables}
            coupleNames={settings.wedding.coupleNames}
            subtitle={subtitle}
          />
        )}
      </section>
    </main>
  );
}
