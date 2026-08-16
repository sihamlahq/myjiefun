"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { computeStats, sumParty } from "@/lib/stats";
import { cn, formatPercent } from "@/lib/utils";
import type { GuestWithRelations, ReceptionTable, WeddingSettings } from "@/types/wedding";
import { TableGuestsDialog } from "@/components/table-guests-dialog";
import { CheckInPopouts, type CheckInToast } from "@/components/check-in-popouts";
import { tableSide, tableSideCardClass, tableSideLabel } from "@/lib/table-side";

type LiveGuest = GuestWithRelations;
type LiveTable = Pick<
  ReceptionTable,
  "id" | "table_number" | "name" | "capacity" | "table_type" | "status" | "sort_order" | "location"
>;

type Snapshot = {
  guests: LiveGuest[];
  tables: LiveTable[];
  wedding?: WeddingSettings | null;
};

type GuestChangeRow = {
  id?: string;
  name_en?: string | null;
  name_zh?: string | null;
  table_id?: string | null;
  attendance_status?: string | null;
};

const TOAST_TTL_MS = 6500;
const MAX_TOASTS = 4;

export function ReceptionLiveBoard({
  initialGuests,
  initialTables,
  coupleNames,
  subtitle,
}: {
  initialGuests: GuestWithRelations[];
  initialTables: ReceptionTable[];
  coupleNames: string;
  subtitle: string;
}) {
  const [guests, setGuests] = useState<LiveGuest[]>(initialGuests);
  const [tables, setTables] = useState<LiveTable[]>(initialTables);
  const [names, setNames] = useState(coupleNames);
  const [line, setLine] = useState(subtitle);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<"connecting" | "live" | "polling">("connecting");
  const [lastBeat, setLastBeat] = useState<Date | null>(null);
  const [flashTableId, setFlashTableId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<CheckInToast[]>([]);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchLock = useRef(false);
  const checkedInIds = useRef(
    new Set(
      initialGuests
        .filter((guest) => guest.attendance_status === "checked_in")
        .map((guest) => guest.id),
    ),
  );
  const toastTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const tablesRef = useRef(tables);
  tablesRef.current = tables;

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = toastTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.current.delete(id);
    }
  }, []);

  const pushCheckInToast = useCallback(
    (guest: {
      id: string;
      nameEn: string;
      nameZh: string;
      tableId?: string | null;
    }) => {
      if (!guest.id) return;
      const tableNumber =
        tablesRef.current.find((table) => table.id === guest.tableId)?.table_number ?? null;
      const toastId = `${guest.id}-${Date.now()}`;
      const toast: CheckInToast = {
        id: toastId,
        guestId: guest.id,
        nameEn: guest.nameEn || "Guest",
        nameZh: guest.nameZh || "",
        tableNumber,
        createdAt: Date.now(),
      };
      setToasts((current) =>
        [toast, ...current.filter((item) => item.guestId !== guest.id)].slice(0, MAX_TOASTS),
      );
      const timer = setTimeout(() => dismissToast(toastId), TOAST_TTL_MS);
      toastTimers.current.set(toastId, timer);
    },
    [dismissToast],
  );

  const noteNewCheckIns = useCallback(
    (nextGuests: LiveGuest[]) => {
      const nextIds = new Set(
        nextGuests
          .filter((guest) => guest.attendance_status === "checked_in")
          .map((guest) => guest.id),
      );
      for (const guest of nextGuests) {
        if (guest.attendance_status !== "checked_in") continue;
        if (checkedInIds.current.has(guest.id)) continue;
        pushCheckInToast({
          id: guest.id,
          nameEn: guest.name_en,
          nameZh: guest.name_zh,
          tableId: guest.table_id,
        });
      }
      checkedInIds.current = nextIds;
    },
    [pushCheckInToast],
  );

  const applySnapshot = useCallback(
    (json: Snapshot) => {
      noteNewCheckIns(json.guests);
      setGuests(json.guests);
      setTables(json.tables);
      if (json.wedding?.coupleNames) setNames(json.wedding.coupleNames);
      if (json.wedding) {
        setLine([json.wedding.date, json.wedding.venue].filter(Boolean).join(" · "));
      }
      setLastBeat(new Date());
    },
    [noteNewCheckIns],
  );

  const pulseTable = useCallback((tableId: string | null | undefined) => {
    if (!tableId) return;
    setFlashTableId(tableId);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashTableId(null), 1100);
  }, []);

  const fetchSnapshot = useCallback(async () => {
    if (fetchLock.current) return;
    fetchLock.current = true;
    try {
      const res = await fetch("/api/reception-live", { cache: "no-store" });
      if (!res.ok) throw new Error("snapshot failed");
      const json = (await res.json()) as Snapshot & { ok?: boolean };
      applySnapshot(json);
    } finally {
      fetchLock.current = false;
    }
  }, [applySnapshot]);

  useEffect(() => {
    let cancelled = false;
    let supabase: ReturnType<typeof createClient> | null = null;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleSnapshot = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void fetchSnapshot().catch(() => undefined);
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
        .channel(`reception-live-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "guests" },
          (payload) => {
            setLiveState("live");
            setLastBeat(new Date());
            const next = payload.new as GuestChangeRow | null;
            const prev = payload.old as GuestChangeRow | null;
            pulseTable(next?.table_id ?? prev?.table_id ?? null);

            const becameCheckedIn =
              next?.attendance_status === "checked_in" &&
              prev?.attendance_status !== "checked_in" &&
              Boolean(next?.id);

            if (becameCheckedIn && next?.id) {
              if (!checkedInIds.current.has(next.id)) {
                checkedInIds.current.add(next.id);
                pushCheckInToast({
                  id: next.id,
                  nameEn: next.name_en || "",
                  nameZh: next.name_zh || "",
                  tableId: next.table_id,
                });
              }
            } else if (next?.id && next.attendance_status !== "checked_in") {
              checkedInIds.current.delete(next.id);
            }

            scheduleSnapshot();
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "reception_tables" },
          () => {
            setLiveState("live");
            scheduleSnapshot();
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "check_in_events" },
          () => {
            setLiveState("live");
            scheduleSnapshot();
          },
        )
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
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      const timers = toastTimers.current;
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [fetchSnapshot, pulseTable, pushCheckInToast]);

  const stats = useMemo(() => computeStats(guests, tables as ReceptionTable[]), [guests, tables]);
  const summaries = useMemo(() => {
    return [...tables]
      .sort((a, b) => a.sort_order - b.sort_order || a.table_number.localeCompare(b.table_number))
      .map((table) => {
        const seated = guests
          .filter((guest) => guest.table_id === table.id)
          .sort((a, b) => a.name_en.localeCompare(b.name_en));
        return { table, seated };
      });
  }, [guests, tables]);

  const selected = summaries.find((item) => item.table.id === selectedId) ?? null;
  const ready = summaries.filter(
    ({ seated, table }) => sumParty(seated) >= table.capacity,
  ).length;
  const partial = summaries.filter(({ seated, table }) => {
    const headcount = sumParty(seated);
    return headcount > 0 && headcount < table.capacity;
  }).length;
  const totalGuests = stats.totalInvited;
  const attendanceRate = totalGuests ? stats.checkedIn / totalGuests : 0;

  return (
    <>
      <CheckInPopouts toasts={toasts} onDismiss={dismissToast} />

      <div className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]">
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

      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[var(--primary)]">
        Welcome to the wedding of
      </p>
      <h1 className="font-heading mt-5 text-6xl font-semibold leading-none tracking-tight sm:text-7xl md:text-9xl">
        {names}
      </h1>
      <p className="mt-6 text-xl text-[var(--foreground)]/70 sm:text-2xl">{line}</p>

      <div className="mt-12 grid w-full max-w-5xl gap-4 md:grid-cols-4">
        <TvMetric label="Arrived" value={stats.checkedIn} detail={`${totalGuests} total guests`} />
        <TvMetric label="Attendance" value={formatPercent(attendanceRate)} detail="Live check-ins" />
        <TvMetric label="Tables ready" value={ready} detail={`${stats.totalTables} active tables`} />
        <TvMetric label="Partial tables" value={partial} detail={`${stats.availableSeats} seats open`} />
      </div>

      <div className="mt-10 w-full max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--primary)]">
            Tables — tap a number for the guest list
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-sky-400 bg-sky-200" />
              Groom side 男方
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-rose-400 bg-rose-200" />
              Bride side 女方
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {summaries.map(({ table, seated }) => {
            const headcount = sumParty(seated);
            const full = headcount >= table.capacity;
            const hasGuests = headcount > 0 && !full;
            const arrived = sumParty(seated, (g) => g.attendance_status === "checked_in");
            const flashing = flashTableId === table.id;
            const sideClass = tableSideCardClass(table);
            const side = tableSide(table);
            return (
              <button
                key={table.id}
                type="button"
                onClick={() => setSelectedId(table.id)}
                className={cn(
                  "rounded-3xl border px-3 py-4 text-left shadow-sm transition",
                  flashing &&
                    "scale-[1.03] ring-2 ring-emerald-500 ring-offset-2 ring-offset-[var(--background)]",
                  sideClass
                    ? sideClass
                    : full
                      ? "border-[var(--accent)]/50 bg-[var(--accent)]/70"
                      : hasGuests
                        ? "border-[var(--secondary)]/40 bg-[var(--secondary)]/45"
                        : "border-white/70 bg-white/70",
                )}
              >
                <p className="font-heading text-3xl font-semibold leading-none">
                  {table.table_number}
                </p>
                <p className="mt-2 truncate text-xs opacity-70">
                  {side ? tableSideLabel(side) : table.name}
                </p>
                <p className="mt-3 text-sm font-semibold tabular-nums">
                  {headcount}/{table.capacity}
                  <span className="ml-1 font-normal opacity-60">
                    · {arrived} in
                  </span>
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        <TableGuestsDialog
          table={selected.table as ReceptionTable}
          guests={selected.seated}
          onClose={() => setSelectedId(null)}
          mode="simple"
        />
      ) : null}
    </>
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
      <p className="font-heading mt-3 text-5xl font-semibold tabular-nums sm:text-6xl">{value}</p>
      <p className="mt-2 text-sm text-[var(--foreground)]/60">{detail}</p>
    </div>
  );
}
