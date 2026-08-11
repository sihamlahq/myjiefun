"use client";

import Fuse from "fuse.js";
import { Armchair, CheckCircle2, RotateCcw, Search, UserPlus, Users } from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  assignGuestToTable,
  checkInGuest,
  createWalkIn,
  undoCheckIn,
} from "@/lib/actions/wedding";
import type { GuestWithRelations, ReceptionTable } from "@/types/wedding";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/page-chrome";

export function CheckInPanel({
  guests,
  tables,
}: {
  guests: GuestWithRelations[];
  tables: ReceptionTable[];
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(guests[0]?.id ?? null);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInCount, setWalkInCount] = useState(1);
  const [walkInTable, setWalkInTable] = useState("");
  const [isPending, startTransition] = useTransition();

  const fuse = useMemo(
    () =>
      new Fuse(guests, {
        keys: [
          "name_en",
          "name_zh",
          "phone",
          "guest_code",
          "guest_groups.name",
          "reception_tables.table_number",
        ],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [guests],
  );

  const results = useMemo(() => {
    if (!query.trim()) return guests.slice(0, 30);
    return fuse.search(query.trim()).map((result) => result.item).slice(0, 30);
  }, [fuse, guests, query]);

  const selected = guests.find((guest) => guest.id === selectedId) ?? results[0] ?? null;

  useEffect(() => {
    if (!selectedId && results[0]) setSelectedId(results[0].id);
  }, [results, selectedId]);

  function runAction(label: string, action: () => Promise<unknown>) {
    startTransition(async () => {
      try {
        await action();
        toast.success(label);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Action failed.");
      }
    });
  }

  function checkInSelected(mode: "check_in" | "group" | "partial" = "check_in") {
    if (!selected) return;
    let partyCount = selected.expected_count || 1;
    if (mode === "partial") {
      const answer = prompt("How many guests from this party arrived?", String(partyCount));
      if (!answer) return;
      partyCount = Number(answer);
      if (!Number.isFinite(partyCount) || partyCount < 1) {
        toast.error("Enter a valid party count.");
        return;
      }
    }
    runAction("Guest checked in.", () =>
      checkInGuest({ guestId: selected.id, mode, partyCount }),
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && selected) {
      event.preventDefault();
      checkInSelected();
    }
  }

  function createWalkInGuest(event: FormEvent) {
    event.preventDefault();
    if (!walkInName.trim()) return;
    runAction("Walk-in created and checked in.", async () => {
      await createWalkIn({
        name_en: walkInName.trim(),
        phone: walkInPhone.trim(),
        expected_count: walkInCount,
        table_id: walkInTable || null,
      });
      setWalkInName("");
      setWalkInPhone("");
      setWalkInCount(1);
      setWalkInTable("");
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4">
        <Card className="bg-white/85">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-[var(--primary)]/55" />
              <Input
                autoFocus
                className="checkin-search rounded-2xl pl-12 text-2xl"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedId(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search guest, phone, code, group, table..."
              />
            </div>
            <p className="mt-2 text-xs text-[var(--foreground)]/55">
              Press Enter to check in the selected guest.
            </p>
          </CardContent>
        </Card>

        {results.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {results.map((guest) => (
              <button
                key={guest.id}
                type="button"
                onClick={() => setSelectedId(guest.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selected?.id === guest.id
                    ? "border-[var(--accent)] bg-white shadow-lg"
                    : "border-black/8 bg-white/60 hover:bg-white/85"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold">{guest.name_en}</p>
                    <p className="text-sm text-[var(--foreground)]/60">
                      {[guest.name_zh, guest.phone, guest.guest_code].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {guest.attendance_status === "checked_in" ? (
                    <CheckCircle2 className="h-6 w-6 text-green-700" />
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{guest.reception_tables?.table_number ?? "Unassigned"}</Badge>
                  <Badge>{guest.guest_groups?.name ?? "No group"}</Badge>
                  {guest.is_vip ? <Badge className="bg-[var(--accent)]">VIP</Badge> : null}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="No matching guests" description="Try a name, Chinese name, phone, guest code, group, or table number." />
        )}
      </div>

      <aside className="space-y-4">
        <Card className="sticky top-6 bg-white/90">
          <CardHeader>
            <CardTitle>Selected guest</CardTitle>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-4">
                <div>
                  <p className="font-heading text-4xl font-semibold">{selected.name_en}</p>
                  <p className="text-lg text-[var(--foreground)]/65">{selected.name_zh || selected.nickname}</p>
                  <p className="mt-2 text-sm text-[var(--foreground)]/60">
                    {selected.phone || "No phone"} · {selected.guest_code}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Info label="RSVP" value={selected.rsvp_status} />
                  <Info label="Party" value={selected.expected_count} />
                  <Info label="Group" value={selected.guest_groups?.name ?? "None"} />
                  <Info label="Table" value={selected.reception_tables?.table_number ?? "Unassigned"} />
                </div>
                <div className="grid gap-2">
                  <Button size="xl" disabled={isPending || selected.attendance_status === "checked_in"} onClick={() => checkInSelected()}>
                    <CheckCircle2 className="h-5 w-5" /> CHECK IN
                  </Button>
                  <Button variant="gold" size="lg" disabled={isPending || !selected.group_id} onClick={() => checkInSelected("group")}>
                    <Users className="h-5 w-5" /> CHECK IN GROUP
                  </Button>
                  <Button variant="secondary" size="lg" disabled={isPending} onClick={() => checkInSelected("partial")}>
                    CHECK IN PARTIAL
                  </Button>
                  <Button variant="outline" size="lg" disabled={isPending || selected.attendance_status !== "checked_in"} onClick={() => runAction("Check-in undone.", () => undoCheckIn(selected.id))}>
                    <RotateCcw className="h-5 w-5" /> UNDO
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label>Change table</Label>
                  <select
                    className="h-12 w-full rounded-xl border border-black/10 bg-white/80 px-3 text-base"
                    value={selected.table_id ?? ""}
                    onChange={(event) => {
                      const tableId = event.target.value || null;
                      runAction("Table updated.", () =>
                        assignGuestToTable({ guestId: selected.id, tableId }),
                      );
                    }}
                  >
                    <option value="">Unassigned</option>
                    {tables.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.table_number} · {table.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <EmptyState title="Select a guest" description="Search results will appear on the left." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Walk-in
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createWalkInGuest} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={walkInName} onChange={(event) => setWalkInName(event.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={walkInPhone} onChange={(event) => setWalkInPhone(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Count</Label>
                  <Input type="number" min={1} value={walkInCount} onChange={(event) => setWalkInCount(Number(event.target.value))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Table</Label>
                <select className="h-10 w-full rounded-xl border border-black/10 bg-white/80 px-3 text-sm" value={walkInTable} onChange={(event) => setWalkInTable(event.target.value)}>
                  <option value="">Assign later</option>
                  {tables.map((table) => <option key={table.id} value={table.id}>{table.table_number}</option>)}
                </select>
              </div>
              <Button className="w-full" disabled={isPending}>
                <Armchair className="h-4 w-4" /> Create walk-in
              </Button>
            </form>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-[var(--muted)]/70 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground)]/45">{label}</p>
      <p className="mt-1 font-semibold capitalize">{value}</p>
    </div>
  );
}
