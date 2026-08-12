"use client";

import { Gift, KeyRound, Lock, Search, X } from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  updateRedPacketAmount,
  updateRedPacketPasscode,
} from "@/lib/actions/wedding";
import { suppressRealtimeRefresh } from "@/lib/client-refresh";
import {
  formatMoney,
  getRedPacketAmount,
  isValidPasscode,
} from "@/lib/red-packet";
import { cn } from "@/lib/utils";
import type { GuestWithRelations, ReceptionTable } from "@/types/wedding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/page-chrome";
import { GuestTableLink } from "@/components/table-guests-dialog";

const UNLOCK_KEY = "myjiefun-red-packet-unlocked";

export function RedPacketPanel({
  guests: serverGuests,
  tables,
  passcode: serverPasscode,
}: {
  guests: GuestWithRelations[];
  tables: ReceptionTable[];
  passcode: string;
}) {
  const [guests, setGuests] = useState(serverGuests);
  const [passcode, setPasscode] = useState(serverPasscode);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [currentPin, setCurrentPin] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setGuests(serverGuests);
  }, [serverGuests]);

  useEffect(() => {
    setPasscode(serverPasscode);
  }, [serverPasscode]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(UNLOCK_KEY) === "1") setUnlocked(true);
    } catch {
      // ignore private mode failures
    }
  }, []);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const guest of guests) {
      const amount = getRedPacketAmount(guest);
      next[guest.id] = amount == null ? "" : String(amount);
    }
    setDrafts(next);
  }, [guests]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = !q
      ? [...guests]
      : guests.filter((guest) =>
          [guest.name_en, guest.name_zh, guest.nickname, guest.phone, guest.guest_code]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(q)),
        );

    // Unmarked first; saved/marked amounts sink to the bottom.
    return matched.sort((a, b) => {
      const aMarked = getRedPacketAmount(a) != null;
      const bMarked = getRedPacketAmount(b) != null;
      if (aMarked !== bMarked) return aMarked ? 1 : -1;
      return a.name_en.localeCompare(b.name_en);
    });
  }, [guests, query]);

  const unmarkedCount = useMemo(
    () => filtered.filter((guest) => getRedPacketAmount(guest) == null).length,
    [filtered],
  );

  const stats = useMemo(() => {
    let total = 0;
    let recorded = 0;
    const byTable = new Map<
      string,
      { tableNumber: string; tableName: string; total: number; count: number }
    >();

    for (const guest of guests) {
      const amount = getRedPacketAmount(guest);
      if (amount == null) continue;
      recorded += 1;
      total += amount;
      const tableId = guest.table_id || "__unassigned__";
      const tableNumber = guest.reception_tables?.table_number || "Unassigned";
      const tableName = guest.reception_tables?.name || "No table";
      const current = byTable.get(tableId) ?? {
        tableNumber,
        tableName,
        total: 0,
        count: 0,
      };
      current.total += amount;
      current.count += 1;
      byTable.set(tableId, current);
    }

    const tableRows = [...byTable.values()].sort((a, b) =>
      a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true }),
    );

    return {
      total,
      recorded,
      missing: guests.length - recorded,
      tableRows,
    };
  }, [guests]);

  function unlock(event: FormEvent) {
    event.preventDefault();
    if (pin !== passcode) {
      toast.error("Incorrect passcode.");
      setPin("");
      return;
    }
    setUnlocked(true);
    setPin("");
    try {
      sessionStorage.setItem(UNLOCK_KEY, "1");
    } catch {
      // ignore
    }
  }

  function lock() {
    setUnlocked(false);
    try {
      sessionStorage.removeItem(UNLOCK_KEY);
    } catch {
      // ignore
    }
  }

  function saveAmount(guest: GuestWithRelations) {
    const raw = (drafts[guest.id] ?? "").trim();
    const amount = raw === "" ? null : Number(raw);
    if (raw !== "" && (!Number.isFinite(amount) || (amount as number) < 0)) {
      toast.error("Enter a valid amount.");
      return;
    }

    const snapshot = guests;
    setGuests((prev) =>
      prev.map((item) => {
        if (item.id !== guest.id) return item;
        const customFields = { ...(item.custom_fields ?? {}) };
        if (amount == null) delete customFields.red_packet_amount;
        else customFields.red_packet_amount = amount;
        return {
          ...item,
          red_packet_amount: amount,
          custom_fields: customFields,
        };
      }),
    );
    toast.success(
      amount == null ? `${guest.name_en} amount cleared.` : `${guest.name_en}: ${formatMoney(amount)}`,
    );
    suppressRealtimeRefresh(1600);
    setBusyId(guest.id);
    startTransition(async () => {
      try {
        await updateRedPacketAmount(guest.id, amount);
      } catch (error) {
        setGuests(snapshot);
        toast.error(error instanceof Error ? error.message : "Unable to save amount.");
      } finally {
        setBusyId(null);
      }
    });
  }

  function changePasscode(event: FormEvent) {
    event.preventDefault();
    if (!isValidPasscode(nextPin)) {
      toast.error("New passcode must be 4 digits.");
      return;
    }
    if (nextPin !== confirmPin) {
      toast.error("New passcode confirmation does not match.");
      return;
    }
    startTransition(async () => {
      try {
        await updateRedPacketPasscode(nextPin, currentPin);
        setPasscode(nextPin);
        setCurrentPin("");
        setNextPin("");
        setConfirmPin("");
        toast.success("Passcode updated.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update passcode.");
      }
    });
  }

  if (!unlocked) {
    return (
      <Card className="mx-auto max-w-md border-[var(--danger)]/20 bg-white/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-[var(--danger)]" />
            Red Packet passcode
          </CardTitle>
          <p className="text-sm text-[var(--foreground)]/60">
            Enter the 4-digit passcode to view and edit red packet amounts.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={unlock} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="red-packet-pin">Passcode</Label>
              <Input
                id="red-packet-pin"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                autoComplete="one-time-code"
                placeholder="••••"
                className="h-14 text-center text-2xl tracking-[0.4em]"
                value={pin}
                onChange={(event) =>
                  setPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={pin.length !== 4}>
              Unlock
            </Button>
            <p className="text-center text-xs text-[var(--foreground)]/45">
              Default passcode is 0000 until you change it inside this page.
            </p>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total amount" value={formatMoney(stats.total)} tone="total" />
        <StatCard label="Recorded" value={String(stats.recorded)} tone="ok" />
        <StatCard label="Still empty" value={String(stats.missing)} tone="warn" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total by table</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.tableRows.length ? (
            <ul className="divide-y divide-black/8">
              {stats.tableRows.map((row) => (
                <li
                  key={`${row.tableNumber}-${row.tableName}`}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{row.tableNumber}</p>
                    <p className="truncate text-sm text-[var(--foreground)]/55">
                      {row.tableName} · {row.count} gift{row.count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="shrink-0 font-heading text-xl font-semibold">
                    {formatMoney(row.total)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No amounts yet"
              description="Record red packet amounts for checked-in guests below."
            />
          )}
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search guest name…"
          className="pl-9 pr-10"
          aria-label="Search guest name"
        />
        {query ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/5"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Checked-in guests</CardTitle>
            <p className="mt-1 text-sm text-[var(--foreground)]/55">
              Showing {filtered.length} of {guests.length}
              {unmarkedCount < filtered.length
                ? ` · ${unmarkedCount} to mark · ${filtered.length - unmarkedCount} marked`
                : ""}
            </p>
          </div>
          <Gift className="h-5 w-5 text-[var(--danger)]" />
        </CardHeader>
        <CardContent>
          {filtered.length ? (
            <ul className="space-y-2">
              {filtered.map((guest, index) => {
                const busy = busyId === guest.id && isPending;
                const marked = getRedPacketAmount(guest) != null;
                const showMarkedDivider =
                  marked &&
                  (index === 0 || getRedPacketAmount(filtered[index - 1]) == null);
                return (
                  <li key={guest.id} className="space-y-2">
                    {showMarkedDivider ? (
                      <p className="pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--foreground)]/45">
                        Marked guests
                      </p>
                    ) : null}
                    <div
                      className={cn(
                        "rounded-2xl border p-3 shadow-sm sm:p-4",
                        marked
                          ? "border-emerald-200/80 bg-emerald-50/55"
                          : "border-black/8 bg-white/90",
                      )}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-lg font-semibold leading-tight">
                            {guest.name_en}
                            {marked ? (
                              <span className="ml-2 align-middle rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                Marked
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 truncate text-sm text-[var(--foreground)]/55">
                            {[guest.name_zh, guest.phone].filter(Boolean).join(" · ") ||
                              guest.guest_code}
                          </p>
                          <p className="mt-1 text-sm text-[var(--foreground)]/70">
                            <GuestTableLink
                              guest={guest}
                              tables={tables}
                              guests={guests}
                              className="font-medium"
                            />
                          </p>
                        </div>
                        <div className="flex w-full items-center gap-2 sm:w-auto">
                          <Input
                            inputMode="decimal"
                            placeholder="Amount"
                            className="h-11 w-full sm:w-32"
                            value={drafts[guest.id] ?? ""}
                            disabled={busy}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [guest.id]: event.target.value.replace(/[^\d.]/g, ""),
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                saveAmount(guest);
                              }
                            }}
                          />
                          <Button
                            className="h-11 shrink-0"
                            disabled={busy}
                            onClick={() => saveAmount(guest)}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              title={query ? "No matching guests" : "No checked-in guests yet"}
              description={
                query
                  ? "Try another name."
                  : "Guests appear here after they check in."
              }
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Passcode settings
          </CardTitle>
          <p className="text-sm text-[var(--foreground)]/60">
            Change the 4-digit passcode used to open this page.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePasscode} className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="current-pin">Current</Label>
              <Input
                id="current-pin"
                inputMode="numeric"
                maxLength={4}
                value={currentPin}
                onChange={(event) =>
                  setCurrentPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="next-pin">New</Label>
              <Input
                id="next-pin"
                inputMode="numeric"
                maxLength={4}
                value={nextPin}
                onChange={(event) =>
                  setNextPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pin">Confirm new</Label>
              <Input
                id="confirm-pin"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(event) =>
                  setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-3">
              <Button type="submit" disabled={isPending}>
                Update passcode
              </Button>
              <Button type="button" variant="outline" onClick={lock}>
                Lock page
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "total" | "ok" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-3 shadow-sm",
        tone === "total" && "bg-[color-mix(in_oklab,#9b2c2c_12%,white)] text-[#7a1f1f]",
        tone === "ok" && "bg-emerald-50 text-emerald-900",
        tone === "warn" && "bg-amber-50 text-amber-950",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-65">{label}</p>
      <p className="font-heading mt-1 text-3xl font-semibold leading-none">{value}</p>
    </div>
  );
}
