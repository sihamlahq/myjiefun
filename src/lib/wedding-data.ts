import { createClient } from "@/lib/supabase/server";
import type {
  AttendanceSettings,
  CheckInEvent,
  GuestGroup,
  GuestSettings,
  GuestWithRelations,
  ReceptionTable,
  Seat,
  TableSettings,
  ThemeSettings,
  WeddingSettings,
} from "@/types/wedding";

export type CheckInEventWithGuest = CheckInEvent & {
  guests?: Pick<GuestWithRelations, "id" | "name_en" | "name_zh" | "guest_code" | "table_id"> | null;
};

export type WeddingSettingKey =
  | "wedding"
  | "theme"
  | "guestSettings"
  | "tableSettings"
  | "attendanceSettings";

export type WeddingSettingsMap = {
  wedding: WeddingSettings;
  theme: ThemeSettings;
  guestSettings: GuestSettings;
  tableSettings: TableSettings;
  attendanceSettings: AttendanceSettings;
};

export type WeddingData = {
  guests: GuestWithRelations[];
  tables: ReceptionTable[];
  seats: Seat[];
  groups: GuestGroup[];
  checkInEvents: CheckInEventWithGuest[];
  settings: Partial<WeddingSettingsMap>;
  setupError: string | null;
};

export const defaultWeddingSettings: WeddingSettings = {
  coupleNames: "Alex & Jordan",
  title: "Wedding Guest & Seating Manager",
  date: "",
  venue: "Grand Ballroom",
  logoUrl: "",
  backgroundImageUrl: "",
};

export const defaultThemeSettings: ThemeSettings = {
  primary: "#8B7355",
  secondary: "#C9A66B",
  accent: "#D4AF37",
  background: "#F7F3EC",
  foreground: "#2C2A26",
  headingFont: "Cormorant Garamond",
  bodyFont: "Source Sans 3",
  radius: "0.75rem",
  tableStyle: "rounded",
};

export const defaultGuestSettings: GuestSettings = {
  categories: ["Family", "Friends", "Colleagues", "VIP", "Other"],
  rsvpStatuses: ["pending", "confirmed", "declined", "maybe"],
  dietaryCategories: ["None", "Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-free", "Allergy"],
};

export const defaultTableSettings: TableSettings = {
  defaultCapacity: 10,
  namingFormat: "Table {n}",
  seatNumbering: "numeric",
  tableTypes: ["normal", "vip", "family", "bride_groom", "groom_side", "bride_side", "reserved", "custom"],
};

export const defaultAttendanceSettings: AttendanceSettings = {
  allowPartialGroupCheckIn: true,
  allowOvercapacity: false,
  requireCheckInStaff: true,
  allowUndo: true,
};

export const defaultSettings: WeddingSettingsMap = {
  wedding: defaultWeddingSettings,
  theme: defaultThemeSettings,
  guestSettings: defaultGuestSettings,
  tableSettings: defaultTableSettings,
  attendanceSettings: defaultAttendanceSettings,
};

const emptyWeddingData: WeddingData = {
  guests: [],
  tables: [],
  seats: [],
  groups: [],
  checkInEvents: [],
  settings: {},
  setupError: null,
};

type SettingsRow = {
  key: WeddingSettingKey;
  value: unknown;
};

export async function loadWeddingData(): Promise<WeddingData> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    return {
      ...emptyWeddingData,
      setupError: error instanceof Error ? error.message : "Supabase is not configured.",
    };
  }

  try {
    const [guests, tables, seats, groups, checkInEvents, settings] = await Promise.all([
      supabase
        .from("guests")
        .select("*, guest_groups(*), reception_tables(*), seats(*)")
        .order("name_en", { ascending: true }),
      supabase
        .from("reception_tables")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("table_number", { ascending: true }),
      supabase
        .from("seats")
        .select("*")
        .order("seat_number", { ascending: true }),
      supabase
        .from("guest_groups")
        .select("*")
        .order("name", { ascending: true }),
      supabase
        .from("check_in_events")
        .select("*, guests(id, name_en, name_zh, guest_code, table_id)")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("app_settings").select("key, value"),
    ]);

    const setupError =
      guests.error?.message ||
      tables.error?.message ||
      seats.error?.message ||
      groups.error?.message ||
      checkInEvents.error?.message ||
      settings.error?.message ||
      null;

    const settingsMap: Partial<WeddingSettingsMap> = {};
    for (const row of (settings.data ?? []) as SettingsRow[]) {
      if (row.key === "wedding") settingsMap.wedding = row.value as WeddingSettings;
      if (row.key === "theme") settingsMap.theme = row.value as ThemeSettings;
      if (row.key === "guestSettings") settingsMap.guestSettings = row.value as GuestSettings;
      if (row.key === "tableSettings") settingsMap.tableSettings = row.value as TableSettings;
      if (row.key === "attendanceSettings") {
        settingsMap.attendanceSettings = row.value as AttendanceSettings;
      }
    }

    return {
      guests: (guests.data ?? []) as GuestWithRelations[],
      tables: (tables.data ?? []) as ReceptionTable[],
      seats: (seats.data ?? []) as Seat[],
      groups: (groups.data ?? []) as GuestGroup[],
      checkInEvents: (checkInEvents.data ?? []) as CheckInEventWithGuest[],
      settings: settingsMap,
      setupError,
    };
  } catch (error) {
    return {
      ...emptyWeddingData,
      setupError: error instanceof Error ? error.message : "Unable to load wedding data.",
    };
  }
}

export function withDefaultSettings(settings: Partial<WeddingSettingsMap>): WeddingSettingsMap {
  return {
    wedding: { ...defaultSettings.wedding, ...settings.wedding },
    theme: { ...defaultSettings.theme, ...settings.theme },
    guestSettings: { ...defaultSettings.guestSettings, ...settings.guestSettings },
    tableSettings: { ...defaultSettings.tableSettings, ...settings.tableSettings },
    attendanceSettings: {
      ...defaultSettings.attendanceSettings,
      ...settings.attendanceSettings,
    },
  };
}
