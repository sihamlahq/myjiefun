"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { GuestWithRelations, ReceptionTable } from "@/types/wedding";
import { TableGuestsDialog } from "@/components/table-guests-dialog";

export function ReceptionTablesGrid({
  tables,
  guests,
}: {
  tables: ReceptionTable[];
  guests: GuestWithRelations[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const summaries = useMemo(() => {
    return tables.map((table) => {
      const seated = guests
        .filter((guest) => guest.table_id === table.id)
        .sort((a, b) => a.name_en.localeCompare(b.name_en));
      return { table, seated };
    });
  }, [guests, tables]);

  const selected = summaries.find((item) => item.table.id === selectedId) ?? null;

  if (!summaries.length) {
    return (
      <p className="mt-10 text-lg text-[var(--foreground)]/60">No tables yet.</p>
    );
  }

  return (
    <>
      <div className="mt-10 w-full max-w-6xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-[var(--primary)]">
          Tables — tap a number for the guest list
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {summaries.map(({ table, seated }) => {
            const full = seated.length >= table.capacity;
            const partial = seated.length > 0 && !full;
            const arrived = seated.filter((g) => g.attendance_status === "checked_in").length;
            return (
              <button
                key={table.id}
                type="button"
                onClick={() => setSelectedId(table.id)}
                className={cn(
                  "rounded-3xl border px-3 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                  full
                    ? "border-[var(--accent)]/50 bg-[var(--accent)]/70"
                    : partial
                      ? "border-[var(--secondary)]/40 bg-[var(--secondary)]/45"
                      : "border-white/70 bg-white/70",
                )}
              >
                <p className="font-heading text-3xl font-semibold leading-none">
                  {table.table_number}
                </p>
                <p className="mt-2 truncate text-xs text-[var(--foreground)]/60">{table.name}</p>
                <p className="mt-3 text-sm font-semibold">
                  {seated.length}/{table.capacity}
                  <span className="ml-1 font-normal text-[var(--foreground)]/55">
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
          table={selected.table}
          guests={selected.seated}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </>
  );
}
