"use client";

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
import { formatPercent } from "@/lib/utils";
import type { DashboardStats, GuestWithRelations } from "@/types/wedding";

const COLORS = ["#8B7355", "#C9A66B", "#D4AF37", "#B98E5A", "#69513A"];

export function DashboardCharts({
  stats,
  guests,
}: {
  stats: DashboardStats;
  guests: GuestWithRelations[];
}) {
  const totalGuests = guests.length;
  const attendanceRate = totalGuests ? stats.checkedIn / totalGuests : 0;
  const totalSeats = stats.occupiedSeats + stats.availableSeats;
  const occupancyRate = totalSeats ? stats.occupiedSeats / totalSeats : 0;

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
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>{stats.occupiedSeats} assigned seats</span>
              <span>{formatPercent(occupancyRate)}</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--accent))]"
                style={{ width: `${Math.min(occupancyRate * 100, 100)}%` }}
              />
            </div>
          </div>
          <svg viewBox="0 0 220 140" role="img" aria-label="Ballroom occupancy" className="w-full">
            <rect x="10" y="10" width="200" height="120" rx="24" fill="rgba(255,255,255,0.6)" />
            {Array.from({ length: 24 }, (_, index) => {
              const active = totalSeats ? index / 24 < occupancyRate : false;
              const x = 34 + (index % 6) * 30;
              const y = 32 + Math.floor(index / 6) * 24;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="9"
                  fill={active ? "var(--accent)" : "var(--muted)"}
                  stroke="var(--primary)"
                  strokeOpacity="0.25"
                />
              );
            })}
          </svg>
          <p className="mt-3 text-sm text-[var(--foreground)]/60">
            {stats.availableSeats} seats remain across {stats.totalTables} active tables.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
