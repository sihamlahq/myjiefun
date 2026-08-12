export type AppRole = "admin" | "manager" | "checkin_staff" | "viewer";
export type RsvpStatus = "pending" | "confirmed" | "declined" | "maybe";
export type AttendanceStatus =
  | "not_arrived"
  | "checked_in"
  | "no_show"
  | "walk_in"; // legacy DB value; not used in UI
export type TableType =
  | "normal"
  | "vip"
  | "family"
  | "bride_groom"
  | "groom_side"
  | "bride_side"
  | "reserved"
  | "custom";
export type TableStatus = "active" | "disabled" | "reserved";
export type SeatStatus = "empty" | "occupied" | "reserved" | "vip";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  role: AppRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type GuestGroup = {
  id: string;
  name: string;
  notes: string;
  expected_count: number | null;
  created_at: string;
  updated_at: string;
};

export type ReceptionTable = {
  id: string;
  table_number: string;
  name: string;
  table_type: TableType;
  capacity: number;
  location: string;
  status: TableStatus;
  notes: string;
  sort_order: number;
  pos_x: number;
  pos_y: number;
  created_at: string;
  updated_at: string;
};

export type Seat = {
  id: string;
  table_id: string;
  seat_number: number;
  status: SeatStatus;
  label: string;
  created_at: string;
};

export type Guest = {
  id: string;
  guest_code: string;
  name_en: string;
  name_zh: string;
  nickname: string;
  phone: string;
  email: string;
  group_id: string | null;
  rsvp_status: RsvpStatus;
  expected_count: number;
  attendance_status: AttendanceStatus;
  table_id: string | null;
  seat_id: string | null;
  is_vip: boolean;
  is_walk_in: boolean;
  dietary: string;
  relationship: string;
  category: string;
  notes: string;
  custom_fields: Record<string, unknown>;
  red_packet_amount?: number | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
  updated_at: string;
};

export type GuestWithRelations = Guest & {
  guest_groups?: GuestGroup | null;
  reception_tables?: ReceptionTable | null;
  seats?: Seat | null;
};

export type CheckInEvent = {
  id: string;
  guest_id: string;
  event_type: "check_in" | "undo" | "partial" | "group";
  party_count: number;
  staff_id: string | null;
  notes: string;
  created_at: string;
};

export type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  staff_id: string | null;
  before_data: unknown;
  after_data: unknown;
  meta: Record<string, unknown>;
  created_at: string;
  profiles?: Pick<Profile, "id" | "full_name" | "email" | "role"> | null;
};

export type WeddingSettings = {
  coupleNames: string;
  title: string;
  date: string;
  venue: string;
  logoUrl: string;
  backgroundImageUrl: string;
};

export type ThemeSettings = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  headingFont: string;
  bodyFont: string;
  radius: string;
  tableStyle: string;
};

export type AttendanceSettings = {
  allowPartialGroupCheckIn: boolean;
  allowOvercapacity: boolean;
  requireCheckInStaff: boolean;
  allowUndo: boolean;
};

export type TableSettings = {
  defaultCapacity: number;
  namingFormat: string;
  seatNumbering: string;
  tableTypes: string[];
};

export type GuestSettings = {
  categories: string[];
  relationships: string[];
  rsvpStatuses: string[];
  dietaryCategories: string[];
};

export type DashboardStats = {
  totalInvited: number;
  confirmed: number;
  pendingRsvp: number;
  checkedIn: number;
  notArrived: number;
  totalTables: number;
  occupiedSeats: number;
  availableSeats: number;
  unassignedGuests: number;
  /** Confirmed guests with no table (and therefore no seat) assigned. */
  unassignedConfirmed: number;
  vipGuests: number;
};
