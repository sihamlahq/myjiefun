import type { SupabaseClient } from "@supabase/supabase-js";
import seatingPlan from "@/data/wedding-dinner-seating-v3.json";
import { partyOf } from "@/lib/stats";
import { repairMojibakeText } from "@/lib/text-encoding";

export type WeddingSeatingParty = {
  name: string;
  name_zh?: string;
  expected_count: number;
  is_vip?: boolean;
};

export type WeddingSeatingTable = {
  table_number: string;
  name: string;
  table_type: string;
  capacity: number;
  sort_order: number;
  parties: WeddingSeatingParty[];
  open_seats?: number;
};

export type WeddingSeatingPlan = {
  version: string;
  notes?: string;
  tables: WeddingSeatingTable[];
};

export function getWeddingDinnerSeatingV3(): WeddingSeatingPlan {
  return seatingPlan as WeddingSeatingPlan;
}

function guestCode() {
  return `G-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

async function ensureTable(
  supabase: SupabaseClient,
  table: WeddingSeatingTable,
): Promise<string> {
  const { data: existing } = await supabase
    .from("reception_tables")
    .select("id, capacity")
    .eq("table_number", table.table_number)
    .maybeSingle();

  if (existing?.id) {
    if ((existing.capacity ?? 0) < table.capacity) {
      await supabase
        .from("reception_tables")
        .update({
          capacity: table.capacity,
          name: table.name,
          table_type: table.table_type,
          sort_order: table.sort_order,
          status: "active",
          notes: "Wedding dinner table V3",
        })
        .eq("id", existing.id);

      const { data: seats } = await supabase
        .from("seats")
        .select("seat_number")
        .eq("table_id", existing.id);
      const have = new Set((seats ?? []).map((s) => s.seat_number));
      const missing = Array.from({ length: table.capacity }, (_, i) => i + 1).filter(
        (n) => !have.has(n),
      );
      if (missing.length) {
        await supabase.from("seats").insert(
          missing.map((seat_number) => ({ table_id: existing.id, seat_number })),
        );
      }
    } else {
      await supabase
        .from("reception_tables")
        .update({
          name: table.name,
          table_type: table.table_type,
          sort_order: table.sort_order,
          status: "active",
          notes: "Wedding dinner table V3",
        })
        .eq("id", existing.id);
    }
    return existing.id as string;
  }

  const { data, error } = await supabase
    .from("reception_tables")
    .insert({
      table_number: table.table_number,
      name: table.name,
      table_type: table.table_type,
      capacity: table.capacity,
      location: "",
      status: "active",
      notes: "Wedding dinner table V3",
      sort_order: table.sort_order,
      pos_x: 100 + (table.sort_order % 6) * 140,
      pos_y: 100 + Math.floor(table.sort_order / 6) * 140,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message || "Unable to create table");

  await supabase.from("seats").insert(
    Array.from({ length: table.capacity }, (_, i) => ({
      table_id: data.id,
      seat_number: i + 1,
    })),
  );
  return data.id as string;
}

async function upsertPartyGuest(
  supabase: SupabaseClient,
  party: WeddingSeatingParty,
  tableId: string,
): Promise<"created" | "updated"> {
  const name = repairMojibakeText(party.name.trim());
  const nameZh = repairMojibakeText((party.name_zh || "").trim());
  const expected = Math.max(1, Number(party.expected_count) || 1);

  const { data: existingRows } = await supabase
    .from("guests")
    .select("id")
    .ilike("name_en", name)
    .limit(1);
  const existingId = existingRows?.[0]?.id ?? null;

  const payload = {
    name_en: name,
    name_zh: nameZh || (existingId ? undefined : ""),
    expected_count: expected,
    rsvp_status: "confirmed" as const,
    table_id: tableId,
    is_vip: Boolean(party.is_vip),
    category: "wedding-dinner-v3",
    relationship: "",
    notes: "Imported from Wedding dinner table V3",
  };

  if (existingId) {
    const { error } = await supabase
      .from("guests")
      .update({
        ...payload,
        name_zh: nameZh || undefined,
      })
      .eq("id", existingId);
    if (error) throw new Error(error.message);
    return "updated";
  }

  const { error } = await supabase.from("guests").insert({
    ...payload,
    name_zh: nameZh,
    guest_code: guestCode(),
    nickname: "",
    phone: "",
    email: "",
    attendance_status: "not_arrived",
    is_walk_in: false,
    dietary: "",
    custom_fields: {},
    seat_id: null,
  });
  if (error) throw new Error(error.message);
  return "created";
}

export async function applyWeddingDinnerSeatingV3Plan(
  supabase: SupabaseClient,
  opts?: { plan?: WeddingSeatingPlan },
) {
  const plan = opts?.plan ?? getWeddingDinnerSeatingV3();
  let tablesUpserted = 0;
  let guestsCreated = 0;
  let guestsUpdated = 0;
  const errors: string[] = [];

  for (const table of plan.tables) {
    try {
      const tableId = await ensureTable(supabase, table);
      tablesUpserted += 1;
      for (const party of table.parties) {
        try {
          const result = await upsertPartyGuest(supabase, party, tableId);
          if (result === "created") guestsCreated += 1;
          else guestsUpdated += 1;
        } catch (error) {
          errors.push(
            `${table.table_number}/${party.name}: ${
              error instanceof Error ? error.message : "failed"
            }`,
          );
        }
      }
    } catch (error) {
      errors.push(
        `Table ${table.table_number}: ${error instanceof Error ? error.message : "failed"}`,
      );
    }
  }

  const totalPax = plan.tables.reduce(
    (sum, table) =>
      sum + table.parties.reduce((s, party) => s + partyOf(party), 0),
    0,
  );

  return {
    version: plan.version,
    tablesUpserted,
    guestsCreated,
    guestsUpdated,
    totalPax,
    errors,
  };
}
