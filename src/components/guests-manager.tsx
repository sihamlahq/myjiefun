"use client";

import Fuse from "fuse.js";
import { Check, CheckCircle2, ChevronDown, Download, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { deleteGuest, importGuests, updateRsvp, updateRsvpBulk, upsertGuest } from "@/lib/actions/wedding";
import { suppressRealtimeRefresh } from "@/lib/client-refresh";
import { getRedPacketAmount } from "@/lib/red-packet";
import {
  fileToGuestImportRows,
  guestUploadTemplateCsv,
  guestUploadTemplateXlsx,
  guestsToCsv,
  GUEST_UPLOAD_HEADERS,
} from "@/lib/csv";
import { cn } from "@/lib/utils";
import type {
  AttendanceStatus,
  Guest,
  GuestWithRelations,
  ReceptionTable,
  RsvpStatus,
} from "@/types/wedding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/page-chrome";
import { GuestTableLink } from "@/components/table-guests-dialog";

const PAGE_SIZE = 15;

type GuestDraft = Pick<
  Guest,
  | "name_en"
  | "name_zh"
  | "nickname"
  | "phone"
  | "email"
  | "guest_code"
  | "rsvp_status"
  | "attendance_status"
  | "expected_count"
  | "group_id"
  | "table_id"
  | "is_vip"
  | "dietary"
  | "relationship"
  | "category"
  | "notes"
  | "custom_fields"
> & { id?: string };

type ImportResult = {
  fileName: string;
  created: number;
  updated: number;
  skipped: number;
  total: number;
  errors: string[];
};

const rsvpOptions: RsvpStatus[] = ["pending", "confirmed", "maybe", "declined"];
const attendanceOptions: AttendanceStatus[] = ["not_arrived", "checked_in", "no_show"];

const emptyDraft: GuestDraft = {
  name_en: "",
  name_zh: "",
  nickname: "",
  phone: "",
  email: "",
  guest_code: "",
  rsvp_status: "pending",
  attendance_status: "not_arrived",
  expected_count: 1,
  group_id: null,
  table_id: null,
  is_vip: false,
  dietary: "",
  relationship: "",
  category: "",
  notes: "",
  custom_fields: {},
};

const rsvpTone: Record<RsvpStatus, string> = {
  confirmed: "border-emerald-300 bg-emerald-50 text-emerald-900",
  pending: "border-amber-300 bg-amber-50 text-amber-950",
  maybe: "border-sky-300 bg-sky-50 text-sky-950",
  declined: "border-rose-300 bg-rose-50 text-rose-950",
};

function download(filename: string, content: string | ArrayBuffer, type = "text/csv;charset=utf-8") {
  const blob =
    typeof content === "string"
      ? new Blob([content], { type })
      : new Blob([content], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function customFieldsWithoutRedPacket(fields: Guest["custom_fields"] | null | undefined) {
  const base =
    fields && typeof fields === "object" && !Array.isArray(fields)
      ? (fields as Record<string, unknown>)
      : {};
  const next = { ...base };
  delete next.red_packet_amount;
  return next;
}

function restoreRedPacketInCustomFields(
  edited: Record<string, unknown>,
  guest?: GuestWithRelations | null,
) {
  const next = { ...edited };
  delete next.red_packet_amount;
  if (!guest) return next;
  const amount = getRedPacketAmount(guest);
  if (amount != null) next.red_packet_amount = amount;
  return next;
}

export function GuestsManager({
  guests: serverGuests,
  tables,
  categories = [],
  relationships = [],
  dietaryCategories = [],
}: {
  guests: GuestWithRelations[];
  tables: ReceptionTable[];
  categories?: string[];
  relationships?: string[];
  dietaryCategories?: string[];
}) {
  const router = useRouter();
  const [guests, setGuests] = useState(serverGuests);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [rsvp, setRsvp] = useState("all");
  const [attendance, setAttendance] = useState("all");
  const [vip, setVip] = useState("all");
  const [table, setTable] = useState("all");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<GuestDraft | null>(null);
  const [customFieldsText, setCustomFieldsText] = useState("{}");
  const [isPending, startTransition] = useTransition();
  const [savingRsvpId, setSavingRsvpId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [recordMenuOpen, setRecordMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const recordMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGuests(serverGuests);
  }, [serverGuests]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [deferredQuery, rsvp, attendance, vip, table, category]);

  useEffect(() => {
    if (!recordMenuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!recordMenuRef.current?.contains(event.target as Node)) {
        setRecordMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setRecordMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [recordMenuOpen]);

  const fuse = useMemo(() => {
    if (!deferredQuery.trim()) return null;
    return new Fuse(guests, {
      keys: [
        "name_en",
        "name_zh",
        "nickname",
        "phone",
        "email",
        "category",
        "reception_tables.table_number",
      ],
      threshold: 0.32,
      ignoreLocation: true,
    });
  }, [deferredQuery, guests]);

  const filtered = useMemo(() => {
    const searched = fuse
      ? fuse.search(deferredQuery.trim()).map((result) => result.item)
      : guests;
    return searched.filter((guest) => {
      if (rsvp !== "all" && guest.rsvp_status !== rsvp) return false;
      if (attendance !== "all" && guest.attendance_status !== attendance) return false;
      if (vip !== "all" && guest.is_vip !== (vip === "yes")) return false;
      if (table === "unassigned" && guest.table_id) return false;
      if (table !== "all" && table !== "unassigned" && guest.table_id !== table) return false;
      if (category === "uncategorized" && guest.category?.trim()) return false;
      if (
        category !== "all" &&
        category !== "uncategorized" &&
        guest.category !== category
      ) {
        return false;
      }
      return true;
    });
  }, [attendance, category, fuse, guests, deferredQuery, rsvp, table, vip]);

  const visibleGuests = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const selectedGuests = filtered.filter((guest) => selected.has(guest.id));
  const pendingCount = guests.filter((guest) => guest.rsvp_status === "pending").length;
  const confirmedCount = guests.filter((guest) => guest.rsvp_status === "confirmed").length;

  function openGuest(guest?: GuestWithRelations) {
    if (!guest) {
      setDraft(emptyDraft);
      setCustomFieldsText("{}");
      return;
    }
    const nextDraft: GuestDraft = {
      id: guest.id,
      name_en: guest.name_en,
      name_zh: guest.name_zh,
      nickname: guest.nickname,
      phone: guest.phone,
      email: guest.email,
      guest_code: guest.guest_code,
      rsvp_status: guest.rsvp_status,
      attendance_status: guest.attendance_status,
      expected_count: guest.expected_count,
      group_id: guest.group_id,
      table_id: guest.table_id,
      is_vip: guest.is_vip,
      dietary: guest.dietary,
      relationship: guest.relationship,
      category: guest.category,
      notes: guest.notes,
      custom_fields: guest.custom_fields,
    };
    setDraft(nextDraft);
    setCustomFieldsText(
      JSON.stringify(customFieldsWithoutRedPacket(guest.custom_fields), null, 2),
    );
  }

  function updateDraft<K extends keyof GuestDraft>(key: K, value: GuestDraft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function saveGuest(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;

    let customFields: Record<string, unknown>;
    try {
      customFields = JSON.parse(customFieldsText) as Record<string, unknown>;
    } catch {
      toast.error("Custom fields must be valid JSON.");
      return;
    }

    const existingGuest = draft.id ? guests.find((item) => item.id === draft.id) : null;
    customFields = restoreRedPacketInCustomFields(customFields, existingGuest);

    startTransition(async () => {
      try {
        await upsertGuest({
          ...draft,
          guest_code: draft.guest_code.trim() || undefined,
          group_id: draft.group_id || null,
          table_id: draft.table_id || null,
          custom_fields: customFields,
          expected_count: Number(draft.expected_count) || 1,
        });
        setDraft(null);
        toast.success("Guest saved.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save guest.");
      }
    });
  }

  function removeGuest(guest: GuestWithRelations) {
    if (!confirm(`Delete ${guest.name_en}? This cannot be undone.`)) return;
    const snapshot = guests;
    setGuests((prev) => prev.filter((item) => item.id !== guest.id));
    setSelected((current) => {
      const next = new Set(current);
      next.delete(guest.id);
      return next;
    });
    toast.success("Guest deleted.");
    suppressRealtimeRefresh(1600);
    startTransition(async () => {
      try {
        await deleteGuest(guest.id);
      } catch (error) {
        setGuests(snapshot);
        toast.error(error instanceof Error ? error.message : "Unable to delete guest.");
      }
    });
  }

  function setGuestRsvp(guest: GuestWithRelations, next: RsvpStatus) {
    if (guest.rsvp_status === next) return;
    const snapshot = guests;
    setGuests((prev) =>
      prev.map((item) => (item.id === guest.id ? { ...item, rsvp_status: next } : item)),
    );
    toast.success(
      next === "confirmed" ? `${guest.name_en} confirmed` : `${guest.name_en} → ${next}`,
    );
    suppressRealtimeRefresh(1600);
    setSavingRsvpId(guest.id);
    startTransition(async () => {
      try {
        await updateRsvp(guest.id, next);
      } catch (error) {
        setGuests(snapshot);
        toast.error(error instanceof Error ? error.message : "Unable to update RSVP.");
      } finally {
        setSavingRsvpId(null);
      }
    });
  }

  function confirmSelected() {
    const ids = selectedGuests.map((guest) => guest.id);
    if (!ids.length) {
      toast.error("Select guests first.");
      return;
    }
    const idSet = new Set(ids);
    const snapshot = guests;
    setGuests((prev) =>
      prev.map((item) =>
        idSet.has(item.id) ? { ...item, rsvp_status: "confirmed" as RsvpStatus } : item,
      ),
    );
    toast.success(`Confirmed ${ids.length} guest(s).`);
    setSelected(new Set());
    suppressRealtimeRefresh(1600);
    startTransition(async () => {
      try {
        await updateRsvpBulk(ids, "confirmed");
      } catch (error) {
        setGuests(snapshot);
        toast.error(error instanceof Error ? error.message : "Bulk confirm failed.");
      }
    });
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    const rows = selectedGuests.length ? selectedGuests : filtered;
    download(`myjiefun-guests-${new Date().toISOString().slice(0, 10)}.csv`, guestsToCsv(rows));
  }

  function downloadTemplate() {
    download(
      "myjiefun-guest-upload-template.xlsx",
      guestUploadTemplateXlsx({ categories, relationships }),
    );
  }

  function downloadCsvTemplate() {
    download(
      "myjiefun-guest-upload-template.csv",
      guestUploadTemplateCsv({ categories, relationships }),
    );
  }

  function closeImportResult() {
    setImportResult(null);
    setSelected(new Set());
    router.refresh();
  }

  async function importGuestFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    let rows: Record<string, string>[] = [];
    try {
      rows = await fileToGuestImportRows(file);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to read that file.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    if (!rows.length) {
      toast.error("File has no data rows. Use columns: " + GUEST_UPLOAD_HEADERS.join(", "));
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    startTransition(async () => {
      try {
        const result = await importGuests(rows);
        setImportResult({
          fileName: file.name,
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
          total: result.total,
          errors: result.errors,
        });
        setSelected(new Set());
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Guest file import failed.");
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every((guest) => selected.has(guest.id));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:max-w-md">
        <div className="rounded-2xl bg-amber-50 px-3 py-2.5 text-center shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-900/60">Pending</p>
          <p className="font-heading text-2xl font-semibold text-amber-950">{pendingCount}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-3 py-2.5 text-center shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-900/60">Confirmed</p>
          <p className="font-heading text-2xl font-semibold text-emerald-950">{confirmedCount}</p>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(220px,1fr)_repeat(5,minmax(120px,auto))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or phone…"
              className="pl-9"
            />
          </div>
          <select className="rounded-xl border border-black/10 bg-white/80 px-3 text-sm" value={rsvp} onChange={(event) => setRsvp(event.target.value)}>
            <option value="all">All RSVP</option>
            {rsvpOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select className="rounded-xl border border-black/10 bg-white/80 px-3 text-sm" value={attendance} onChange={(event) => setAttendance(event.target.value)}>
            <option value="all">All attendance</option>
            {attendanceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select className="rounded-xl border border-black/10 bg-white/80 px-3 text-sm" value={vip} onChange={(event) => setVip(event.target.value)}>
            <option value="all">VIP all</option>
            <option value="yes">VIP only</option>
            <option value="no">Non-VIP</option>
          </select>
          <select className="rounded-xl border border-black/10 bg-white/80 px-3 text-sm" value={table} onChange={(event) => setTable(event.target.value)}>
            <option value="all">All tables</option>
            <option value="unassigned">Unassigned</option>
            {tables.map((item) => <option key={item.id} value={item.id}>{item.table_number}</option>)}
          </select>
          <select
            className="rounded-xl border border-black/10 bg-white/80 px-3 text-sm"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            <option value="uncategorized">Uncategorized</option>
            {categories.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--foreground)]/65">
          Showing {Math.min(visibleCount, filtered.length)} of {filtered.length}
          {filtered.length !== guests.length ? ` · ${guests.length} total` : ""}
          {selected.size ? ` · ${selected.size} selected` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,.xlsm,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={importGuestFile}
          />
          {selected.size > 0 ? (
            <Button onClick={confirmSelected} disabled={isPending} variant="gold" className="shrink-0">
              <Check className="h-4 w-4" /> Confirm selected ({selected.size})
            </Button>
          ) : null}

          <div className="relative" ref={recordMenuRef}>
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              aria-expanded={recordMenuOpen}
              aria-haspopup="menu"
              onClick={() => setRecordMenuOpen((open) => !open)}
            >
              Guest record setting
              <ChevronDown className={cn("h-4 w-4 transition", recordMenuOpen && "rotate-180")} />
            </Button>
            {recordMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-black/10 bg-white py-1 shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-black/5"
                  onClick={() => {
                    downloadTemplate();
                    setRecordMenuOpen(false);
                  }}
                >
                  <Download className="h-4 w-4" /> Excel template
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-black/5"
                  onClick={() => {
                    downloadCsvTemplate();
                    setRecordMenuOpen(false);
                  }}
                >
                  <Download className="h-4 w-4" /> CSV template
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-black/5 disabled:opacity-50"
                  disabled={isPending}
                  onClick={() => {
                    setRecordMenuOpen(false);
                    fileRef.current?.click();
                  }}
                >
                  <Upload className="h-4 w-4" /> Import file
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-black/5"
                  onClick={() => {
                    exportCsv();
                    setRecordMenuOpen(false);
                  }}
                >
                  <Download className="h-4 w-4" /> Export CSV
                </button>
              </div>
            ) : null}
          </div>

          <Button onClick={() => openGuest()} className="shrink-0">
            <Plus className="h-4 w-4" /> Add guest
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>Guest list</CardTitle>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]/70">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={() =>
                setSelected((current) => {
                  const next = new Set(current);
                  if (allVisibleSelected) filtered.forEach((guest) => next.delete(guest.id));
                  else filtered.forEach((guest) => next.add(guest.id));
                  return next;
                })
              }
            />
            Select all shown
          </label>
        </CardHeader>
        <CardContent>
          {filtered.length ? (
            <ul className="space-y-2">
              {visibleGuests.map((guest) => {
                const busy = isPending && savingRsvpId === guest.id;
                return (
                  <li
                    key={guest.id}
                    className={cn(
                      "rounded-2xl border bg-white/90 p-3 shadow-sm sm:p-4",
                      guest.rsvp_status === "confirmed" ? "border-emerald-200/80" : "border-black/8",
                    )}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1.5"
                          checked={selected.has(guest.id)}
                          onChange={() => toggleSelected(guest.id)}
                          aria-label={`Select ${guest.name_en}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 truncate text-lg font-semibold leading-tight">
                              {guest.name_en}
                              {guest.is_vip ? (
                                <span className="ml-2 align-middle rounded bg-[var(--accent)]/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                                  VIP
                                </span>
                              ) : null}
                            </p>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-9 w-9 shrink-0 p-0"
                              onClick={() => removeGuest(guest)}
                              aria-label={`Delete ${guest.name_en}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <p className="mt-1 text-sm text-[var(--foreground)]/70">
                            <GuestTableLink
                              guest={guest}
                              tables={tables}
                              guests={guests}
                              className="font-medium"
                            />
                            {guest.category ? ` · ${guest.category}` : ""}
                            {` · party ${guest.expected_count}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {guest.rsvp_status !== "confirmed" ? (
                          <Button
                            size="sm"
                            className="h-10 min-w-[7.5rem]"
                            disabled={busy || isPending}
                            onClick={() => setGuestRsvp(guest, "confirmed")}
                          >
                            <Check className="h-4 w-4" />
                            Confirm
                          </Button>
                        ) : (
                          <span className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white">
                            Confirmed
                          </span>
                        )}

                        <select
                          aria-label={`RSVP for ${guest.name_en}`}
                          className={cn(
                            "h-11 rounded-xl border px-3 text-base font-semibold capitalize md:h-10 md:text-sm",
                            rsvpTone[guest.rsvp_status],
                          )}
                          value={guest.rsvp_status}
                          disabled={busy || isPending}
                          onChange={(event) => setGuestRsvp(guest, event.target.value as RsvpStatus)}
                        >
                          {rsvpOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>

                        <Button size="sm" variant="outline" className="h-10" onClick={() => openGuest(guest)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No guests found" description="Adjust filters, import a CSV, or add the first guest manually." />
          )}
          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                Show more ({filtered.length - visibleCount} left)
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {draft ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
          <form
            onSubmit={saveGuest}
            className="mobile-safe-bottom max-h-[min(92dvh,100%)] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-white/50 bg-[var(--background)] p-5 shadow-2xl touch-scroll sm:max-h-[90vh] sm:rounded-3xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Guest details</p>
                <h2 className="font-heading text-3xl font-semibold">{draft.id ? "Edit guest" : "Add guest"}</h2>
              </div>
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>Close</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="English name"><Input required value={draft.name_en} onChange={(event) => updateDraft("name_en", event.target.value)} /></Field>
              <Field label="Chinese name"><Input value={draft.name_zh} onChange={(event) => updateDraft("name_zh", event.target.value)} /></Field>
              <Field label="Nickname"><Input value={draft.nickname} onChange={(event) => updateDraft("nickname", event.target.value)} /></Field>
              <Field label="Phone"><Input value={draft.phone} onChange={(event) => updateDraft("phone", event.target.value)} /></Field>
              <Field label="Email"><Input type="email" value={draft.email} onChange={(event) => updateDraft("email", event.target.value)} /></Field>
              <Field label="Expected count"><Input type="number" min={0} value={draft.expected_count} onChange={(event) => updateDraft("expected_count", Number(event.target.value))} /></Field>
              <Field label="RSVP"><Select value={draft.rsvp_status} onChange={(value) => updateDraft("rsvp_status", value as RsvpStatus)} options={rsvpOptions} /></Field>
              <Field label="Attendance"><Select value={draft.attendance_status} onChange={(value) => updateDraft("attendance_status", value as AttendanceStatus)} options={attendanceOptions} /></Field>
              <Field label="Table">
                <select className="h-11 rounded-xl border border-black/10 bg-white/80 px-3 text-base md:h-10 md:text-sm" value={draft.table_id ?? ""} onChange={(event) => updateDraft("table_id", event.target.value || null)}>
                  <option value="">Unassigned</option>
                  {tables.map((item) => <option key={item.id} value={item.id}>{item.table_number} · {item.name}</option>)}
                </select>
              </Field>
              <Field label="Dietary">
                <select
                  className="h-11 w-full rounded-xl border border-black/10 bg-white/80 px-3 text-base md:h-10 md:text-sm"
                  value={draft.dietary}
                  onChange={(event) => updateDraft("dietary", event.target.value)}
                >
                  <option value="">Select dietary…</option>
                  {dietaryCategories.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  {draft.dietary && !dietaryCategories.includes(draft.dietary) ? (
                    <option value={draft.dietary}>{draft.dietary} (current)</option>
                  ) : null}
                </select>
              </Field>
              <Field label="Relationship">
                <select
                  className="h-11 w-full rounded-xl border border-black/10 bg-white/80 px-3 text-base md:h-10 md:text-sm"
                  value={draft.relationship}
                  onChange={(event) => updateDraft("relationship", event.target.value)}
                >
                  <option value="">Select relationship…</option>
                  {relationships.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  {draft.relationship && !relationships.includes(draft.relationship) ? (
                    <option value={draft.relationship}>{draft.relationship} (current)</option>
                  ) : null}
                </select>
              </Field>
              <Field label="Category">
                <select
                  className="h-11 w-full rounded-xl border border-black/10 bg-white/80 px-3 text-base md:h-10 md:text-sm"
                  value={draft.category}
                  onChange={(event) => updateDraft("category", event.target.value)}
                >
                  <option value="">Select category…</option>
                  {categories.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  {draft.category && !categories.includes(draft.category) ? (
                    <option value={draft.category}>{draft.category} (current)</option>
                  ) : null}
                </select>
              </Field>
              <label className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2 text-sm font-semibold">
                <input type="checkbox" checked={draft.is_vip} onChange={(event) => updateDraft("is_vip", event.target.checked)} /> VIP guest
              </label>
              <Field label="Notes" className="md:col-span-2"><Textarea value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} /></Field>
              <Field label="Custom fields JSON" className="md:col-span-2"><Textarea className="font-mono" value={customFieldsText} onChange={(event) => setCustomFieldsText(event.target.value)} /></Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save guest"}</Button>
            </div>
          </form>
        </div>
      ) : null}

      {importResult ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={closeImportResult}
          role="presentation"
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-[var(--background)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Upload complete"
          >
            <div className="flex items-start justify-between gap-3 border-b border-black/8 px-5 py-4">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 grid h-11 w-11 place-items-center rounded-2xl",
                    importResult.errors.length
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800",
                  )}
                >
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                    Upload complete
                  </p>
                  <h2 className="font-heading text-3xl font-semibold leading-tight">
                    Guest list updated
                  </h2>
                  <p className="mt-1 truncate text-sm text-[var(--foreground)]/60">{importResult.fileName}</p>
                </div>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={closeImportResult} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 px-5 py-4 sm:grid-cols-4">
              <ImportStat label="Added" value={importResult.created} />
              <ImportStat label="Updated" value={importResult.updated} />
              <ImportStat label="Skipped" value={importResult.skipped} />
              <ImportStat label="Rows" value={importResult.total} />
            </div>

            {importResult.errors.length ? (
              <div className="mx-5 mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-left text-sm text-amber-950">
                <p className="font-semibold">Some rows need attention</p>
                <ul className="mt-2 space-y-1 text-amber-900/80">
                  {importResult.errors.slice(0, 5).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="px-5 pb-2 text-sm text-[var(--foreground)]/65">
                The latest guest list has been refreshed automatically.
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-black/8 px-5 py-4">
              <Button type="button" onClick={closeImportResult}>
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ImportStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[var(--muted)]/70 px-3 py-2.5 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]/55">
        {label}
      </p>
      <p className="font-heading text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select className="h-11 w-full rounded-xl border border-black/10 bg-white/80 px-3 text-base md:h-10 md:text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}
