"use client";

import { DndContext, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useMemo, useTransition } from "react";
import { toast } from "sonner";
import { addSeatToTable, assignGuestToTable } from "@/lib/actions/wedding";
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

export function SeatingBoard({
  guests,
  tables,
}: {
  guests: GuestWithRelations[];
  tables: ReceptionTable[];
}) {
  const [isPending, startTransition] = useTransition();
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

  function assignTable(guestId: string, tableId: string | null, fromTableId?: string | null) {
    if ((fromTableId ?? null) === tableId) return;
    if (fromTableId && !confirm("Move this guest from their current table?")) return;

    startTransition(async () => {
      try {
        await assignGuestToTable({ guestId, tableId });
        toast.success(tableId ? "Guest assigned to table." : "Guest moved to unassigned.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to assign guest.");
      }
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const guestId = String(event.active.id).replace("guest:", "");
    const guest = guests.find((item) => item.id === guestId);
    const overId = event.over ? String(event.over.id) : "";
    if (!guest || !overId) return;

    const tableId = overId === unassignedId ? null : overId.replace("drop:table:", "");
    assignTable(guestId, tableId, guest.table_id);
  }

  function addSeat(table: ReceptionTable) {
    startTransition(async () => {
      try {
        await addSeatToTable(table.id);
        toast.success(`Added a seat to ${table.table_number}.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to add seat.");
      }
    });
  }

  return (
    <DndContext onDragEnd={onDragEnd}>
      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <UnassignedDrop
          guests={unassigned}
          tables={activeTables}
          guestsByTable={guestsByTable}
          pending={isPending}
          onAssign={(guestId, tableId) => assignTable(guestId, tableId, null)}
        />

        <div className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <Link href="/guests">
              <Button variant="outline">
                <UserPlus className="h-4 w-4" /> Add guest
              </Button>
            </Link>
          </div>
          {tables.length ? (
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {tables.map((table) => (
                <TableDrop
                  key={table.id}
                  table={table}
                  guests={guestsByTable.get(table.id) ?? []}
                  allGuests={guests}
                  onAddSeat={() => addSeat(table)}
                  pending={isPending}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No tables to seat"
              description="Create tables first, then drag guests into their table cards."
            />
          )}
        </div>
      </div>
    </DndContext>
  );
}

function UnassignedDrop({
  guests,
  tables,
  guestsByTable,
  pending,
  onAssign,
}: {
  guests: GuestWithRelations[];
  tables: ReceptionTable[];
  guestsByTable: Map<string, GuestWithRelations[]>;
  pending: boolean;
  onAssign: (guestId: string, tableId: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: unassignedId });
  return (
    <Card className={cn("h-fit xl:sticky xl:top-6", isOver && "ring-2 ring-[var(--accent)]")}>
      <CardHeader>
        <CardTitle>Unassigned guests</CardTitle>
        <p className="text-sm text-[var(--foreground)]/60">
          Pick a table from the list, or drag onto a table card.
        </p>
      </CardHeader>
      <CardContent>
        <div ref={setNodeRef} className="min-h-40 space-y-2">
          {guests.length ? (
            guests.map((guest) => (
              <UnassignedGuestChip
                key={guest.id}
                guest={guest}
                tables={tables}
                guestsByTable={guestsByTable}
                pending={pending}
                onAssign={onAssign}
              />
            ))
          ) : (
            <EmptyState
              title="All assigned"
              description="Drag guests here to remove a table assignment."
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function UnassignedGuestChip({
  guest,
  tables,
  guestsByTable,
  pending,
  onAssign,
}: {
  guest: GuestWithRelations;
  tables: ReceptionTable[];
  guestsByTable: Map<string, GuestWithRelations[]>;
  pending: boolean;
  onAssign: (guestId: string, tableId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `guest:${guest.id}`,
    disabled: pending,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-black/8 bg-white/85 px-3 py-2.5 text-sm shadow-sm",
        isDragging && "opacity-60 shadow-xl",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 cursor-grab touch-none text-left"
          {...listeners}
          {...attributes}
        >
          <p className="font-semibold leading-tight">{guest.name_en}</p>
          <p className="mt-0.5 text-xs text-[var(--foreground)]/55">
            {[guest.name_zh, guest.guest_groups?.name, `party ${guest.expected_count}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {guest.is_vip ? <Badge className="bg-[var(--accent)]">VIP</Badge> : null}
          {guest.attendance_status === "checked_in" ? (
            <CheckCircle2 className="h-4 w-4 text-green-700" />
          ) : null}
        </div>
      </div>

      <label className="mt-2 block">
        <span className="sr-only">Assign {guest.name_en} to table</span>
        <select
          className="h-9 w-full rounded-lg border border-black/10 bg-[var(--background)] px-2 text-xs font-semibold text-[var(--foreground)]"
          defaultValue=""
          disabled={pending || !tables.length}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            const tableId = event.target.value;
            if (!tableId) return;
            onAssign(guest.id, tableId);
            event.target.value = "";
          }}
        >
          <option value="" disabled>
            {tables.length ? "Assign to table…" : "No active tables"}
          </option>
          {tables.map((table) => {
            const seated = guestsByTable.get(table.id)?.length ?? 0;
            const side = tableSide(table);
            const fullness = seated >= table.capacity ? "full" : `${seated}/${table.capacity}`;
            return (
              <option key={table.id} value={table.id}>
                {table.table_number}
                {side ? ` · ${side === "groom" ? "男方" : "女方"}` : ""}
                {` · ${fullness}`}
              </option>
            );
          })}
        </select>
      </label>
    </div>
  );
}

function TableDrop({
  table,
  guests,
  allGuests,
  onAddSeat,
  pending,
}: {
  table: ReceptionTable;
  guests: GuestWithRelations[];
  allGuests: GuestWithRelations[];
  onAddSeat: () => void;
  pending: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `drop:table:${table.id}` });
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
            <p className="mt-1 text-xs text-[var(--primary)]/80">Tap number for full list</p>
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
        <div ref={setNodeRef} className="min-h-44 space-y-3">
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
            {guests.map((guest) => (
              <GuestChip key={guest.id} guest={guest} pending={pending} />
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={onAddSeat} disabled={pending}>
            <Plus className="h-3.5 w-3.5" /> Add seat
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GuestChip({
  guest,
  pending,
}: {
  guest: GuestWithRelations;
  pending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `guest:${guest.id}`,
    disabled: pending,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex cursor-grab items-center justify-between gap-2 rounded-xl border border-black/8 bg-white/85 px-3 py-2 text-sm shadow-sm",
        isDragging && "opacity-60 shadow-xl",
      )}
    >
      <div>
        <p className="font-semibold">{guest.name_en}</p>
        <p className="text-xs text-[var(--foreground)]/55">
          {guest.guest_code} · party {guest.expected_count}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {guest.is_vip ? <Badge className="bg-[var(--accent)]">VIP</Badge> : null}
        {guest.attendance_status === "checked_in" ? (
          <CheckCircle2 className="h-4 w-4 text-green-700" />
        ) : null}
      </div>
    </div>
  );
}
