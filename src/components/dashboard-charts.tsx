"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/page-chrome";
import { cn, formatPercent } from "@/lib/utils";
import type { DashboardStats, GuestWithRelations, ReceptionTable } from "@/types/wedding";

const COLORS = ["#8B7355", "#C9A66B", "#D4AF37", "#B98E5A", "#69513A"];

type OccupancyLevel = "empty" | "partial" | "full";

const OCCUPANCY_COLORS: Record<OccupancyLevel, string> = {
  empty: "#16a34a", // green — almost empty
  partial: "#ea580c", // orange — mid filled
  full: "#dc2626", // red — fully occupied
};

function occupancyLevel(seated: number, capacity: number): OccupancyLevel {
  if (capacity <= 0) return "empty";
  if (seated >= capacity) return "full";
  const rate = seated / capacity;
  if (rate < 0.5) return "empty";
  return "partial";
}

function occupancyBarColor(rate: number): string {
  if (rate >= 1) return OCCUPANCY_COLORS.full;
  if (rate >= 0.5) return OCCUPANCY_COLORS.partial;
  return OCCUPANCY_COLORS.empty;
}

export function DashboardCharts({
  stats,
  guests,
  tables,
}: {
  stats: DashboardStats;
  guests: GuestWithRelations[];
  tables: ReceptionTable[];
}) {
  const totalGuests = guests.length;
  const attendanceRate = totalGuests ? stats.checkedIn / totalGuests : 0;
  const totalSeats = stats.occupiedSeats + stats.availableSeats;
  const occupancyRate = totalSeats ? stats.occupiedSeats / totalSeats : 0;

  const tableOccupancy = useMemo(() => {
    return [...tables]
      .filter((table) => table.status === "active")
      .sort((a, b) => a.sort_order - b.sort_order || a.table_number.localeCompare(b.table_number))
      .map((table) => {
        const seated = guests.filter((guest) => guest.table_id === table.id).length;
        const level = occupancyLevel(seated, table.capacity);
        return {
          id: table.id,
          number: table.table_number,
          seated,
          capacity: table.capacity,
          level,
          color: OCCUPANCY_COLORS[level],
        };
      });
  }, [guests, tables]);

  const levelCounts = useMemo(() => {
    return {
      empty: tableOccupancy.filter((t) => t.level === "empty").length,
      partial: tableOccupancy.filter((t) => t.level === "partial").length,
      full: tableOccupancy.filter((t) => t.level === "full").length,
    };
  }, [tableOccupancy]);

  const rsvpData = ["confirmed", "pending", "maybe", "declined"].map((status) => ({
    name: status,
    value: guests.filter((guest) => guest.rsvp_status === status).length,
  }));

  const attendanceData = [
    { name: "Arrived", value: stats.checkedIn },
    { name: "Waiting", value: stats.notArrived },
    { name: "Walk-ins", value: stats.walkIns },
  ];

  if (!totalGuests && !stats.totalTables) {
    return (
      <EmptyState
        title="No charts yet"
        description="Import guests or seed sample data to reveal attendance, RSVP, and seating trends."
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-end justify-between">
            <span className="font-heading text-5xl font-semibold">
              {formatPercent(attendanceRate)}
            </span>
            <span className="text-sm text-[var(--foreground)]/60">
              {stats.checkedIn} of {totalGuests}
            </span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis hide />
                <Tooltip cursor={{ fill: "rgba(201,166,107,0.12)" }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {attendanceData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RSVP breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rsvpData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={3}
                >
                  {rsvpData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {rsvpData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 capitalize">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                {item.name}: {item.value}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seat occupancy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>{stats.occupiedSeats} assigned seats</span>
              <span className="font-semibold" style={{ color: occupancyBarColor(occupancyRate) }}>
                {formatPercent(occupancyRate)}
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(occupancyRate * 100, 100)}%`,
                  backgroundColor: occupancyBarColor(occupancyRate),
                }}
              />
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-3 text-[11px] font-semibold">
            <LegendDot color={OCCUPANCY_COLORS.empty} label={`Almost empty · ${levelCounts.empty}`} />
            <LegendDot color={OCCUPANCY_COLORS.partial} label={`Filling up · ${levelCounts.partial}`} />
            <LegendDot color={OCCUPANCY_COLORS.full} label={`Full · ${levelCounts.full}`} />
          </div>

          {tableOccupancy.length ? (
            <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5">
              {tableOccupancy.map((table) => (
                <div
                  key={table.id}
                  title={`${table.number}: ${table.seated}/${table.capacity}`}
                  className={cn(
                    "rounded-xl border px-1.5 py-2 text-center text-white shadow-sm",
                  )}
                  style={{
                    backgroundColor: table.color,
                    borderColor: table.color,
                  }}
                >
                  <p className="truncate text-[11px] font-bold leading-none">{table.number}</p>
                  <p className="mt-1 text-[10px] font-semibold tabular-nums opacity-95">
                    {table.seated}/{table.capacity}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--foreground)]/60">No active tables yet.</p>
          )}

          <p className="mt-3 text-sm text-[var(--foreground)]/60">
            {stats.availableSeats} seats remain across {stats.totalTables} active tables.
            {stats.unassignedConfirmed > 0
              ? ` ${stats.unassignedConfirmed} confirmed guests still need a table.`
              : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[var(--foreground)]/75">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
