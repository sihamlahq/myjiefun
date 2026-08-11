import { RealtimeRefresh } from "@/components/realtime-refresh";
import { Badge, Card, CardContent } from "@/components/ui/card";
import { computeStats } from "@/lib/stats";
import { formatPercent } from "@/lib/utils";
import { loadWeddingData, withDefaultSettings } from "@/lib/wedding-data";

export default async function ReceptionPage() {
  const data = await loadWeddingData();
  const settings = withDefaultSettings(data.settings);
  const stats = computeStats(data.guests, data.tables);
  const totalGuests = data.guests.length;
  const attendanceRate = totalGuests ? stats.checkedIn / totalGuests : 0;
  const tableSummaries = data.tables.map((table) => {
    const assigned = data.guests.filter((guest) => guest.table_id === table.id).length;
    return { table, assigned };
  });
  const ready = tableSummaries.filter(({ assigned, table }) => assigned >= table.capacity).length;
  const partial = tableSummaries.filter(({ assigned, table }) => assigned > 0 && assigned < table.capacity).length;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <RealtimeRefresh enabled={!data.setupError} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,175,55,.2),transparent_26%),radial-gradient(circle_at_85%_5%,rgba(139,115,85,.18),transparent_28%)]" />
      <div className="reception-orb absolute left-10 top-10 h-56 w-56 rounded-full bg-[var(--accent)]/25 blur-3xl" />
      <div className="reception-orb reception-orb-delay absolute bottom-10 right-10 h-72 w-72 rounded-full bg-[var(--secondary)]/25 blur-3xl" />

      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[var(--primary)]">
          Welcome to the wedding of
        </p>
        <h1 className="font-heading mt-5 text-7xl font-semibold leading-none tracking-tight md:text-9xl">
          {settings.wedding.coupleNames}
        </h1>
        <p className="mt-6 text-2xl text-[var(--foreground)]/70">
          {[settings.wedding.date, settings.wedding.venue].filter(Boolean).join(" · ")}
        </p>

        {data.setupError ? (
          <Card className="mt-10 max-w-2xl bg-white/85">
            <CardContent className="p-6">
              <p className="font-heading text-3xl">Connect Supabase to show live reception data.</p>
              <p className="mt-2 text-sm text-[var(--foreground)]/60">{data.setupError}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mt-14 grid w-full max-w-5xl gap-4 md:grid-cols-4">
              <TvMetric label="Arrived" value={stats.checkedIn} detail={`${totalGuests} total guests`} />
              <TvMetric label="Attendance" value={formatPercent(attendanceRate)} detail="Live check-ins" />
              <TvMetric label="Tables ready" value={ready} detail={`${stats.totalTables} active tables`} />
              <TvMetric label="Partial tables" value={partial} detail={`${stats.availableSeats} seats open`} />
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              {tableSummaries.slice(0, 24).map(({ table, assigned }) => (
                <Badge
                  key={table.id}
                  className={`px-4 py-2 text-base ${
                    assigned >= table.capacity
                      ? "bg-[var(--accent)]"
                      : assigned > 0
                        ? "bg-[var(--secondary)]/55"
                        : "bg-white/55"
                  }`}
                >
                  {table.table_number} {assigned}/{table.capacity}
                </Badge>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function TvMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-[0_20px_70px_rgba(44,42,38,.12)] backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">{label}</p>
      <p className="font-heading mt-3 text-6xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-[var(--foreground)]/60">{detail}</p>
    </div>
  );
}
