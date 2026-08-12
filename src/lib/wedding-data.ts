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
  relationships: [
    "Bride's family",
    "Groom's family",
    "Friend",
    "Colleague",
    "Schoolmate",
    "Other",
  ],
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

    return {
      guests: (guests.data ?? []) as GuestWithRelations[],
      tables: (tables.data ?? []) as ReceptionTable[],
      seats: (seats.data ?? []) as Seat[],
      groups: (groups.data ?? []) as GuestGroup[],
      checkInEvents: (checkInEvents.data ?? []) as CheckInEventWithGuest[],
      settings: mapSettings((settings.data ?? []) as SettingsRow[]),
      setupError,
    };
  } catch (error) {
    return {
      ...emptyWeddingData,
      setupError: error instanceof Error ? error.message : "Unable to load wedding data.",
    };
  }
}

/** Faster path for check-in / seating — skips seats, groups list, events, settings. */
export async function loadGuestsAndTables(): Promise<{
  guests: GuestWithRelations[];
  tables: ReceptionTable[];
  setupError: string | null;
}> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    return {
      guests: [],
      tables: [],
      setupError: error instanceof Error ? error.message : "Supabase is not configured.",
    };
  }

  try {
    const [guests, tables] = await Promise.all([
      supabase
        .from("guests")
        .select("*, guest_groups(id,name), reception_tables(id,table_number,name,capacity,table_type,status,location)")
        .order("name_en", { ascending: true }),
      supabase
        .from("reception_tables")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("table_number", { ascending: true }),
    ]);

    return {
      guests: (guests.data ?? []) as GuestWithRelations[],
      tables: (tables.data ?? []) as ReceptionTable[],
      setupError: guests.error?.message || tables.error?.message || null,
    };
  } catch (error) {
    return {
      guests: [],
      tables: [],
      setupError: error instanceof Error ? error.message : "Unable to load wedding data.",
    };
  }
}

/** Guests page only — guests + tables + guest settings lists. */
export async function loadGuestsPageData(): Promise<{
  guests: GuestWithRelations[];
  tables: ReceptionTable[];
  categories: string[];
  relationships: string[];
  dietaryCategories: string[];
  setupError: string | null;
}> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    return {
      guests: [],
      tables: [],
      categories: defaultGuestSettings.categories,
      relationships: defaultGuestSettings.relationships,
      dietaryCategories: defaultGuestSettings.dietaryCategories,
      setupError: error instanceof Error ? error.message : "Supabase is not configured.",
    };
  }

  try {
    const [guests, tables, guestSettingsRow] = await Promise.all([
      supabase
        .from("guests")
        .select("*, guest_groups(id,name), reception_tables(id,table_number,name,capacity,table_type,status,location)")
        .order("name_en", { ascending: true }),
      supabase
        .from("reception_tables")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("table_number", { ascending: true }),
      supabase.from("app_settings").select("value").eq("key", "guestSettings").maybeSingle(),
    ]);

    const guestSettings = {
      ...defaultGuestSettings,
      ...((guestSettingsRow.data?.value as GuestSettings | null) ?? {}),
    };

    return {
      guests: (guests.data ?? []) as GuestWithRelations[],
      tables: (tables.data ?? []) as ReceptionTable[],
      categories: guestSettings.categories?.length
        ? guestSettings.categories
        : defaultGuestSettings.categories,
      relationships: guestSettings.relationships?.length
        ? guestSettings.relationships
        : defaultGuestSettings.relationships,
      dietaryCategories: guestSettings.dietaryCategories?.length
        ? guestSettings.dietaryCategories
        : defaultGuestSettings.dietaryCategories,
      setupError:
        guests.error?.message ||
        tables.error?.message ||
        guestSettingsRow.error?.message ||
        null,
    };
  } catch (error) {
    return {
      guests: [],
      tables: [],
      categories: defaultGuestSettings.categories,
      relationships: defaultGuestSettings.relationships,
      dietaryCategories: defaultGuestSettings.dietaryCategories,
      setupError: error instanceof Error ? error.message : "Unable to load wedding data.",
    };
  }
}

/** Red packet page — checked-in guests + tables + passcode setting. */
export async function loadRedPacketData(): Promise<{
  guests: GuestWithRelations[];
  tables: ReceptionTable[];
  passcode: string;
  setupError: string | null;
}> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    return {
      guests: [],
      tables: [],
      passcode: "0000",
      setupError: error instanceof Error ? error.message : "Supabase is not configured.",
    };
  }

  try {
    const [guests, tables, settings] = await Promise.all([
      supabase
        .from("guests")
        .select(
          "*, guest_groups(id,name), reception_tables(id,table_number,name,capacity,table_type,status,location)",
        )
        .eq("attendance_status", "checked_in")
        .order("name_en", { ascending: true }),
      supabase
        .from("reception_tables")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("table_number", { ascending: true }),
      supabase.from("app_settings").select("value").eq("key", "redPacket").maybeSingle(),
    ]);

    const passcode =
      ((settings.data?.value as { passcode?: string } | null)?.passcode || "0000").toString();

    return {
      guests: (guests.data ?? []) as GuestWithRelations[],
      tables: (tables.data ?? []) as ReceptionTable[],
      passcode: /^\d{4}$/.test(passcode) ? passcode : "0000",
      setupError: guests.error?.message || tables.error?.message || settings.error?.message || null,
    };
  } catch (error) {
    return {
      guests: [],
      tables: [],
      passcode: "0000",
      setupError: error instanceof Error ? error.message : "Unable to load red packet data.",
    };
  }
}

function mapSettings(rows: SettingsRow[]): Partial<WeddingSettingsMap> {
  const settingsMap: Partial<WeddingSettingsMap> = {};
  for (const row of rows) {
    if (row.key === "wedding") settingsMap.wedding = row.value as WeddingSettings;
    if (row.key === "theme") settingsMap.theme = row.value as ThemeSettings;
    if (row.key === "guestSettings") settingsMap.guestSettings = row.value as GuestSettings;
    if (row.key === "tableSettings") settingsMap.tableSettings = row.value as TableSettings;
    if (row.key === "attendanceSettings") {
      settingsMap.attendanceSettings = row.value as AttendanceSettings;
    }
  }
  return settingsMap;
}

/** Settings log book — recent audit entries with staff profile. */
export async function loadAuditLogs(limit = 150): Promise<{
  logs: import("@/types/wedding").AuditLog[];
  setupError: string | null;
}> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    return {
      logs: [],
      setupError: error instanceof Error ? error.message : "Supabase is not configured.",
    };
  }

  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*, profiles(id, full_name, email, role)")
      .order("created_at", { ascending: false })
      .limit(limit);

    return {
      logs: (data ?? []) as import("@/types/wedding").AuditLog[],
      setupError: error?.message || null,
    };
  } catch (error) {
    return {
      logs: [],
      setupError: error instanceof Error ? error.message : "Unable to load audit logs.",
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
