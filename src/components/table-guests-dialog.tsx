"use client";

import { CheckCircle2, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { GuestWithRelations, ReceptionTable } from "@/types/wedding";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";

type TableLike = Pick<
  ReceptionTable,
  "id" | "table_number" | "name" | "capacity" | "table_type" | "status"
>;

export function TableNumberButton({
  table,
  guests,
  className,
  children,
}: {
  table: TableLike;
  guests: GuestWithRelations[];
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const seated = useMemo(
    () =>
      guests
        .filter((guest) => guest.table_id === table.id)
        .sort((a, b) => a.name_en.localeCompare(b.name_en)),
    [guests, table.id],
  );

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "rounded-lg font-semibold text-[var(--primary)] underline decoration-[var(--primary)]/35 underline-offset-2 transition hover:decoration-[var(--primary)]",
          className,
        )}
        title={`View guests at ${table.table_number}`}
      >
        {children ?? table.table_number}
      </button>
      {open ? (
        <TableGuestsDialog table={table} guests={seated} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

/** Open guest list from a guest's assigned table relation. */
export function GuestTableLink({
  guest,
  tables,
  guests,
  className,
  fallback = "No table",
}: {
  guest: GuestWithRelations;
  tables: ReceptionTable[];
  guests: GuestWithRelations[];
  className?: string;
  fallback?: string;
}) {
  const table =
    tables.find((item) => item.id === guest.table_id) ||
    (guest.reception_tables
      ? ({
          id: guest.table_id!,
          table_number: guest.reception_tables.table_number,
          name: guest.reception_tables.name,
          capacity: guest.reception_tables.capacity,
          table_type: guest.reception_tables.table_type,
          status: guest.reception_tables.status,
        } satisfies TableLike)
      : null);

  if (!guest.table_id || !table) {
    return <span className={className}>{fallback}</span>;
  }

  return <TableNumberButton table={table} guests={guests} className={className} />;
}

export function TableGuestsDialog({
  table,
  guests,
  onClose,
}: {
  table: TableLike;
  guests: GuestWithRelations[];
  onClose: () => void;
}) {
  const arrived = guests.filter((guest) => guest.attendance_status === "checked_in").length;
  const confirmed = guests.filter((guest) => guest.rsvp_status === "confirmed").length;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-end bg-black/40 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/50 bg-[var(--background)] shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Guests at ${table.table_number}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/8 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
              Table seating
            </p>
            <h2 className="font-heading text-3xl font-semibold leading-tight">
              {table.table_number}
            </h2>
            <p className="text-sm text-[var(--foreground)]/60">{table.name}</p>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-3">
          <Badge className="capitalize">{table.table_type}</Badge>
          <Badge>
            {guests.length}/{table.capacity} seated
          </Badge>
          <Badge className="bg-emerald-100 text-emerald-900">{arrived} arrived</Badge>
          <Badge className="bg-amber-100 text-amber-950">{confirmed} confirmed</Badge>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {guests.length ? (
            <ol className="space-y-2">
              {guests.map((guest, index) => (
                <li
                  key={guest.id}
                  className="flex items-start gap-3 rounded-2xl border border-black/8 bg-white/85 px-3 py-3"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-bold text-[var(--foreground)]/70">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">
                      {guest.name_en}
                      {guest.is_vip ? (
                        <span className="ml-2 align-middle rounded bg-[var(--accent)]/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                          VIP
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-[var(--foreground)]/55">
                      {[guest.name_zh, guest.phone, guest.guest_code].filter(Boolean).join(" · ") ||
                        "—"}
                    </p>
                    <p className="mt-1 text-xs font-medium capitalize text-[var(--foreground)]/65">
                      RSVP {guest.rsvp_status}
                      {guest.expected_count > 1 ? ` · party of ${guest.expected_count}` : ""}
                      {guest.guest_groups?.name ? ` · ${guest.guest_groups.name}` : ""}
                    </p>
                  </div>
                  {guest.attendance_status === "checked_in" ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      In
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-4 py-10 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-[var(--primary)]/50" />
              <p className="font-semibold">No guests assigned</p>
              <p className="mt-1 text-sm text-[var(--foreground)]/60">
                Assign guests on the Seating page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
