#!/usr/bin/env node
/**
 * Apply Wedding dinner table V3 seating via service role.
 * Usage: SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... node --import tsx scripts/apply-wedding-seating-v3.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnv() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i);
    const v = line.slice(i + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const plan = JSON.parse(
  fs.readFileSync(path.join(root, "src/data/wedding-dinner-seating-v3.json"), "utf8"),
);

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function guestCode() {
  return `G-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function ensureTable(table) {
  const { data: existing } = await supabase
    .from("reception_tables")
    .select("id, capacity")
    .eq("table_number", table.table_number)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("reception_tables")
      .update({
        capacity: Math.max(existing.capacity ?? 0, table.capacity),
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
    const capacity = Math.max(existing.capacity ?? 0, table.capacity);
    const missing = Array.from({ length: capacity }, (_, i) => i + 1).filter((n) => !have.has(n));
    if (missing.length) {
      await supabase.from("seats").insert(missing.map((seat_number) => ({ table_id: existing.id, seat_number })));
    }
    return existing.id;
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
  if (error) throw new Error(error.message);
  await supabase.from("seats").insert(
    Array.from({ length: table.capacity }, (_, i) => ({ table_id: data.id, seat_number: i + 1 })),
  );
  return data.id;
}

let created = 0;
let updated = 0;
for (const table of plan.tables) {
  const tableId = await ensureTable(table);
  console.log(`Table ${table.table_number} → ${tableId}`);
  for (const party of table.parties) {
    const { data: existingRows } = await supabase
      .from("guests")
      .select("id")
      .ilike("name_en", party.name)
      .limit(1);
    const existingId = existingRows?.[0]?.id ?? null;
    const payload = {
      name_en: party.name,
      name_zh: party.name_zh || "",
      expected_count: party.expected_count,
      rsvp_status: "confirmed",
      table_id: tableId,
      is_vip: Boolean(party.is_vip),
      category: "wedding-dinner-v3",
      notes: "Imported from Wedding dinner table V3",
    };
    if (existingId) {
      const { error } = await supabase.from("guests").update(payload).eq("id", existingId);
      if (error) throw new Error(error.message);
      updated += 1;
    } else {
      const { error } = await supabase.from("guests").insert({
        ...payload,
        guest_code: guestCode(),
        nickname: "",
        phone: "",
        email: "",
        attendance_status: "not_arrived",
        is_walk_in: false,
        dietary: "",
        relationship: "",
        custom_fields: {},
        seat_id: null,
      });
      if (error) throw new Error(error.message);
      created += 1;
    }
  }
}

const keep = new Set(plan.tables.map((t) => t.table_number));
const { data: allTables, error: listError } = await supabase
  .from("reception_tables")
  .select("id, table_number");
if (listError) throw new Error(listError.message);
const removed = [];
for (const row of allTables ?? []) {
  if (keep.has(row.table_number)) continue;
  await supabase.from("guests").update({ table_id: null, seat_id: null }).eq("table_id", row.id);
  const { error } = await supabase.from("reception_tables").delete().eq("id", row.id);
  if (error) throw new Error(error.message);
  removed.push(row.table_number);
}
removed.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

console.log(
  `Done. created=${created} updated=${updated} tables=${plan.tables.length} removed=${removed.length}${
    removed.length ? ` (${removed.join(", ")})` : ""
  }`,
);
