"use client";

import { DndContext, type DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, GripVertical, Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { addSeatToTable, assignGuestToTable } from "@/lib/actions/wedding";
import { suppressRealtimeRefresh } from "@/lib/client-refresh";
import { cn } from "@/lib/utils";
import type { GuestWithRelations, ReceptionTable } from "@/types/wedding";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          On mobile, use <span className="font-semibold">Assign / Move to table</span> under each guest.
        </p>
      </div>

      <div className="mt-4 grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
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
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
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
  onAssign,
}: {
  guest: GuestWithRelations;
  tables: ReceptionTable[];
  guestsByTable: Map<string, GuestWithRelations[]>;
  pending: boolean;
  currentTableId?: string | null;
  placeholder: string;
  onAssign: (guestId: string, tableId: string | null) => void;
}) {
  return (
    <label className="mt-2 block">
      <span className="sr-only">{placeholder}</span>
      <select
        className="h-10 w-full rounded-xl border border-black/10 bg-[var(--background)] px-2.5 text-sm font-semibold text-[var(--foreground)] disabled:opacity-60"
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
          {tables.length ? placeholder : "No active tables"}
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
    <Card className={cn("h-fit xl:sticky xl:top-6", isOver && "ring-2 ring-[var(--accent)]")}>
      <CardHeader>
        <CardTitle>Unassigned guests</CardTitle>
        <p className="text-sm text-[var(--foreground)]/60">
          Choose a table number below each name.
        </p>
      </CardHeader>
      <CardContent>
        <div ref={setNodeRef} className="min-h-24 space-y-2">
          {guests.length ? (
            guests.map((guest) => (
              <GuestCard
                key={guest.id}
                guest={guest}
                tables={tables}
                guestsByTable={guestsByTable}
                pending={busyIds.has(guest.id)}
                desktopDrag={desktopDrag}
                placeholder="Assign to table…"
                onAssign={(guestId, tableId) => {
                  if (tableId) onAssign(guestId, tableId);
                }}
              />
            ))
          ) : (
            <EmptyState
              title="All assigned"
              description="Use Move to table on a seated guest to free a seat."
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
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `drop:table:${table.id}`,
    disabled: !desktopDrag,
  });
  const occupancy = table.capacity ? guests.length / table.capacity : 0;
  const over = guests.length > table.capacity;

  return (
    <Card
      className={cn(
        isOver && "ring-2 ring-[var(--accent)]",
        over && "border-red-300",
        tableSideCardClass(table),
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>
              <TableNumberButton
                table={table}
                guests={allGuests}
                className="font-heading text-2xl no-underline hover:underline"
              />
            </CardTitle>
            <p className="text-sm text-[var(--foreground)]/60">{table.name}</p>
          </div>
          <Badge
            className={cn(
              "capitalize",
              table.table_type === "vip" && "bg-[var(--accent)]",
              tableSideBadgeClass(table),
            )}
          >
            {tableSide(table) ? tableSideLabel(tableSide(table)) : tableTypeLabel(table.table_type)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={setNodeRef} className="min-h-32 space-y-3">
          <div>
            <div className="mb-1 flex justify-between text-xs text-[var(--foreground)]/60">
              <span>
                {guests.length}/{table.capacity}
              </span>
              <span>{table.status}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className={cn("h-full rounded-full", over ? "bg-red-600" : "bg-[var(--accent)]")}
                style={{ width: `${Math.min(occupancy * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
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
                  placeholder="Move to table…"
                  onAssign={onAssign}
                />
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-black/10 px-3 py-4 text-center text-sm text-[var(--foreground)]/55">
                No guests yet — assign from the unassigned list.
              </p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={onAddSeat} disabled={seatPending}>
            <Plus className="h-3.5 w-3.5" /> Add seat
          </Button>
        </div>
      </CardContent>
    </Card>
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
  onAssign,
}: {
  guest: GuestWithRelations;
  tables: ReceptionTable[];
  guestsByTable: Map<string, GuestWithRelations[]>;
  pending: boolean;
  desktopDrag: boolean;
  currentTableId?: string | null;
  placeholder: string;
  onAssign: (guestId: string, tableId: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `guest:${guest.id}`,
    disabled: pending || !desktopDrag,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-black/8 bg-white/90 px-3 py-2.5 text-sm shadow-sm",
        isDragging && "opacity-60 shadow-xl",
      )}
    >
      <div className="flex items-start gap-2">
        {desktopDrag ? (
          <button
            type="button"
            className="mt-0.5 hidden cursor-grab touch-none text-[var(--foreground)]/35 lg:block"
            aria-label={`Drag ${guest.name_en}`}
            {...listeners}
            {...attributes}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold leading-tight">{guest.name_en}</p>
              <p className="mt-0.5 text-xs text-[var(--foreground)]/55">
                {[guest.name_zh, guest.guest_groups?.name, `party ${guest.expected_count}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {guest.is_vip ? <Badge className="bg-[var(--accent)]">VIP</Badge> : null}
              {guest.attendance_status === "checked_in" ? (
                <CheckCircle2 className="h-4 w-4 text-green-700" />
              ) : null}
            </div>
          </div>

          <TableSelect
            guest={guest}
            tables={tables}
            guestsByTable={guestsByTable}
            pending={pending}
            currentTableId={currentTableId}
            placeholder={placeholder}
            onAssign={onAssign}
          />
        </div>
      </div>
    </div>
  );
}
