"use client";

import { Copy, Plus, Save, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { addSeatToTable, deleteTable, upsertTable } from "@/lib/actions/wedding";
import type { GuestWithRelations, ReceptionTable, TableStatus, TableType } from "@/types/wedding";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/page-chrome";
import { TableNumberButton } from "@/components/table-guests-dialog";
import {
  BRIDE_SIDE_LABEL,
  GROOM_SIDE_LABEL,
  tableSide,
  tableSideBadgeClass,
  tableSideCardClass,
  tableSideLabel,
  tableTypeLabel,
  type TableSide,
} from "@/lib/table-side";
import { cn } from "@/lib/utils";

type TableDraft = Pick<
  ReceptionTable,
  "table_number" | "name" | "capacity" | "table_type" | "location" | "status" | "notes" | "sort_order" | "pos_x" | "pos_y"
> & { id?: string };

const tableTypes: TableType[] = [
  "normal",
  "vip",
  "family",
  "bride_groom",
  "reserved",
  "custom",
];
const tableStatuses: TableStatus[] = ["active", "reserved", "disabled"];

const emptyDraft: TableDraft = {
  table_number: "",
  name: "",
  capacity: 10,
  table_type: "normal",
  location: "",
  status: "active",
  notes: "",
  sort_order: 0,
  pos_x: 120,
  pos_y: 120,
};

export function TablesManager({
  tables,
  guests,
}: {
  tables: ReceptionTable[];
  guests: GuestWithRelations[];
}) {
  const [draft, setDraft] = useState<TableDraft>(emptyDraft);
  const [isPending, startTransition] = useTransition();
  const assignedByTable = useMemo(() => {
    const map = new Map<string, number>();
    for (const guest of guests) {
      if (guest.table_id) map.set(guest.table_id, (map.get(guest.table_id) ?? 0) + 1);
    }
    return map;
  }, [guests]);

  function editTable(table: ReceptionTable) {
    setDraft({
      id: table.id,
      table_number: table.table_number,
      name: table.name,
      capacity: table.capacity,
      table_type: table.table_type,
      location: table.location,
      status: table.status,
      notes: table.notes,
      sort_order: table.sort_order,
      pos_x: table.pos_x,
      pos_y: table.pos_y,
    });
  }

  function updateDraft<K extends keyof TableDraft>(key: K, value: TableDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function saveTable(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await upsertTable({
          ...draft,
          capacity: Number(draft.capacity) || 1,
          sort_order: Number(draft.sort_order) || 0,
          pos_x: Number(draft.pos_x) || 120,
          pos_y: Number(draft.pos_y) || 120,
        });
        setDraft(emptyDraft);
        toast.success("Table saved.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save table.");
      }
    });
  }

  function duplicateTable(table: ReceptionTable) {
    startTransition(async () => {
      try {
        await upsertTable({
          table_number: `${table.table_number}-copy-${Date.now().toString(36).slice(-4)}`,
          name: `${table.name} Copy`,
          capacity: table.capacity,
          table_type: table.table_type,
          location: table.location,
          notes: table.notes,
          status: table.status,
          sort_order: table.sort_order + 1,
          pos_x: table.pos_x + 30,
          pos_y: table.pos_y + 30,
        });
        toast.success("Table duplicated.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to duplicate table.");
      }
    });
  }

  function removeTable(table: ReceptionTable) {
    if (!confirm(`Delete ${table.table_number}? Guests assigned to it will become unassigned.`)) return;
    startTransition(async () => {
      try {
        await deleteTable(table.id);
        toast.success("Table deleted.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to delete table.");
      }
    });
  }

  function addSeat(table: ReceptionTable) {
    startTransition(async () => {
      try {
        await addSeatToTable(table.id);
        toast.success(`Seat added to ${table.table_number}.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to add seat.");
      }
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>{draft.id ? "Edit table" : "Create table"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveTable} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Number"><Input required value={draft.table_number} onChange={(event) => updateDraft("table_number", event.target.value)} /></Field>
              <Field label="Capacity"><Input type="number" min={1} value={draft.capacity} onChange={(event) => updateDraft("capacity", Number(event.target.value))} /></Field>
            </div>
            <Field label="Name"><Input required value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select className="h-10 w-full rounded-xl border border-black/10 bg-white/80 px-3 text-sm" value={draft.table_type} onChange={(event) => updateDraft("table_type", event.target.value as TableType)}>
                  {tableTypes.map((type) => (
                    <option key={type} value={type}>
                      {tableTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select className="h-10 w-full rounded-xl border border-black/10 bg-white/80 px-3 text-sm" value={draft.status} onChange={(event) => updateDraft("status", event.target.value as TableStatus)}>
                  {tableStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Side">
              <select
                className="h-10 w-full rounded-xl border border-black/10 bg-white/80 px-3 text-sm"
                value={tableSide(draft) ?? ""}
                onChange={(event) => {
                  const side = event.target.value as TableSide | "";
                  if (side === "groom") updateDraft("location", GROOM_SIDE_LABEL);
                  else if (side === "bride") updateDraft("location", BRIDE_SIDE_LABEL);
                  else if (tableSide(draft)) updateDraft("location", "");
                }}
              >
                <option value="">Unassigned</option>
                <option value="groom">{GROOM_SIDE_LABEL}</option>
                <option value="bride">{BRIDE_SIDE_LABEL}</option>
              </select>
            </Field>
            <Field label="Location"><Input value={draft.location} onChange={(event) => updateDraft("location", event.target.value)} placeholder="Groom side / Bride side / Zone…" /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Sort"><Input type="number" value={draft.sort_order} onChange={(event) => updateDraft("sort_order", Number(event.target.value))} /></Field>
              <Field label="X"><Input type="number" value={draft.pos_x} onChange={(event) => updateDraft("pos_x", Number(event.target.value))} /></Field>
              <Field label="Y"><Input type="number" value={draft.pos_y} onChange={(event) => updateDraft("pos_y", Number(event.target.value))} /></Field>
            </div>
            <Field label="Notes"><Textarea value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} /></Field>
            <div className="flex gap-2">
              <Button className="flex-1" disabled={isPending}><Save className="h-4 w-4" /> Save</Button>
              <Button type="button" variant="outline" onClick={() => setDraft(emptyDraft)}>Reset</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {tables.length ? (
          tables.map((table) => {
            const assigned = assignedByTable.get(table.id) ?? 0;
            const rate = table.capacity ? assigned / table.capacity : 0;
            return (
              <Card
                key={table.id}
                className={cn(tableSideCardClass(table))}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>
                        <TableNumberButton
                          table={table}
                          guests={guests}
                          className="font-heading text-2xl no-underline hover:underline"
                        />
                      </CardTitle>
                      <p className="text-sm text-[var(--foreground)]/60">{table.name}</p>
                      <p className="mt-1 text-xs text-[var(--primary)]/80">Tap number to view guest list</p>
                    </div>
                    <Badge className={cn("capitalize", tableSideBadgeClass(table))}>
                      {tableSide(table) ? tableSideLabel(tableSide(table)) : tableTypeLabel(table.table_type)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{assigned}/{table.capacity} guests</span>
                      <span>{table.status}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-[var(--muted)]">
                      <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(rate * 100, 100)}%` }} />
                    </div>
                  </div>
                  <p className="min-h-10 text-sm text-[var(--foreground)]/60">{table.location || table.notes || "No location notes."}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => editTable(table)}>Edit</Button>
                    <Button size="sm" variant="secondary" onClick={() => addSeat(table)}><Plus className="h-3.5 w-3.5" /> Seat</Button>
                    <Button size="sm" variant="outline" onClick={() => duplicateTable(table)}><Copy className="h-3.5 w-3.5" /> Duplicate</Button>
                    <Button size="sm" variant="destructive" onClick={() => removeTable(table)}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <EmptyState title="No tables yet" description="Create the first reception table or run the seed script for a full ballroom." className="lg:col-span-2" />
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
