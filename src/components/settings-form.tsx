"use client";

import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { saveSetting, wipeAllGuests } from "@/lib/actions/wedding";
import type { WeddingSettingsMap } from "@/lib/wedding-data";
import type {
  AttendanceSettings,
  GuestSettings,
  TableSettings,
  ThemeSettings,
  WeddingSettings,
} from "@/types/wedding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";

export function SettingsForm({
  settings,
  guestCount = 0,
}: {
  settings: WeddingSettingsMap;
  guestCount?: number;
}) {
  const router = useRouter();
  const [wedding, setWedding] = useState<WeddingSettings>(settings.wedding);
  const [theme, setTheme] = useState<ThemeSettings>(settings.theme);
  const [guestSettings, setGuestSettings] = useState<GuestSettings>(settings.guestSettings);
  const [tableSettings, setTableSettings] = useState<TableSettings>(settings.tableSettings);
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings>(settings.attendanceSettings);
  const [wipeConfirm, setWipeConfirm] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isWiping, setIsWiping] = useState(false);

  function persist(key: keyof WeddingSettingsMap, value: WeddingSettingsMap[keyof WeddingSettingsMap]) {
    startTransition(async () => {
      try {
        await saveSetting(key, value);
        if (key === "theme") applyTheme(value as ThemeSettings);
        toast.success("Settings saved.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save settings.");
      }
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SettingsCard title="Wedding" onSubmit={(event) => { event.preventDefault(); persist("wedding", wedding); }} pending={isPending}>
        <Field label="Couple names"><Input value={wedding.coupleNames} onChange={(event) => setWedding({ ...wedding, coupleNames: event.target.value })} /></Field>
        <Field label="Title"><Input value={wedding.title} onChange={(event) => setWedding({ ...wedding, title: event.target.value })} /></Field>
        <Field label="Date"><Input type="date" value={wedding.date} onChange={(event) => setWedding({ ...wedding, date: event.target.value })} /></Field>
        <Field label="Venue"><Input value={wedding.venue} onChange={(event) => setWedding({ ...wedding, venue: event.target.value })} /></Field>
        <Field label="Logo URL"><Input value={wedding.logoUrl} onChange={(event) => setWedding({ ...wedding, logoUrl: event.target.value })} /></Field>
        <Field label="Background image URL"><Input value={wedding.backgroundImageUrl} onChange={(event) => setWedding({ ...wedding, backgroundImageUrl: event.target.value })} /></Field>
      </SettingsCard>

      <SettingsCard title="Theme" onSubmit={(event) => { event.preventDefault(); persist("theme", theme); }} pending={isPending}>
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Primary" value={theme.primary} onChange={(value) => setTheme({ ...theme, primary: value })} />
          <ColorField label="Secondary" value={theme.secondary} onChange={(value) => setTheme({ ...theme, secondary: value })} />
          <ColorField label="Accent" value={theme.accent} onChange={(value) => setTheme({ ...theme, accent: value })} />
          <ColorField label="Background" value={theme.background} onChange={(value) => setTheme({ ...theme, background: value })} />
          <ColorField label="Foreground" value={theme.foreground} onChange={(value) => setTheme({ ...theme, foreground: value })} />
          <Field label="Radius"><Input value={theme.radius} onChange={(event) => setTheme({ ...theme, radius: event.target.value })} /></Field>
        </div>
        <Field label="Heading font"><Input value={theme.headingFont} onChange={(event) => setTheme({ ...theme, headingFont: event.target.value })} /></Field>
        <Field label="Body font"><Input value={theme.bodyFont} onChange={(event) => setTheme({ ...theme, bodyFont: event.target.value })} /></Field>
        <Field label="Table style"><Input value={theme.tableStyle} onChange={(event) => setTheme({ ...theme, tableStyle: event.target.value })} /></Field>
      </SettingsCard>

      <SettingsCard title="Guest settings" onSubmit={(event) => { event.preventDefault(); persist("guestSettings", guestSettings); }} pending={isPending}>
        <TextList label="Categories" value={guestSettings.categories} onChange={(categories) => setGuestSettings({ ...guestSettings, categories })} />
        <TextList label="RSVP statuses" value={guestSettings.rsvpStatuses} onChange={(rsvpStatuses) => setGuestSettings({ ...guestSettings, rsvpStatuses })} />
        <TextList label="Dietary categories" value={guestSettings.dietaryCategories} onChange={(dietaryCategories) => setGuestSettings({ ...guestSettings, dietaryCategories })} />
      </SettingsCard>

      <SettingsCard title="Table settings" onSubmit={(event) => { event.preventDefault(); persist("tableSettings", tableSettings); }} pending={isPending}>
        <Field label="Default capacity"><Input type="number" min={1} value={tableSettings.defaultCapacity} onChange={(event) => setTableSettings({ ...tableSettings, defaultCapacity: Number(event.target.value) })} /></Field>
        <Field label="Naming format"><Input value={tableSettings.namingFormat} onChange={(event) => setTableSettings({ ...tableSettings, namingFormat: event.target.value })} /></Field>
        <Field label="Seat numbering"><Input value={tableSettings.seatNumbering} onChange={(event) => setTableSettings({ ...tableSettings, seatNumbering: event.target.value })} /></Field>
        <TextList label="Table types" value={tableSettings.tableTypes} onChange={(tableTypes) => setTableSettings({ ...tableSettings, tableTypes })} />
      </SettingsCard>

      <SettingsCard title="Attendance settings" onSubmit={(event) => { event.preventDefault(); persist("attendanceSettings", attendanceSettings); }} pending={isPending}>
        {[
          ["allowWalkIns", "Allow walk-ins"],
          ["allowPartialGroupCheckIn", "Allow partial group check-in"],
          ["allowOvercapacity", "Allow overcapacity"],
          ["requireCheckInStaff", "Require check-in staff"],
          ["allowUndo", "Allow undo"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center justify-between rounded-xl bg-white/65 px-4 py-3 text-sm font-semibold">
            {label}
            <input
              type="checkbox"
              checked={attendanceSettings[key as keyof AttendanceSettings]}
              onChange={(event) =>
                setAttendanceSettings({
                  ...attendanceSettings,
                  [key]: event.target.checked,
                })
              }
            />
          </label>
        ))}
      </SettingsCard>

      <Card className="border-red-200/80 bg-red-50/40 xl:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <Trash2 className="h-5 w-5" />
            Danger zone
          </CardTitle>
          <CardDescription className="text-red-900/70">
            Wipe the entire guest list ({guestCount} guests). Tables and seating layout stay.
            Check-in history for those guests is removed. Admin only — this cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="wipe-confirm">Type DELETE to confirm</Label>
            <Input
              id="wipe-confirm"
              value={wipeConfirm}
              onChange={(event) => setWipeConfirm(event.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              className="max-w-xs border-red-200 bg-white"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || isWiping || wipeConfirm.trim().toUpperCase() !== "DELETE"}
            onClick={() => {
              if (
                !window.confirm(
                  `Delete all ${guestCount} guests permanently? This cannot be undone.`,
                )
              ) {
                return;
              }
              setIsWiping(true);
              startTransition(async () => {
                try {
                  const result = await wipeAllGuests(wipeConfirm);
                  toast.success(
                    result.deleted
                      ? `Removed ${result.deleted} guests.`
                      : "Guest list is already empty.",
                  );
                  setWipeConfirm("");
                  router.refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Wipe failed.");
                } finally {
                  setIsWiping(false);
                }
              });
            }}
          >
            {isWiping ? "Wiping…" : "Wipe all guests"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsCard({
  title,
  children,
  onSubmit,
  pending,
}: {
  title: string;
  children: React.ReactNode;
  onSubmit: (event: FormEvent) => void;
  pending: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          {children}
          <Button disabled={pending}>{pending ? "Saving..." : `Save ${title}`}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="w-14 p-1" />
        <Input value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </Field>
  );
}

function TextList({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <Field label={`${label} (one per line)`}>
      <Textarea value={value.join("\n")} onChange={(event) => onChange(event.target.value.split("\n").map((line) => line.trim()).filter(Boolean))} />
    </Field>
  );
}

function applyTheme(theme: ThemeSettings) {
  const root = document.documentElement;
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--secondary", theme.secondary);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--background", theme.background);
  root.style.setProperty("--foreground", theme.foreground);
  root.style.setProperty("--radius", theme.radius);
  root.style.setProperty("--font-heading", `"${theme.headingFont}", Georgia, serif`);
  root.style.setProperty("--font-body", `"${theme.bodyFont}", system-ui, sans-serif`);
}
