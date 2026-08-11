import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCharts } from "@/components/dashboard-charts";
import { EmptyState, MetricCard, PageHeader, SetupCard } from "@/components/page-chrome";
import { computeStats } from "@/lib/stats";
import { formatPercent } from "@/lib/utils";
import { loadWeddingData, withDefaultSettings } from "@/lib/wedding-data";

export default async function DashboardPage() {
  const data = await loadWeddingData();
  const settings = withDefaultSettings(data.settings);
  const stats = computeStats(data.guests, data.tables);
  const totalGuests = data.guests.length;
  const attendanceRate = totalGuests ? stats.checkedIn / totalGuests : 0;
  const totalSeats = stats.occupiedSeats + stats.availableSeats;
  const occupancyRate = totalSeats ? stats.occupiedSeats / totalSeats : 0;
  const recentArrivals = data.checkInEvents.filter((event) => event.event_type !== "undo").slice(0, 8);

  return (
    <div>
      <PageHeader
        eyebrow="Wedding command center"
        title="Dashboard"
        description={`${settings.wedding.coupleNames} · ${settings.wedding.venue || "Venue pending"}`}
      />

      {data.setupError ? <SetupCard message={data.setupError} /> : null}

      <div className="stat-grid my-6">
        <MetricCard label="Invited" value={stats.totalInvited} detail="Excluding walk-ins" />
        <MetricCard label="Confirmed" value={stats.confirmed} detail={`${stats.pendingRsvp} pending`} />
        <MetricCard
          label="Arrived"
          value={stats.checkedIn}
          detail={`${formatPercent(attendanceRate)} attendance`}
        />
        <MetricCard label="Walk-ins" value={stats.walkIns} detail="Created at reception" />
        <MetricCard label="Tables" value={stats.totalTables} detail={`${stats.availableSeats} seats free`} />
        <MetricCard label="VIPs" value={stats.vipGuests} detail={`${stats.unassignedGuests} unassigned`} />
      </div>

      <DashboardCharts stats={stats} guests={data.guests} />

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Today at a glance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-[var(--muted)]/70 p-4">
              <p className="text-sm text-[var(--foreground)]/60">Attendance</p>
              <p className="font-heading mt-1 text-3xl font-semibold">
                {formatPercent(attendanceRate)}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--muted)]/70 p-4">
              <p className="text-sm text-[var(--foreground)]/60">Occupancy</p>
              <p className="font-heading mt-1 text-3xl font-semibold">
                {formatPercent(occupancyRate)}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--muted)]/70 p-4">
              <p className="text-sm text-[var(--foreground)]/60">No table</p>
              <p className="font-heading mt-1 text-3xl font-semibold">{stats.unassignedGuests}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent arrivals</CardTitle>
          </CardHeader>
          <CardContent>
            {recentArrivals.length ? (
              <ul className="space-y-3">
                {recentArrivals.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/65 px-3 py-2"
                  >
                    <div>
                      <p className="font-semibold">
                        {event.guests?.name_en || event.guests?.guest_code || "Guest"}
                      </p>
                      <p className="text-xs text-[var(--foreground)]/55">
                        {new Date(event.created_at).toLocaleString()} · party {event.party_count}
                      </p>
                    </div>
                    <Badge className="capitalize">{event.event_type.replace("_", " ")}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No arrivals yet"
                description="Check-ins will appear here in realtime during reception."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
