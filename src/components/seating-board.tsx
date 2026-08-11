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

  function onDragEnd(event: DragEndEvent) {
    const guestId = String(event.active.id).replace("guest:", "");
    const guest = guests.find((item) => item.id === guestId);
    const overId = event.over ? String(event.over.id) : "";
    if (!guest || !overId) return;

    const tableId = overId === unassignedId ? null : overId.replace("drop:table:", "");
    if ((guest.table_id ?? null) === tableId) return;
    if (guest.table_id && !confirm("Move this guest from their current table?")) return;

    startTransition(async () => {
      try {
        await assignGuestToTable({ guestId, tableId });
        toast.success(tableId ? "Guest assigned to table." : "Guest moved to unassigned.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to assign guest.");
      }
    });
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
      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <UnassignedDrop guests={unassigned} pending={isPending} />

        <div className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <Link href="/guests">
              <Button variant="outline"><UserPlus className="h-4 w-4" /> Add guest</Button>
            </Link>
          </div>
          {tables.length ? (
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {tables.map((table) => (
                <TableDrop
                  key={table.id}
                  table={table}
                  guests={guestsByTable.get(table.id) ?? []}
                  onAddSeat={() => addSeat(table)}
                  pending={isPending}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No tables to seat" description="Create tables first, then drag guests into their table cards." />
          )}
        </div>
      </div>
    </DndContext>
  );
}

function UnassignedDrop({
  guests,
  pending,
}: {
  guests: GuestWithRelations[];
  pending: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: unassignedId });
  return (
    <Card className={cn("h-fit xl:sticky xl:top-6", isOver && "ring-2 ring-[var(--accent)]")}>
      <CardHeader>
        <CardTitle>Unassigned guests</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={setNodeRef} className="min-h-40 space-y-2">
          {guests.length ? guests.map((guest) => <GuestChip key={guest.id} guest={guest} pending={pending} />) : (
            <EmptyState title="All assigned" description="Drag guests here to remove a table assignment." />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TableDrop({
  table,
  guests,
  onAddSeat,
  pending,
}: {
  table: ReceptionTable;
  guests: GuestWithRelations[];
  onAddSeat: () => void;
  pending: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `drop:table:${table.id}` });
  const occupancy = table.capacity ? guests.length / table.capacity : 0;
  const over = guests.length > table.capacity;

  return (
    <Card className={cn(isOver && "ring-2 ring-[var(--accent)]", over && "border-red-300")}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{table.table_number}</CardTitle>
            <p className="text-sm text-[var(--foreground)]/60">{table.name}</p>
          </div>
          <Badge className={cn("capitalize", table.table_type === "vip" && "bg-[var(--accent)]")}>
            {table.table_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={setNodeRef} className="min-h-44 space-y-3">
          <div>
            <div className="mb-1 flex justify-between text-xs text-[var(--foreground)]/60">
              <span>{guests.length}/{table.capacity}</span>
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
            {guests.map((guest) => <GuestChip key={guest.id} guest={guest} pending={pending} />)}
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
        {guest.attendance_status === "checked_in" ? <CheckCircle2 className="h-4 w-4 text-green-700" /> : null}
      </div>
    </div>
  );
}
