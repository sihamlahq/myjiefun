"use client";

import { DndContext, type DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, GripVertical, Plus, Search, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { addSeatToTable, assignGuestToTable } from "@/lib/actions/wedding";
import { suppressRealtimeRefresh } from "@/lib/client-refresh";
import { sumParty } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { GuestWithRelations, ReceptionTable } from "@/types/wedding";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/page-chrome";
import { TableNumberButton } from "@/components/table-guests-dialog";
import {
  tableSide,
  tableSideBadgeClass,
  tableSideCardClass,
  tableSideLabel,
  tableTypeLabel,
} from "@/lib/table-side";

const unassignedId = "drop:unassigned";

function useDesktopDrag() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const sync = () => setEnabled(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return enabled;
}

export function SeatingBoard({
  guests: serverGuests,
  tables,
}: {
  guests: GuestWithRelations[];
  tables: ReceptionTable[];
}) {
  const [guests, setGuests] = useState(serverGuests);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [seatPending, setSeatPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const desktopDrag = useDesktopDrag();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  useEffect(() => {
    setGuests(serverGuests);
  }, [serverGuests]);

  const guestsByTable = useMemo(() => {
    const map = new Map<string, GuestWithRelations[]>();
    for (const table of tables) map.set(table.id, []);
    for (const guest of guests) {
      if (guest.table_id) map.get(guest.table_id)?.push(guest);
    }
    return map;
  }, [guests, tables]);

  const unassigned = guests.filter((guest) => !guest.table_id);
  const activeTables = useMemo(
    () =>
      [...tables]
        .filter((table) => table.status === "active")
        .sort(
          (a, b) =>
            a.sort_order - b.sort_order || a.table_number.localeCompare(b.table_number),
        ),
    [tables],
  );

  function assignTable(
    guestId: string,
    tableId: string | null,
    fromTableId?: string | null,
    opts?: { confirmMove?: boolean },
  ) {
    if ((fromTableId ?? null) === tableId) return;
    if (opts?.confirmMove && fromTableId && !confirm("Move this guest from their current table?")) {
      return;
    }

    const snapshot = guests;
    const table = tableId ? (tables.find((item) => item.id === tableId) ?? null) : null;
    setGuests((prev) =>
      prev.map((guest) =>
        guest.id === guestId
          ? {
              ...guest,
              table_id: tableId,
              seat_id: null,
              reception_tables: table,
            }
          : guest,
      ),
    );
    toast.success(tableId ? "Guest assigned to table." : "Guest moved to unassigned.");
    suppressRealtimeRefresh(1600);
    setBusyIds((prev) => new Set(prev).add(guestId));

    startTransition(async () => {
      try {
        await assignGuestToTable({ guestId, tableId });
      } catch (error) {
        setGuests(snapshot);
        toast.error(error instanceof Error ? error.message : "Unable to assign guest.");
      } finally {
        setBusyIds((prev) => {
          const next = new Set(prev);
          next.delete(guestId);
          return next;
        });
      }
    });
  }

  function onDragEnd(event: DragEndEvent) {
    if (!desktopDrag) return;
    const guestId = String(event.active.id).replace("guest:", "");
    const guest = guests.find((item) => item.id === guestId);
    const overId = event.over ? String(event.over.id) : "";
    if (!guest || !overId) return;

    const tableId = overId === unassignedId ? null : overId.replace("drop:table:", "");
    assignTable(guestId, tableId, guest.table_id, { confirmMove: true });
  }

  function addSeat(table: ReceptionTable) {
    suppressRealtimeRefresh(1600);
    setSeatPending(table.id);
    startTransition(async () => {
      try {
        await addSeatToTable(table.id);
        toast.success(`Added a seat to ${table.table_number}.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to add seat.");
      } finally {
        setSeatPending(null);
      }
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="space-y-4 lg:hidden">
        <p className="rounded-2xl bg-[var(--muted)]/70 px-3 py-2 text-sm text-[var(--foreground)]/70">
          On mobile, use <span className="font-semibold">Add guest to this table</span> on each
          table, or <span className="font-semibold">Assign / Move to table</span> under a guest.
        </p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <UnassignedDrop
          guests={unassigned}
          tables={activeTables}
          guestsByTable={guestsByTable}
          busyIds={busyIds}
          desktopDrag={desktopDrag}
          onAssign={(guestId, tableId) => assignTable(guestId, tableId, null)}
        />

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="hidden text-sm text-[var(--foreground)]/60 lg:block">
              Desktop: drag guests, or use the table menu on each card.
            </p>
            <Link href="/guests" className="ml-auto" prefetch>
              <Button variant="outline">
                <UserPlus className="h-4 w-4" /> Add guest
              </Button>
            </Link>
          </div>
          {tables.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tables.map((table) => (
                <TableDrop
                  key={table.id}
                  table={table}
                  guests={guestsByTable.get(table.id) ?? []}
                  allGuests={guests}
                  tables={activeTables}
                  guestsByTable={guestsByTable}
                  onAddSeat={() => addSeat(table)}
                  seatPending={seatPending === table.id}
                  busyIds={busyIds}
                  desktopDrag={desktopDrag}
                  onAssign={(guestId, tableId) =>
                    assignTable(guestId, tableId, table.id)
                  }
                  onAddGuest={(guestId) => {
                    const guest = guests.find((item) => item.id === guestId);
                    if (!guest) return;
                    assignTable(guestId, table.id, guest.table_id, {
                      confirmMove: Boolean(guest.table_id),
                    });
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No tables to seat"
              description="Create tables first, then assign guests with the table menu."
            />
          )}
        </div>
      </div>
    </DndContext>
  );
}

function TableSelect({
  guest,
  tables,
  guestsByTable,
  pending,
  currentTableId,
  placeholder,
  compact = false,
  onAssign,
}: {
  guest: GuestWithRelations;
  tables: ReceptionTable[];
  guestsByTable: Map<string, GuestWithRelations[]>;
  pending: boolean;
  currentTableId?: string | null;
  placeholder: string;
  compact?: boolean;
  onAssign: (guestId: string, tableId: string | null) => void;
}) {
  return (
    <label className={cn("block shrink-0", compact ? "w-[7.5rem]" : "w-[8.5rem]")}>
      <span className="sr-only">{placeholder}</span>
      <select
        className={cn(
          "w-full rounded-lg border border-black/10 bg-[var(--background)] px-1.5 font-semibold text-[var(--foreground)] disabled:opacity-60",
          compact ? "h-7 text-[11px]" : "h-8 text-xs",
        )}
        defaultValue=""
        disabled={pending || !tables.length}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const value = event.target.value;
          if (!value) return;
          onAssign(guest.id, value === "__unassigned__" ? null : value);
          event.target.value = "";
        }}
      >
        <option value="" disabled>
          {tables.length ? placeholder : "No tables"}
        </option>
        {currentTableId ? <option value="__unassigned__">Unassigned</option> : null}
        {tables.map((table) => {
          const seated = guestsByTable.get(table.id)?.length ?? 0;
          const side = tableSide(table);
          const fullness = seated >= table.capacity ? "full" : `${seated}/${table.capacity}`;
          const current = table.id === currentTableId ? " · current" : "";
          return (
            <option key={table.id} value={table.id} disabled={table.id === currentTableId}>
              {table.table_number}
              {side ? ` · ${side === "groom" ? "男方" : "女方"}` : ""}
              {` · ${fullness}`}
              {current}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function UnassignedDrop({
  guests,
  tables,
  guestsByTable,
  busyIds,
  desktopDrag,
  onAssign,
}: {
  guests: GuestWithRelations[];
  tables: ReceptionTable[];
  guestsByTable: Map<string, GuestWithRelations[]>;
  busyIds: Set<string>;
  desktopDrag: boolean;
  onAssign: (guestId: string, tableId: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: unassignedId, disabled: !desktopDrag });

  return (
    <Card
      className={cn(
        "xl:sticky xl:top-6 xl:flex xl:max-h-[calc(100dvh-5rem)] xl:flex-col",
        isOver && "ring-2 ring-[var(--accent)]",
      )}
    >
      <CardHeader className="shrink-0">
        <CardTitle>Unassigned guests</CardTitle>
        <p className="text-sm text-[var(--foreground)]/60">
          {guests.length
            ? `${sumParty(guests)} people · ${guests.length} records · scroll to see all`
            : "Choose a table number below each name."}
        </p>
      </CardHeader>
      <CardContent className="min-h-0 xl:flex-1 xl:overflow-hidden">
        <div
          ref={setNodeRef}
          className="max-h-[min(28rem,60dvh)] space-y-2 overflow-y-auto overscroll-contain touch-scroll xl:h-full xl:max-h-none"
        >
          {guests.length ? (
            guests.map((guest) => (
              <GuestCard
                key={guest.id}
                guest={guest}
                tables={tables}
                guestsByTable={guestsByTable}
                pending={busyIds.has(guest.id)}
                desktopDrag={desktopDrag}
                placeholder="Assign…"
                compact
                onAssign={(guestId, tableId) => {
                  if (tableId) onAssign(guestId, tableId);
                }}
              />
            ))
          ) : (
            <EmptyState
              title="All assigned"
              description="Use Move on a seated guest to free a seat."
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TableDrop({
  table,
  guests,
  allGuests,
  tables,
  guestsByTable,
  onAddSeat,
  seatPending,
  busyIds,
  desktopDrag,
  onAssign,
  onAddGuest,
}: {
  table: ReceptionTable;
  guests: GuestWithRelations[];
  allGuests: GuestWithRelations[];
  tables: ReceptionTable[];
  guestsByTable: Map<string, GuestWithRelations[]>;
  onAddSeat: () => void;
  seatPending: boolean;
  busyIds: Set<string>;
  desktopDrag: boolean;
  onAssign: (guestId: string, tableId: string | null) => void;
  onAddGuest: (guestId: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `drop:table:${table.id}`,
    disabled: !desktopDrag,
  });
  const occupancy = table.capacity ? sumParty(guests) / table.capacity : 0;
  const over = sumParty(guests) > table.capacity;
  const headcount = sumParty(guests);

  return (
    <Card
      className={cn(
        "flex max-h-[min(22rem,62dvh)] flex-col overflow-hidden",
        isOver && "ring-2 ring-[var(--accent)]",
        over && "border-red-300",
        tableSideCardClass(table),
      )}
    >
      <CardHeader className="shrink-0 space-y-1.5 px-3 py-2.5 pb-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="leading-none">
              <TableNumberButton
                table={table}
                guests={allGuests}
                className="font-heading text-lg no-underline hover:underline"
              />
            </CardTitle>
            <p
              className="mt-0.5 truncate text-xs text-[var(--foreground)]/60"
              title={table.name}
            >
              {table.name}
            </p>
          </div>
          <Badge
            className={cn(
              "shrink-0 px-2 py-0.5 text-[10px] capitalize",
              table.table_type === "vip" && "bg-[var(--accent)]",
              tableSideBadgeClass(table),
            )}
          >
            {tableSide(table) ? tableSideLabel(tableSide(table)) : tableTypeLabel(table.table_type)}
          </Badge>
        </div>
        <div>
          <div className="mb-0.5 flex justify-between text-[10px] text-[var(--foreground)]/60">
            <span>
              {headcount}/{table.capacity}
              {guests.length ? ` · ${guests.length}` : ""}
            </span>
            <span>{table.status}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className={cn("h-full rounded-full", over ? "bg-red-600" : "bg-[var(--accent)]")}
              style={{ width: `${Math.min(occupancy * 100, 100)}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-1.5 px-3 pb-2.5 pt-0">
        <div
          ref={setNodeRef}
          className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain touch-scroll pr-0.5"
        >
          {guests.length ? (
            guests.map((guest) => (
              <GuestCard
                key={guest.id}
                guest={guest}
                tables={tables}
                guestsByTable={guestsByTable}
                pending={busyIds.has(guest.id)}
                desktopDrag={desktopDrag}
                currentTableId={table.id}
                placeholder="Move…"
                compact
                onAssign={onAssign}
              />
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-black/10 px-2 py-2 text-center text-xs text-[var(--foreground)]/55">
              No guests yet — pick someone below.
            </p>
          )}
        </div>

        <div className="shrink-0 space-y-1.5 border-t border-black/6 pt-1.5">
          <AddGuestPicker
            tableId={table.id}
            allGuests={allGuests}
            busyIds={busyIds}
            disabled={seatPending}
            onAddGuest={onAddGuest}
          />

          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onAddSeat} disabled={seatPending}>
            <Plus className="h-3.5 w-3.5" /> Add seat
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AddGuestPicker({
  tableId,
  allGuests,
  busyIds,
  disabled,
  onAddGuest,
}: {
  tableId: string;
  allGuests: GuestWithRelations[];
  busyIds: Set<string>;
  disabled: boolean;
  onAddGuest: (guestId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const addableGuests = useMemo(() => {
    const unassigned = allGuests
      .filter((guest) => !guest.table_id)
      .sort((a, b) => a.name_en.localeCompare(b.name_en));
    const elsewhere = allGuests
      .filter((guest) => guest.table_id && guest.table_id !== tableId)
      .sort((a, b) => a.name_en.localeCompare(b.name_en));
    return { unassigned, elsewhere };
  }, [allGuests, tableId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (guest: GuestWithRelations) => {
      if (!q) return true;
      return [guest.name_en, guest.name_zh, guest.nickname, guest.phone, guest.guest_code]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q));
    };
    return {
      unassigned: addableGuests.unassigned.filter(match).slice(0, 20),
      elsewhere: addableGuests.elsewhere.filter(match).slice(0, 20),
    };
  }, [addableGuests, query]);

  const totalAvailable =
    addableGuests.unassigned.length + addableGuests.elsewhere.length;
  const totalShown = filtered.unassigned.length + filtered.elsewhere.length;
  const addDisabled = disabled || totalAvailable === 0;

  function pickGuest(guestId: string) {
    onAddGuest(guestId);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="space-y-1">
      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]/55">
        <UserPlus className="h-3 w-3" />
        Add guest
      </span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/40" />
        <Input
          value={query}
          disabled={addDisabled}
          placeholder={addDisabled ? "No guests available" : "Search guest…"}
          className="h-9 pl-8 pr-9 text-xs"
          aria-label="Search guest to add"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
        />
        {query ? (
          <button
            type="button"
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/5"
            onClick={() => {
              setQuery("");
              setOpen(true);
            }}
            aria-label="Clear guest search"
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}
      </div>

      {open && !addDisabled ? (
        <div className="max-h-40 overflow-y-auto rounded-xl border border-black/10 bg-white shadow-sm touch-scroll">
          {totalShown ? (
            <div className="py-1">
              {filtered.unassigned.length ? (
                <div>
                  <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]/45">
                    Unassigned
                  </p>
                  {filtered.unassigned.map((guest) => (
                    <button
                      key={guest.id}
                      type="button"
                      disabled={busyIds.has(guest.id)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-black/5 disabled:opacity-50"
                      onClick={() => pickGuest(guest.id)}
                    >
                      <span className="font-semibold leading-tight">
                        {guest.name_en}
                        {guest.is_vip ? " · VIP" : ""}
                      </span>
                      <span className="text-xs text-[var(--foreground)]/55">
                        {[guest.name_zh, guest.phone].filter(Boolean).join(" · ") || guest.guest_code}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {filtered.elsewhere.length ? (
                <div>
                  <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]/45">
                    Seated elsewhere
                  </p>
                  {filtered.elsewhere.map((guest) => (
                    <button
                      key={guest.id}
                      type="button"
                      disabled={busyIds.has(guest.id)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-black/5 disabled:opacity-50"
                      onClick={() => pickGuest(guest.id)}
                    >
                      <span className="font-semibold leading-tight">{guest.name_en}</span>
                      <span className="text-xs text-[var(--foreground)]/55">
                        {[
                          guest.name_zh,
                          guest.reception_tables?.table_number
                            ? `now ${guest.reception_tables.table_number}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="px-3 py-4 text-center text-sm text-[var(--foreground)]/55">
              No matching guests
            </p>
          )}
          <button
            type="button"
            className="w-full border-t border-black/8 px-3 py-2 text-center text-xs font-semibold text-[var(--foreground)]/55 hover:bg-black/5"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}

function GuestCard({
  guest,
  tables,
  guestsByTable,
  pending,
  desktopDrag,
  currentTableId = null,
  placeholder,
  compact = false,
  onAssign,
}: {
  guest: GuestWithRelations;
  tables: ReceptionTable[];
  guestsByTable: Map<string, GuestWithRelations[]>;
  pending: boolean;
  desktopDrag: boolean;
  currentTableId?: string | null;
  placeholder: string;
  compact?: boolean;
  onAssign: (guestId: string, tableId: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `guest:${guest.id}`,
    disabled: pending || !desktopDrag,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
  };
  const secondary = compact
    ? [guest.name_zh, guest.expected_count > 1 ? `×${guest.expected_count}` : null]
        .filter(Boolean)
        .join(" · ")
    : [guest.name_zh, guest.guest_groups?.name, `party ${guest.expected_count}`]
        .filter(Boolean)
        .join(" · ");
  const shortPlaceholder = compact
    ? placeholder.toLowerCase().includes("move")
      ? "Move…"
      : "Assign…"
    : placeholder;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-black/8 bg-white/90 text-sm shadow-sm",
        compact ? "px-2 py-1" : "px-2.5 py-1.5",
        isDragging && "opacity-60 shadow-xl",
      )}
    >
      <div className="flex items-center gap-1.5">
        {desktopDrag ? (
          <button
            type="button"
            className="hidden shrink-0 cursor-grab touch-none text-[var(--foreground)]/35 lg:block"
            aria-label={`Drag ${guest.name_en}`}
            {...listeners}
            {...attributes}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            <p
              className={cn(
                "min-w-0 truncate font-semibold leading-tight",
                compact ? "text-xs" : "text-sm",
              )}
              title={guest.name_en}
            >
              {guest.name_en}
            </p>
            {guest.is_vip ? (
              <Badge className="h-5 shrink-0 bg-[var(--accent)] px-1.5 text-[10px]">VIP</Badge>
            ) : null}
            {guest.attendance_status === "checked_in" ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-700" />
            ) : null}
          </div>
          {secondary ? (
            <p
              className="truncate text-[10px] leading-tight text-[var(--foreground)]/50"
              title={secondary}
            >
              {secondary}
            </p>
          ) : null}
        </div>

        <TableSelect
          guest={guest}
          tables={tables}
          guestsByTable={guestsByTable}
          pending={pending}
          currentTableId={currentTableId}
          placeholder={shortPlaceholder}
          compact={compact}
          onAssign={onAssign}
        />
      </div>
    </div>
  );
}
