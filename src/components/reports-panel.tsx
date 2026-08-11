"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { rowsToCsv } from "@/lib/csv";
import type { CheckInEventWithGuest } from "@/lib/wedding-data";
import type { GuestGroup, GuestWithRelations, ReceptionTable } from "@/types/wedding";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/page-chrome";

type ReportTab =
  | "attendance"
  | "occupancy"
  | "rsvp"
  | "unassigned"
  | "vip"
  | "noShows"
  | "walkIns"
  | "timeline"
  | "groups";

type ReportRow = Record<string, string | number | boolean>;

const tabs: { id: ReportTab; label: string }[] = [
  { id: "attendance", label: "Attendance" },
  { id: "occupancy", label: "Occupancy" },
  { id: "rsvp", label: "RSVP" },
  { id: "unassigned", label: "Unassigned" },
  { id: "vip", label: "VIP" },
  { id: "noShows", label: "No-shows" },
  { id: "walkIns", label: "Walk-ins" },
  { id: "timeline", label: "Timeline" },
  { id: "groups", label: "Groups" },
];

export function ReportsPanel({
  guests,
  tables,
  groups,
  events,
}: {
  guests: GuestWithRelations[];
  tables: ReceptionTable[];
  groups: GuestGroup[];
  events: CheckInEventWithGuest[];
}) {
  const [tab, setTab] = useState<ReportTab>("attendance");
  const [query, setQuery] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");

  const filteredGuests = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return guests.filter((guest) => {
      if (tableFilter !== "all" && (guest.table_id ?? "unassigned") !== tableFilter) return false;
      if (groupFilter !== "all" && (guest.group_id ?? "ungrouped") !== groupFilter) return false;
      if (!needle) return true;
      return [
        guest.name_en,
        guest.name_zh,
        guest.phone,
        guest.guest_code,
        guest.guest_groups?.name,
        guest.reception_tables?.table_number,
      ].some((value) => value?.toLowerCase().includes(needle));
    });
  }, [groupFilter, guests, query, tableFilter]);

  const rows = useMemo(
    () => buildRows(tab, filteredGuests, tables, groups, events),
    [events, filteredGuests, groups, tables, tab],
  );

  function exportCsv() {
    const headers = Object.keys(rows[0] ?? { empty: "" });
    const csv = rowsToCsv(headers, rows.map((row) => headers.map((header) => row[header])));
    download(`myjiefun-${tab}.csv`, csv, "text/csv;charset=utf-8");
  }

  function exportExcel() {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), tab);
    XLSX.writeFile(workbook, `myjiefun-${tab}.xlsx`);
  }

  function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape" });
    const headers = Object.keys(rows[0] ?? { empty: "" });
    doc.text(`Myjiefun ${tab} report`, 14, 14);
    autoTable(doc, {
      head: [headers],
      body: rows.map((row) => headers.map((header) => String(row[header] ?? ""))),
      startY: 20,
      styles: { fontSize: 8 },
    });
    doc.save(`myjiefun-${tab}.pdf`);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tab === item.id
                    ? "bg-[var(--primary)] text-white"
                    : "bg-white/70 text-[var(--foreground)]/70 hover:bg-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter report..." />
            <select className="rounded-xl border border-black/10 bg-white/80 px-3 text-sm" value={tableFilter} onChange={(event) => setTableFilter(event.target.value)}>
              <option value="all">All tables</option>
              <option value="unassigned">Unassigned</option>
              {tables.map((table) => <option key={table.id} value={table.id}>{table.table_number}</option>)}
            </select>
            <select className="rounded-xl border border-black/10 bg-white/80 px-3 text-sm" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
              <option value="all">All groups</option>
              <option value="ungrouped">Ungrouped</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> CSV</Button>
              <Button variant="outline" onClick={exportExcel}>Excel</Button>
              <Button variant="outline" onClick={exportPdf}>PDF</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          {rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-[var(--foreground)]/50">
                  <tr className="border-b border-black/10">
                    {Object.keys(rows[0]).map((header) => <th key={header} className="py-3 pr-4">{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="border-b border-black/5">
                      {Object.keys(rows[0]).map((header) => <td key={header} className="py-3 pr-4">{String(row[header] ?? "")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No report rows" description="Adjust filters or add wedding data." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function buildRows(
  tab: ReportTab,
  guests: GuestWithRelations[],
  tables: ReceptionTable[],
  groups: GuestGroup[],
  events: CheckInEventWithGuest[],
): ReportRow[] {
  if (tab === "occupancy") {
    return tables.map((table) => {
      const assigned = guests.filter((guest) => guest.table_id === table.id).length;
      return {
        table: table.table_number,
        name: table.name,
        type: table.table_type,
        status: table.status,
        capacity: table.capacity,
        assigned,
        available: Math.max(table.capacity - assigned, 0),
      };
    });
  }

  if (tab === "rsvp") {
    return ["confirmed", "pending", "maybe", "declined"].map((status) => ({
      status,
      guests: guests.filter((guest) => guest.rsvp_status === status).length,
    }));
  }

  if (tab === "groups") {
    return groups.map((group) => {
      const members = guests.filter((guest) => guest.group_id === group.id);
      return {
        group: group.name,
        expected: group.expected_count ?? members.reduce((sum, guest) => sum + guest.expected_count, 0),
        guests: members.length,
        checked_in: members.filter((guest) => guest.attendance_status === "checked_in").length,
        unassigned: members.filter((guest) => !guest.table_id).length,
      };
    });
  }

  if (tab === "timeline") {
    return events.map((event) => ({
      time: new Date(event.created_at).toLocaleString(),
      guest: event.guests?.name_en ?? event.guest_id,
      event: event.event_type,
      party_count: event.party_count,
      notes: event.notes,
    }));
  }

  const predicates: Record<Exclude<ReportTab, "occupancy" | "rsvp" | "groups" | "timeline">, (guest: GuestWithRelations) => boolean> = {
    attendance: () => true,
    unassigned: (guest) => !guest.table_id,
    vip: (guest) => guest.is_vip,
    noShows: (guest) => guest.attendance_status === "no_show",
    walkIns: (guest) => guest.is_walk_in || guest.attendance_status === "walk_in",
  };

  return guests.filter(predicates[tab]).map((guest) => ({
    code: guest.guest_code,
    name: guest.name_en,
    chinese_name: guest.name_zh,
    phone: guest.phone,
    group: guest.guest_groups?.name ?? "",
    rsvp: guest.rsvp_status,
    attendance: guest.attendance_status,
    table: guest.reception_tables?.table_number ?? "Unassigned",
    vip: guest.is_vip,
    walk_in: guest.is_walk_in,
    checked_in_at: guest.checked_in_at ?? "",
  }));
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
