"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { computeStats } from "@/lib/stats";
import { cn, formatPercent } from "@/lib/utils";
import type { GuestWithRelations, ReceptionTable } from "@/types/wedding";
import type { CheckInEventWithGuest } from "@/lib/wedding-data";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCharts } from "@/components/dashboard-charts";
import { EmptyState, MetricCard } from "@/components/page-chrome";

type Snapshot = {
  guests: GuestWithRelations[];
  tables: ReceptionTable[];
  checkInEvents: CheckInEventWithGuest[];
  fetchedAt?: string;
};

function occupancyTone(rate: number) {
  if (rate >= 1) return { bg: "bg-red-100/80", text: "text-red-800", label: "Full" };
  if (rate >= 0.5) return { bg: "bg-orange-100/80", text: "text-orange-800", label: "Filling up" };
  return { bg: "bg-emerald-100/80", text: "text-emerald-800", label: "Almost empty" };
}

export function DashboardLiveBoard({
  initialGuests,
  initialTables,
  initialCheckInEvents,
}: {
  initialGuests: GuestWithRelations[];
  initialTables: ReceptionTable[];
  initialCheckInEvents: CheckInEventWithGuest[];
}) {
  const [guests, setGuests] = useState(initialGuests);
  const [tables, setTables] = useState(initialTables);
  const [checkInEvents, setCheckInEvents] = useState(initialCheckInEvents);
  const [liveState, setLiveState] = useState<"connecting" | "live" | "polling">("connecting");
  const [lastBeat, setLastBeat] = useState<Date | null>(null);
  const fetchLock = useRef(false);

  const applySnapshot = useCallback((json: Snapshot) => {
    setGuests(json.guests);
    setTables(json.tables);
    setCheckInEvents(json.checkInEvents);
    setLastBeat(json.fetchedAt ? new Date(json.fetchedAt) : new Date());
  }, []);

  const fetchSnapshot = useCallback(async () => {
    if (fetchLock.current) return;
    fetchLock.current = true;
    try {
      const res = await fetch("/api/dashboard-live", { cache: "no-store" });
      if (!res.ok) throw new Error("snapshot failed");
      const json = (await res.json()) as Snapshot & { ok?: boolean };
      if (json.ok === false) throw new Error("snapshot failed");
      applySnapshot(json);
    } finally {
      fetchLock.current = false;
    }
  }, [applySnapshot]);

  useEffect(() => {
    setGuests(initialGuests);
    setTables(initialTables);
    setCheckInEvents(initialCheckInEvents);
  }, [initialGuests, initialTables, initialCheckInEvents]);

  useEffect(() => {
    let cancelled = false;
    let supabase: ReturnType<typeof createClient> | null = null;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleSnapshot = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void fetchSnapshot()
          .then(() => {
            if (!cancelled) setLiveState((state) => (state === "live" ? "live" : "polling"));
          })
          .catch(() => undefined);
      }, 150);
    };

    void fetchSnapshot()
      .then(() => {
        if (!cancelled) setLiveState((state) => (state === "live" ? "live" : "polling"));
      })
      .catch(() => undefined);

    try {
      supabase = createClient();
      channel = supabase
        .channel(`dashboard-live-${Date.now()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, () => {
          setLiveState("live");
          scheduleSnapshot();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "reception_tables" }, () => {
          setLiveState("live");
          scheduleSnapshot();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "check_in_events" }, () => {
          setLiveState("live");
          scheduleSnapshot();
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setLiveState("live");
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setLiveState("polling");
        });
    } catch {
      setLiveState("polling");
    }

    const poll = setInterval(() => {
      void fetchSnapshot()
        .then(() => setLiveState((state) => (state === "live" ? "live" : "polling")))
        .catch(() => undefined);
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [fetchSnapshot]);

  const stats = useMemo(() => computeStats(guests, tables), [guests, tables]);
  const totalGuests = stats.totalInvited;
  const attendanceRate = totalGuests ? stats.checkedIn / totalGuests : 0;
  const totalSeats = stats.occupiedSeats + stats.availableSeats;
  const occupancyRate = totalSeats ? stats.occupiedSeats / totalSeats : 0;
  const occupancy = occupancyTone(occupancyRate);
  const recentArrivals = checkInEvents.filter((event) => event.event_type !== "undo").slice(0, 8);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
          <span
            className={cn(
              "inline-flex h-2.5 w-2.5 rounded-full",
              liveState === "live" && "animate-pulse bg-emerald-500",
              liveState === "polling" && "animate-pulse bg-amber-500",
              liveState === "connecting" && "bg-stone-400",
            )}
          />
          <span className="text-[var(--foreground)]/55">
            {liveState === "live" ? "Live" : liveState === "polling" ? "Updating" : "Connecting"}
            {lastBeat ? ` · ${lastBeat.toLocaleTimeString()}` : ""}
          </span>
        </div>
        <p className="text-xs text-[var(--foreground)]/50">
          Metrics refresh automatically as guests check in
        </p>
      </div>

      <div className="stat-grid my-6">
        <MetricCard label="Invited" value={stats.totalInvited} detail="Headcount by party size" />
        <MetricCard label="Confirmed" value={stats.confirmed} detail={`${stats.pendingRsvp} pending`} />
        <MetricCard
          label="Need seating"
          value={stats.unassignedConfirmed}
          detail="Confirmed, no table yet"
        />
        <MetricCard
          label="Arrived"
          value={stats.checkedIn}
          detail={`${formatPercent(attendanceRate)} attendance`}
        />
        <MetricCard label="Tables" value={stats.totalTables} detail={`${stats.availableSeats} seats free`} />
        <MetricCard label="VIPs" value={stats.vipGuests} detail={`${stats.unassignedGuests} total unassigned`} />
      </div>

      <DashboardCharts stats={stats} guests={guests} tables={tables} />

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
            <div className={`rounded-2xl p-4 ${occupancy.bg}`}>
              <p className="text-sm text-[var(--foreground)]/60">Occupancy</p>
              <p className={`font-heading mt-1 text-3xl font-semibold ${occupancy.text}`}>
                {formatPercent(occupancyRate)}
              </p>
              <p className={`mt-1 text-xs font-semibold ${occupancy.text}`}>{occupancy.label}</p>
            </div>
            <div className="rounded-2xl bg-[var(--muted)]/70 p-4">
              <p className="text-sm text-[var(--foreground)]/60">Confirmed, no table</p>
              <p className="font-heading mt-1 text-3xl font-semibold">{stats.unassignedConfirmed}</p>
              <p className="mt-1 text-xs text-[var(--foreground)]/50">
                {stats.unassignedGuests} total unassigned
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Recent arrivals</CardTitle>
              <Badge
                className={cn(
                  liveState === "live" && "bg-emerald-100 text-emerald-900",
                  liveState === "polling" && "bg-amber-100 text-amber-950",
                )}
              >
                {liveState === "live" ? "Live feed" : "Updating"}
              </Badge>
            </div>
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
                description="Check-ins will appear here live during reception."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
