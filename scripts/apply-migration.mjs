#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

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

const ref = process.env.SUPABASE_PROJECT_ID || "rnjsqobnzzgnjmdejeui";
const password =
  process.env.SUPABASE_DB_PASSWORD ||
  process.env.POSTGRES_PASSWORD ||
  process.env.DB_PASSWORD;
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl && !password) {
  console.error(
    "Missing DATABASE_URL or SUPABASE_DB_PASSWORD.\n" +
      "Add the database password from Supabase → Project Settings → Database to .env.local as SUPABASE_DB_PASSWORD=...",
  );
  process.exit(1);
}

const sqlPath = path.join(
  root,
  "supabase/migrations/20260811150000_wedding_guest_manager.sql",
);
const sql = fs.readFileSync(sqlPath, "utf8");

const client = new pg.Client(
  databaseUrl
    ? { connectionString: databaseUrl, ssl: { rejectUnauthorized: false } }
    : {
        host: `aws-0-ap-southeast-1.pooler.supabase.com`,
        port: 6543,
        user: `postgres.${ref}`,
        password,
        database: "postgres",
        ssl: { rejectUnauthorized: false },
      },
);

await client.connect();
console.log("Connected. Applying migration...");
await client.query(sql);
console.log("Migration applied successfully.");
await client.end();
