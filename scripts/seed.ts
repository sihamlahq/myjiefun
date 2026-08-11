import { createClient } from "@supabase/supabase-js";

type ReceptionTableInsert = {
  table_number: string;
  name: string;
  table_type: "normal" | "vip" | "family" | "bride_groom" | "reserved" | "custom";
  capacity: number;
  location: string;
  status: "active" | "disabled" | "reserved";
  notes: string;
  sort_order: number;
  pos_x: number;
  pos_y: number;
};

type GroupInsert = {
  name: string;
  notes: string;
  expected_count: number;
};

type GuestInsert = {
  guest_code: string;
  name_en: string;
  name_zh: string;
  nickname: string;
  phone: string;
  email: string;
  group_id: string | null;
  rsvp_status: "pending" | "confirmed" | "declined" | "maybe";
  expected_count: number;
  attendance_status: "not_arrived" | "checked_in" | "no_show" | "walk_in";
  table_id: string | null;
  is_vip: boolean;
  is_walk_in: boolean;
  dietary: string;
  relationship: string;
  category: string;
  notes: string;
  custom_fields: Record<string, unknown>;
  checked_in_at: string | null;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const groupNames = [
  "Bride Family",
  "Groom Family",
  "College Friends",
  "Childhood Friends",
  "Work Colleagues",
  "VIP Relatives",
  "Neighbors",
  "Overseas Guests",
  "Tea Ceremony",
  "Afterparty Crew",
  "Parents Friends",
  "Vendor Guests",
];

const firstNames = [
  "Amelia",
  "Benjamin",
  "Charlotte",
  "Daniel",
  "Elaine",
  "Felix",
  "Grace",
  "Henry",
  "Isabelle",
  "Joshua",
  "Kelly",
  "Lucas",
  "Maya",
  "Nathan",
  "Olivia",
  "Patrick",
  "Queenie",
  "Ryan",
  "Sophia",
  "Theo",
];

const lastNames = [
  "Tan",
  "Lee",
  "Lim",
  "Chan",
  "Wong",
  "Ng",
  "Koh",
  "Teo",
  "Ong",
  "Chua",
];

const chineseNames = ["明", "丽", "伟", "婷", "杰", "敏", "强", "芳", "豪", "欣"];
const dietary = ["", "", "", "Vegetarian", "Halal", "Gluten-free", "Shellfish allergy"];
const relationships = ["Family", "Friend", "Colleague", "Relative", "Schoolmate", "Vendor"];
const categories = ["Family", "Friends", "Colleagues", "VIP", "Other"];

async function main() {
  console.log("Clearing wedding data...");
  await must(supabase.from("check_in_events").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
  await must(supabase.from("guests").delete().neq("guest_code", "__never__"));
  await must(supabase.from("seats").delete().neq("id", "00000000-0000-0000-0000-000000000000"));
  await must(supabase.from("reception_tables").delete().neq("table_number", "__never__"));
  await must(supabase.from("guest_groups").delete().neq("name", "__never__"));

  console.log("Creating settings...");
  await must(
    supabase.from("app_settings").upsert([
      {
        key: "wedding",
        value: {
          coupleNames: "Mei Lin & Jun Wei",
          title: "Myjiefun Wedding Guest & Seating Manager",
          date: "2026-12-31",
          venue: "Myjiefun Grand Ballroom",
          logoUrl: "",
          backgroundImageUrl: "",
        },
      },
      {
        key: "theme",
        value: {
          primary: "#8B7355",
          secondary: "#C9A66B",
          accent: "#D4AF37",
          background: "#F7F3EC",
          foreground: "#2C2A26",
          headingFont: "Cormorant Garamond",
          bodyFont: "Source Sans 3",
          radius: "0.75rem",
          tableStyle: "rounded",
        },
      },
    ]),
  );

  console.log("Creating groups...");
  const groups = groupNames.map<GroupInsert>((name, index) => ({
    name,
    notes: `Seed group ${index + 1}`,
    expected_count: 28 + (index % 5) * 4,
  }));
  const { data: insertedGroups } = await must(supabase.from("guest_groups").insert(groups).select("id, name"));

  console.log("Creating tables and seats...");
  const tables = Array.from({ length: 40 }, (_, index): ReceptionTableInsert => {
    const tableNumber = `T${String(index + 1).padStart(2, "0")}`;
    return {
      table_number: tableNumber,
      name: index < 2 ? `VIP ${index + 1}` : `Table ${index + 1}`,
      table_type: index < 2 ? "vip" : index === 2 ? "bride_groom" : index < 8 ? "family" : "normal",
      capacity: 10,
      location: `Zone ${String.fromCharCode(65 + Math.floor(index / 10))}`,
      status: index === 39 ? "reserved" : "active",
      notes: "",
      sort_order: index + 1,
      pos_x: 80 + (index % 8) * 145,
      pos_y: 110 + Math.floor(index / 8) * 125,
    };
  });
  const { data: insertedTables } = await must(
    supabase.from("reception_tables").insert(tables).select("id, table_number"),
  );

  const seats = (insertedTables ?? []).flatMap((table) =>
    Array.from({ length: 10 }, (_, index) => ({
      table_id: table.id,
      seat_number: index + 1,
      label: `${table.table_number}-${index + 1}`,
    })),
  );
  await must(supabase.from("seats").insert(seats));

  console.log("Creating guests...");
  const groupIds = insertedGroups ?? [];
  const tableIds = insertedTables ?? [];
  const guests = Array.from({ length: 400 }, (_, index): GuestInsert => {
    const first = firstNames[index % firstNames.length];
    const last = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
    const isWalkIn = index >= 380;
    const isVip = index < 28 || index % 37 === 0;
    const assignedTable = index < 340 ? tableIds[index % tableIds.length]?.id ?? null : null;
    const rsvp = index % 17 === 0 ? "declined" : index % 11 === 0 ? "maybe" : index % 7 === 0 ? "pending" : "confirmed";
    const checkedIn = index % 3 === 0 || isWalkIn;
    const noShow = rsvp === "confirmed" && index % 29 === 0;
    const checkedInAt = checkedIn
      ? new Date(Date.now() - (index % 180) * 60_000).toISOString()
      : null;

    return {
      guest_code: `MYJ-${String(index + 1).padStart(4, "0")}`,
      name_en: `${first} ${last}`,
      name_zh: `${last}${chineseNames[index % chineseNames.length]}`,
      nickname: index % 5 === 0 ? first : "",
      phone: `+6012${String(1000000 + index).slice(0, 7)}`,
      email: `guest${index + 1}@example.com`,
      group_id: groupIds[index % groupIds.length]?.id ?? null,
      rsvp_status: rsvp,
      expected_count: 1 + (index % 4 === 0 ? 1 : 0),
      attendance_status: isWalkIn ? "walk_in" : checkedIn ? "checked_in" : noShow ? "no_show" : "not_arrived",
      table_id: assignedTable,
      is_vip: isVip,
      is_walk_in: isWalkIn,
      dietary: dietary[index % dietary.length],
      relationship: relationships[index % relationships.length],
      category: isVip ? "VIP" : categories[index % categories.length],
      notes: index % 19 === 0 ? "Requires host greeting" : "",
      custom_fields: { invitationBatch: Math.floor(index / 50) + 1 },
      checked_in_at: checkedInAt,
    };
  });

  const { data: insertedGuests } = await must(supabase.from("guests").insert(guests).select("id, checked_in_at, expected_count, is_walk_in"));
  const events = (insertedGuests ?? [])
    .filter((guest) => guest.checked_in_at)
    .map((guest) => ({
      guest_id: guest.id,
      event_type: guest.is_walk_in ? "check_in" : "check_in",
      party_count: guest.expected_count,
      created_at: guest.checked_in_at,
    }));

  if (events.length) await must(supabase.from("check_in_events").insert(events));

  console.log(`Seeded ${tables.length} tables, ${seats.length} seats, ${groups.length} groups, and ${guests.length} guests.`);
}

async function must<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const result = await promise;
  if (result.error) throw new Error(result.error.message);
  return result;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
