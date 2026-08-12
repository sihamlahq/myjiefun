"use client";

import { BookOpen, Search, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { AuditLog } from "@/types/wedding";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/page-chrome";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  guest_create: "Created guest",
  guest_update: "Updated guest",
  guest_delete: "Deleted guest",
  guest_import: "Imported guests",
  table_create: "Created table",
  table_update: "Updated table",
  table_delete: "Deleted table",
  seat_assign: "Assigned seat",
  seat_unassign: "Unassigned seat",
  seat_add: "Added seat",
  check_in: "Checked in guest",
  check_in_group: "Checked in group",
  check_in_partial: "Partial check-in",
  check_in_undo: "Undid check-in",
  settings_update: "Updated settings",
  walk_in_create: "Created walk-in",
};

function staffLabel(log: AuditLog) {
  const profile = log.profiles;
  if (!profile) return log.staff_id ? "Unknown staff" : "System";
  return profile.full_name?.trim() || profile.email || "Staff";
}

function detailLine(log: AuditLog) {
  const meta = log.meta ?? {};
  const bits: string[] = [];
  if (typeof meta.field === "string") bits.push(`field: ${meta.field}`);
  if (meta.amount != null) bits.push(`amount: ${String(meta.amount)}`);
  if (meta.count != null) bits.push(`count: ${String(meta.count)}`);
  if (meta.bulk) bits.push("bulk");
  if (meta.passcodeUpdated) bits.push("passcode changed");
  if (log.entity_type) bits.push(log.entity_type);
  if (log.entity_id) bits.push(String(log.entity_id).slice(0, 8));
  return bits.join(" · ");
}

function formatWhen(value: string) {
  try {
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function SettingsLogBook({ logs }: { logs: AuditLog[] }) {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");

  const actions = useMemo(() => {
    const set = new Set(logs.map((log) => log.action));
    return [...set].sort();
  }, [logs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((log) => {
      if (action !== "all" && log.action !== action) return false;
      if (!q) return true;
      const haystack = [
        ACTION_LABELS[log.action] || log.action,
        log.action,
        staffLabel(log),
        log.profiles?.email,
        log.profiles?.role,
        log.entity_type,
        detailLine(log),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [action, logs, query]);

  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Log book
        </CardTitle>
        <CardDescription>
          Recent activity by staff user — check-ins, guest edits, seating, settings, and more.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by user, action, or detail…"
              className="pl-9"
              aria-label="Search log book"
            />
          </div>
          <select
            className="h-11 rounded-xl border border-black/10 bg-white/80 px-3 text-base md:h-10 md:text-sm"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            aria-label="Filter by action"
          >
            <option value="all">All actions</option>
            {actions.map((item) => (
              <option key={item} value={item}>
                {ACTION_LABELS[item] || item}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm text-[var(--foreground)]/55">
          Showing {filtered.length} of {logs.length} entries
        </p>

        {filtered.length ? (
          <ul className="max-h-[28rem] space-y-2 overflow-y-auto touch-scroll pr-1">
            {filtered.map((log) => (
              <li
                key={log.id}
                className="rounded-2xl border border-black/8 bg-white/90 px-3 py-3 shadow-sm sm:px-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight">
                      {ACTION_LABELS[log.action] || log.action}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--foreground)]/70">
                      <span className="inline-flex items-center gap-1 font-medium text-[var(--foreground)]">
                        <UserRound className="h-3.5 w-3.5" />
                        {staffLabel(log)}
                      </span>
                      {log.profiles?.role ? (
                        <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold capitalize">
                          {log.profiles.role.replaceAll("_", " ")}
                        </span>
                      ) : null}
                      {log.profiles?.email ? (
                        <span className="truncate text-[var(--foreground)]/50">
                          {log.profiles.email}
                        </span>
                      ) : null}
                    </p>
                    {detailLine(log) ? (
                      <p className="mt-1 truncate text-xs text-[var(--foreground)]/50">
                        {detailLine(log)}
                      </p>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--foreground)]/45",
                    )}
                  >
                    {formatWhen(log.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={logs.length ? "No matching log entries" : "No activity yet"}
            description={
              logs.length
                ? "Try another search or action filter."
                : "Staff actions will appear here as the wedding team uses the app."
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
