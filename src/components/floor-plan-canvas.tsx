"use client";

import { DndContext, type DragEndEvent, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckCircle2,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  List,
  LayoutGrid,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateTablePosition } from "@/lib/actions/wedding";
import { cn } from "@/lib/utils";
import type { GuestWithRelations, ReceptionTable } from "@/types/wedding";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/page-chrome";

const TABLE_SIZE = 112;

export function FloorPlanCanvas({
  tables,
  guests,
}: {
  tables: ReceptionTable[];
  guests: GuestWithRelations[];
}) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    tables[0]?.id ?? null,
  );
  const [zoom, setZoom] = useState(1);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [editLayout, setEditLayout] = useState(false);
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

  const canvasSize = useMemo(() => {
    const maxX = tables.reduce((max, table) => Math.max(max, table.pos_x + TABLE_SIZE), 320);
    const maxY = tables.reduce((max, table) => Math.max(max, table.pos_y + TABLE_SIZE), 320);
    return {
      width: Math.max(360, Math.ceil(maxX + 48)),
      height: Math.max(420, Math.ceil(maxY + 48)),
    };
  }, [tables]);

  function onDragEnd(event: DragEndEvent) {
    if (!editLayout) return;
    const table = tables.find((item) => `table:${item.id}` === event.active.id);
    if (!table) return;
    const nextX = Math.max(0, Math.round(table.pos_x + event.delta.x / zoom));
    const nextY = Math.max(0, Math.round(table.pos_y + event.delta.y / zoom));
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
    return (
      <EmptyState
        title="No floor plan yet"
        description="Create reception tables to place them on the ballroom canvas."
      />
    );
  }

  const details = selectedTable ? (
    <TableDetails
      table={selectedTable}
      guests={guestsByTable.get(selectedTable.id) ?? []}
      onClose={() => setSelectedTableId(null)}
    />
  ) : (
    <EmptyState title="Pick a table" description="Tap any table for the guest list." />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-black/10 bg-white/80 p-1 md:hidden">
          <Button
            type="button"
            size="sm"
            variant={mobileView === "map" ? "default" : "ghost"}
            onClick={() => setMobileView("map")}
          >
            <LayoutGrid className="h-4 w-4" />
            Map
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mobileView === "list" ? "default" : "ghost"}
            onClick={() => setMobileView("list")}
          >
            <List className="h-4 w-4" />
            List
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-xl border border-black/10 bg-white/80 p-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Zoom out"
            onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.1).toFixed(1))))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="min-w-12 text-center text-xs font-semibold">{Math.round(zoom * 100)}%</span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Zoom in"
            onClick={() => setZoom((value) => Math.min(1.8, Number((value + 0.1).toFixed(1))))}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Reset zoom"
            onClick={() => setZoom(1)}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <Button
          type="button"
          size="sm"
          variant={editLayout ? "gold" : "outline"}
          onClick={() => setEditLayout((value) => !value)}
        >
          {editLayout ? "Editing layout" : "Move tables"}
        </Button>
      </div>

      {editLayout ? (
        <p className="rounded-xl bg-[var(--muted)]/80 px-3 py-2 text-sm text-[var(--foreground)]/70">
          Layout edit is on. Drag tables to reposition. Turn this off on phones when you only need to check occupancy.
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className={cn(mobileView === "list" && "hidden md:block")}>
          <DndContext onDragEnd={onDragEnd}>
            <div className="relative overflow-auto rounded-3xl border border-[var(--primary)]/15 bg-[linear-gradient(135deg,rgba(255,255,255,.78),rgba(239,232,220,.72))] shadow-inner touch-pan-x touch-pan-y overscroll-contain">
              <div className="sticky left-0 top-0 z-10 flex justify-center p-3">
                <div className="rounded-full border border-[var(--accent)]/30 bg-white/90 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)] shadow-sm sm:text-sm">
                  Grand ballroom
                </div>
              </div>

              <div
                className="relative origin-top-left p-3 pb-6"
                style={{
                  width: canvasSize.width * zoom,
                  height: canvasSize.height * zoom,
                }}
              >
                <div
                  className="absolute left-3 top-3"
                  style={{
                    width: canvasSize.width,
                    height: canvasSize.height,
                    transform: `scale(${zoom})`,
                    transformOrigin: "top left",
                  }}
                >
                  <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(139,115,85,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(139,115,85,.12)_1px,transparent_1px)] [background-size:48px_48px]" />
                  {tables.map((table) => (
                    <DraggableTable
                      key={table.id}
                      table={table}
                      guests={guestsByTable.get(table.id) ?? []}
                      selected={table.id === selectedTableId}
                      onSelect={() => {
                        setSelectedTableId(table.id);
                        if (window.matchMedia("(max-width: 767px)").matches) {
                          setMobileView("list");
                        }
                      }}
                      disabled={isPending || !editLayout}
                      draggable={editLayout}
                    />
                  ))}
                </div>
              </div>
            </div>
          </DndContext>
          <p className="mt-2 text-xs text-[var(--foreground)]/55 md:hidden">
            Scroll sideways to explore the room. Tap a table for guests.
          </p>
        </div>

        <div className={cn("space-y-3", mobileView === "map" && "hidden md:block")}>
          <Card className="md:hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Tables</CardTitle>
            </CardHeader>
            <CardContent className="grid max-h-[40vh] grid-cols-2 gap-2 overflow-auto sm:grid-cols-3">
              {tables.map((table) => {
                const tableGuests = guestsByTable.get(table.id) ?? [];
                const state = occupancyState(table, tableGuests);
                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => setSelectedTableId(table.id)}
                    className={cn(
                      "rounded-2xl border-2 px-3 py-3 text-left shadow-sm transition",
                      colorForState(state),
                      selectedTableId === table.id && "ring-2 ring-[var(--accent)]",
                    )}
                  >
                    <p className="font-heading text-xl font-semibold leading-none">
                      {table.table_number}
                    </p>
                    <p className="mt-1 text-xs font-semibold">
                      {tableGuests.length}/{table.capacity}
                    </p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="h-fit xl:sticky xl:top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <MapPin className="h-5 w-5" /> Table details
              </CardTitle>
            </CardHeader>
            <CardContent>{details}</CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile bottom sheet when a table is selected while viewing the map */}
      {selectedTable && mobileView === "map" ? (
        <div className="fixed inset-x-0 bottom-16 z-40 px-3 md:hidden">
          <Card className="max-h-[42vh] overflow-auto border-[var(--accent)]/40 shadow-2xl">
            <CardContent className="p-4">{details}</CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function TableDetails({
  table,
  guests,
  onClose,
}: {
  table: ReceptionTable;
  guests: GuestWithRelations[];
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-heading text-3xl font-semibold sm:text-4xl">{table.table_number}</p>
          <p className="text-[var(--foreground)]/60">{table.name}</p>
        </div>
        <Button type="button" size="sm" variant="ghost" className="md:hidden" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge>{table.table_type}</Badge>
        <Badge>{table.status}</Badge>
        <Badge>
          {guests.length}/{table.capacity}
        </Badge>
      </div>
      <ul className="space-y-2">
        {guests.map((guest) => (
          <li
            key={guest.id}
            className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-sm"
          >
            <span className="pr-2">{guest.name_en}</span>
            {guest.attendance_status === "checked_in" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-700" />
            ) : null}
          </li>
        ))}
      </ul>
      {!guests.length ? (
        <EmptyState title="No guests here" description="Assign guests on the Seating page." />
      ) : null}
    </div>
  );
}

function DraggableTable({
  table,
  guests,
  selected,
  onSelect,
  disabled,
  draggable,
}: {
  table: ReceptionTable;
  guests: GuestWithRelations[];
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `table:${table.id}`,
    disabled: disabled || !draggable,
  });
  const state = occupancyState(table, guests);
  const style = {
    left: table.pos_x,
    top: table.pos_y,
    width: TABLE_SIZE,
    height: TABLE_SIZE,
    transform: CSS.Translate.toString(transform),
    touchAction: draggable ? "none" : "manipulation",
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      onClick={onSelect}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      className={cn(
        "absolute grid place-items-center rounded-full border-4 text-center shadow-lg transition",
        colorForState(state),
        selected && "ring-4 ring-[var(--accent)]/45",
        isDragging && "z-20 scale-105 opacity-80",
      )}
    >
      <span>
        <span className="block font-heading text-xl font-semibold sm:text-2xl">
          {table.table_number}
        </span>
        <span className="block text-[11px] font-semibold sm:text-xs">
          {guests.length}/{table.capacity}
        </span>
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
