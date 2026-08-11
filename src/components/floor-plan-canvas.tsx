"use client";

import { DndContext, type DragEndEvent, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, MapPin } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateTablePosition } from "@/lib/actions/wedding";
import { cn } from "@/lib/utils";
import type { GuestWithRelations, ReceptionTable } from "@/types/wedding";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/page-chrome";

export function FloorPlanCanvas({
  tables,
  guests,
}: {
  tables: ReceptionTable[];
  guests: GuestWithRelations[];
}) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(tables[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();
  const guestsByTable = useMemo(() => {
    const map = new Map<string, GuestWithRelations[]>();
    for (const table of tables) map.set(table.id, []);
    for (const guest of guests) {
      if (guest.table_id) map.get(guest.table_id)?.push(guest);
    }
    return map;
  }, [guests, tables]);
  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null;

  function onDragEnd(event: DragEndEvent) {
    const table = tables.find((item) => `table:${item.id}` === event.active.id);
    if (!table) return;
    const nextX = Math.max(0, Math.round(table.pos_x + event.delta.x));
    const nextY = Math.max(0, Math.round(table.pos_y + event.delta.y));
    startTransition(async () => {
      try {
        await updateTablePosition(table.id, nextX, nextY);
        toast.success(`${table.table_number} position saved.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save position.");
      }
    });
  }

  if (!tables.length) {
    return <EmptyState title="No floor plan yet" description="Create reception tables to place them on the ballroom canvas." />;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <DndContext onDragEnd={onDragEnd}>
        <div className="relative min-h-[680px] overflow-hidden rounded-3xl border border-[var(--primary)]/15 bg-[linear-gradient(135deg,rgba(255,255,255,.78),rgba(239,232,220,.72))] shadow-inner">
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(139,115,85,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(139,115,85,.12)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-[var(--accent)]/30 bg-white/80 px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
            Grand ballroom
          </div>
          {tables.map((table) => (
            <DraggableTable
              key={table.id}
              table={table}
              guests={guestsByTable.get(table.id) ?? []}
              selected={table.id === selectedTableId}
              onSelect={() => setSelectedTableId(table.id)}
              disabled={isPending}
            />
          ))}
        </div>
      </DndContext>

      <Card className="h-fit xl:sticky xl:top-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Table details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedTable ? (
            <div className="space-y-4">
              <div>
                <p className="font-heading text-4xl font-semibold">{selectedTable.table_number}</p>
                <p className="text-[var(--foreground)]/60">{selectedTable.name}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{selectedTable.table_type}</Badge>
                <Badge>{selectedTable.status}</Badge>
                <Badge>{guestsByTable.get(selectedTable.id)?.length ?? 0}/{selectedTable.capacity}</Badge>
              </div>
              <ul className="space-y-2">
                {(guestsByTable.get(selectedTable.id) ?? []).map((guest) => (
                  <li key={guest.id} className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-sm">
                    <span>{guest.name_en}</span>
                    {guest.attendance_status === "checked_in" ? <CheckCircle2 className="h-4 w-4 text-green-700" /> : null}
                  </li>
                ))}
              </ul>
              {!(guestsByTable.get(selectedTable.id) ?? []).length ? (
                <EmptyState title="No guests here" description="Assign guests on the Seating page." />
              ) : null}
            </div>
          ) : (
            <EmptyState title="Pick a table" description="Click any ballroom table for the guest list." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DraggableTable({
  table,
  guests,
  selected,
  onSelect,
  disabled,
}: {
  table: ReceptionTable;
  guests: GuestWithRelations[];
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `table:${table.id}`,
    disabled,
  });
  const state = occupancyState(table, guests);
  const style = {
    left: table.pos_x,
    top: table.pos_y,
    transform: CSS.Translate.toString(transform),
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      onClick={onSelect}
      {...listeners}
      {...attributes}
      className={cn(
        "absolute grid h-28 w-28 place-items-center rounded-full border-4 text-center shadow-lg transition",
        colorForState(state),
        selected && "ring-4 ring-[var(--accent)]/45",
        isDragging && "z-20 scale-105 opacity-80",
      )}
    >
      <span>
        <span className="block font-heading text-2xl font-semibold">{table.table_number}</span>
        <span className="block text-xs font-semibold">{guests.length}/{table.capacity}</span>
      </span>
    </button>
  );
}

function occupancyState(table: ReceptionTable, guests: GuestWithRelations[]) {
  if (table.table_type === "vip") return "vip";
  if (table.status === "reserved" || table.table_type === "reserved") return "reserved";
  if (guests.length === 0) return "empty";
  if (guests.length > table.capacity) return "over";
  if (guests.length === table.capacity) return "full";
  return "partial";
}

function colorForState(state: string) {
  const styles: Record<string, string> = {
    empty: "border-[var(--primary)]/25 bg-white text-[var(--foreground)]",
    partial: "border-[var(--secondary)] bg-[var(--secondary)]/30 text-[var(--foreground)]",
    full: "border-[var(--accent)] bg-[var(--accent)]/45 text-[var(--foreground)]",
    over: "border-red-700 bg-red-100 text-red-900",
    vip: "border-[var(--accent)] bg-[linear-gradient(135deg,var(--accent),white)] text-[var(--foreground)]",
    reserved: "border-stone-400 bg-stone-200 text-stone-700",
  };
  return styles[state] ?? styles.empty;
}
