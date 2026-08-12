"use client";

import Fuse from "fuse.js";
import {
  CheckCircle2,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import {
  KeyboardEvent,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  assignGuestToTable,
  checkInGuest,
  undoCheckIn,
} from "@/lib/actions/wedding";
import type { GuestWithRelations, ReceptionTable } from "@/types/wedding";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/page-chrome";
import { cn } from "@/lib/utils";
import { GuestTableLink } from "@/components/table-guests-dialog";

type FilterTab = "waiting" | "arrived" | "all" | "vip";

export function CheckInPanel({
  guests,
  tables,
}: {
  guests: GuestWithRelations[];
  tables: ReceptionTable[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterTab>("waiting");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [partialOpen, setPartialOpen] = useState(false);
  const [partialCount, setPartialCount] = useState(1);
  const [isPending, startTransition] = useTransition();

  const fuse = useMemo(
    () =>
      new Fuse(guests, {
        keys: [
          "name_en",
          "name_zh",
          "phone",
          "guest_code",
          "guest_groups.name",
          "reception_tables.table_number",
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [guests],
  );

  const counts = useMemo(() => {
    const arrived = guests.filter((g) => g.attendance_status === "checked_in").length;
    return {
      total: guests.length,
      arrived,
      waiting: guests.length - arrived,
      vip: guests.filter((g) => g.is_vip && g.attendance_status !== "checked_in").length,
    };
  }, [guests]);

  const searched = useMemo(() => {
    if (!query.trim()) return guests;
    return fuse.search(query.trim()).map((result) => result.item);
  }, [fuse, guests, query]);

  const results = useMemo(() => {
    return searched
      .filter((guest) => {
        if (filter === "waiting") return guest.attendance_status !== "checked_in";
        if (filter === "arrived") return guest.attendance_status === "checked_in";
        if (filter === "vip") return guest.is_vip;
        return true;
      })
      .slice(0, 40);
  }, [searched, filter]);

  const selected = guests.find((guest) => guest.id === selectedId) ?? null;

  useEffect(() => {
    setPartialOpen(false);
    if (selected) setPartialCount(selected.expected_count || 1);
  }, [selected]);

  function runAction(label: string, action: () => Promise<unknown>, closeAfter = false) {
    startTransition(async () => {
      try {
        await action();
        toast.success(label);
        if (closeAfter) setSelectedId(null);
        setQuery("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Action failed.");
      }
    });
  }

  function checkIn(
    guest: GuestWithRelations,
    mode: "check_in" | "group" | "partial" = "check_in",
    partyCount?: number,
  ) {
    const count = partyCount ?? (guest.expected_count || 1);
    runAction(
      mode === "group"
        ? "Group checked in."
        : mode === "partial"
          ? `Checked in ${count} guest(s).`
          : `${guest.name_en} checked in.`,
      () => checkInGuest({ guestId: guest.id, mode, partyCount: count }),
      true,
    );
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const firstWaiting = results.find((g) => g.attendance_status !== "checked_in");
    if (firstWaiting) checkIn(firstWaiting);
  }

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: "waiting", label: "Waiting", count: counts.waiting },
    { id: "arrived", label: "Arrived", count: counts.arrived },
    { id: "vip", label: "VIP left", count: counts.vip },
    { id: "all", label: "All", count: counts.total },
  ];

  return (
    <div className="relative pb-28 lg:pb-4">
      <div className="sticky top-0 z-20 -mx-1 mb-4 space-y-3 bg-[color-mix(in_oklab,var(--background)_92%,white)] px-1 py-3 backdrop-blur-md lg:top-2">
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          <Stat label="Waiting" value={counts.waiting} tone="warn" />
          <Stat label="Arrived" value={counts.arrived} tone="ok" />
          <Stat label="Total" value={counts.total} tone="neutral" />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--primary)]/60" />
          <Input
            autoFocus
            className="checkin-search h-14 rounded-2xl border-black/10 bg-white pl-12 pr-12 text-lg shadow-sm sm:text-xl"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedId(null);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Name, phone, or table…"
            aria-label="Search guests"
          />
          {query ? (
            <button
              type="button"
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/5"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setFilter(tab.id);
                setSelectedId(null);
              }}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition",
                filter === tab.id
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "bg-white/80 text-[var(--foreground)]/70 ring-1 ring-black/8",
              )}
            >
              {tab.label}
              <span className="ml-1.5 opacity-70">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {results.length ? (
        <ul className="mx-auto max-w-3xl space-y-2">
          {results.map((guest) => {
            const arrived = guest.attendance_status === "checked_in";
            const party = guest.expected_count || 1;
            return (
              <li key={guest.id}>
                <div
                  className={cn(
                    "flex items-stretch gap-2 rounded-2xl border bg-white/90 p-2 shadow-sm transition sm:gap-3 sm:p-3",
                    arrived ? "border-emerald-200/80 bg-emerald-50/50" : "border-black/8",
                    selected?.id === guest.id && "ring-2 ring-[var(--accent)]",
                  )}
                >
                  <div className="min-w-0 flex-1 rounded-xl px-2 py-1.5">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setSelectedId(guest.id === selectedId ? null : guest.id)}
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-lg font-semibold leading-tight sm:text-xl">
                            {guest.name_en}
                            {guest.is_vip ? (
                              <span className="ml-2 align-middle rounded bg-[var(--accent)]/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--foreground)]">
                                VIP
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 truncate text-sm text-[var(--foreground)]/55">
                            {[guest.name_zh, guest.phone].filter(Boolean).join(" · ") || guest.guest_code}
                          </p>
                        </div>
                        {arrived ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            In
                          </span>
                        ) : null}
                      </div>
                    </button>
                    <p className="mt-1 text-sm font-medium text-[var(--foreground)]/75">
                      <GuestTableLink
                        guest={guest}
                        tables={tables}
                        guests={guests}
                        className="font-medium"
                      />
                      {guest.guest_groups?.name ? ` · ${guest.guest_groups.name}` : ""}
                      {party > 1 ? ` · party of ${party}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col justify-center pr-1">
                    {arrived ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-11 min-w-[5.5rem] px-3"
                        disabled={isPending}
                        onClick={() =>
                          runAction("Check-in undone.", () => undoCheckIn(guest.id))
                        }
                      >
                        <RotateCcw className="h-4 w-4" />
                        Undo
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        className="h-12 min-w-[6.5rem] px-4 text-base"
                        disabled={isPending}
                        onClick={() => checkIn(guest)}
                      >
                        Check in
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title={query ? "No matching guests" : "Nobody in this list"}
          description={
            query
              ? "Try another name, phone, or table number."
              : filter === "waiting"
                ? "Everyone is checked in — nice work."
                : "Switch filters to see more guests."
          }
        />
      )}

      {selected ? (
        <div className="fixed inset-x-0 bottom-16 z-40 border-t border-black/10 bg-white/95 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md md:bottom-0 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[380px] lg:rounded-3xl lg:border lg:shadow-xl">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-heading text-2xl font-semibold leading-tight">{selected.name_en}</p>
              <p className="text-sm text-[var(--foreground)]/60">
                {[selected.name_zh, selected.guest_groups?.name].filter(Boolean).join(" · ")}
                {selected.table_id ? (
                  <>
                    {(selected.name_zh || selected.guest_groups?.name) ? " · " : null}
                    <GuestTableLink guest={selected} tables={tables} guests={guests} />
                  </>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              className="rounded-full bg-black/5 p-2"
              onClick={() => setSelectedId(null)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <MiniStat label="RSVP" value={selected.rsvp_status} />
            <MiniStat label="Party" value={String(selected.expected_count || 1)} />
            <MiniStat
              label="Status"
              value={selected.attendance_status === "checked_in" ? "Arrived" : "Waiting"}
            />
          </div>

          <div className="mt-3 space-y-2">
            {selected.attendance_status === "checked_in" ? (
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                disabled={isPending}
                onClick={() =>
                  runAction("Check-in undone.", () => undoCheckIn(selected.id), true)
                }
              >
                <RotateCcw className="h-4 w-4" /> Undo check-in
              </Button>
            ) : (
              <>
                <Button
                  className="w-full"
                  size="xl"
                  disabled={isPending}
                  onClick={() => checkIn(selected)}
                >
                  <CheckCircle2 className="h-5 w-5" /> Check in now
                </Button>
                {selected.group_id ? (
                  <Button
                    variant="gold"
                    className="w-full"
                    size="lg"
                    disabled={isPending}
                    onClick={() => checkIn(selected, "group")}
                  >
                    <Users className="h-4 w-4" /> Check in whole group
                  </Button>
                ) : null}
                {!partialOpen ? (
                  <Button
                    variant="secondary"
                    className="w-full"
                    size="lg"
                    disabled={isPending}
                    onClick={() => setPartialOpen(true)}
                  >
                    Partial party…
                  </Button>
                ) : (
                  <div className="rounded-2xl bg-[var(--muted)]/80 p-3">
                    <p className="mb-2 text-sm font-medium">How many arrived?</p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-11"
                        onClick={() => setPartialCount((n) => Math.max(1, n - 1))}
                      >
                        −
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        className="h-11 text-center text-lg font-semibold"
                        value={partialCount}
                        onChange={(event) => setPartialCount(Number(event.target.value))}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-11"
                        onClick={() => setPartialCount((n) => n + 1)}
                      >
                        +
                      </Button>
                      <Button
                        className="h-11 flex-1"
                        disabled={isPending}
                        onClick={() => checkIn(selected, "partial", partialCount)}
                      >
                        Confirm
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs">Move to table</Label>
              <select
                className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm"
                value={selected.table_id ?? ""}
                onChange={(event) => {
                  const tableId = event.target.value || null;
                  runAction("Table updated.", () =>
                    assignGuestToTable({ guestId: selected.id, tableId }),
                  );
                }}
              >
                <option value="">Unassigned</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.table_number} · {table.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl px-3 py-2.5 text-center shadow-sm",
        tone === "ok" && "bg-emerald-50 text-emerald-900",
        tone === "warn" && "bg-amber-50 text-amber-950",
        tone === "neutral" && "bg-white/90 text-[var(--foreground)]",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-60">{label}</p>
      <p className="font-heading text-2xl font-semibold leading-none">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--muted)]/80 px-2 py-2">
      <p className="uppercase tracking-[0.12em] text-[var(--foreground)]/45">{label}</p>
      <p className="mt-0.5 truncate font-semibold capitalize">{value}</p>
    </div>
  );
}
