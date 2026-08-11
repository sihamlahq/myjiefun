-- Wedding Guest & Seating Manager (Myjiefun)
-- Independent from Sihamla / Agarwood / Venus projects.

create extension if not exists "pgcrypto";

-- Roles
create type public.app_role as enum ('admin', 'manager', 'checkin_staff', 'viewer');

create type public.rsvp_status as enum (
  'pending',
  'confirmed',
  'declined',
  'maybe'
);

create type public.attendance_status as enum (
  'not_arrived',
  'checked_in',
  'no_show',
  'walk_in'
);

create type public.table_type as enum (
  'normal',
  'vip',
  'family',
  'bride_groom',
  'reserved',
  'custom'
);

create type public.table_status as enum (
  'active',
  'disabled',
  'reserved'
);

create type public.seat_status as enum (
  'empty',
  'occupied',
  'reserved',
  'vip'
);

create type public.audit_action as enum (
  'guest_create',
  'guest_update',
  'guest_delete',
  'guest_import',
  'table_create',
  'table_update',
  'table_delete',
  'seat_assign',
  'seat_unassign',
  'seat_add',
  'check_in',
  'check_in_group',
  'check_in_partial',
  'check_in_undo',
  'settings_update',
  'walk_in_create'
);

-- Profiles (staff users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  role public.app_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Wedding + theme + feature settings (single-row keyed JSON)
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

-- Guest groups / families
create table public.guest_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text not null default '',
  expected_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index guest_groups_name_idx on public.guest_groups (name);

-- Custom guest field definitions
create table public.custom_field_defs (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  field_type text not null default 'text'
    check (field_type in ('text', 'number', 'boolean', 'select')),
  options jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Tables
create table public.reception_tables (
  id uuid primary key default gen_random_uuid(),
  table_number text not null,
  name text not null,
  table_type public.table_type not null default 'normal',
  capacity integer not null default 10 check (capacity > 0),
  location text not null default '',
  status public.table_status not null default 'active',
  notes text not null default '',
  sort_order integer not null default 0,
  pos_x numeric(10, 2) not null default 100,
  pos_y numeric(10, 2) not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (table_number)
);

create index reception_tables_sort_idx on public.reception_tables (sort_order, table_number);

-- Seats (optional per-table seat map; capacity can exceed seat rows via "add seat")
create table public.seats (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.reception_tables (id) on delete cascade,
  seat_number integer not null check (seat_number > 0),
  status public.seat_status not null default 'empty',
  label text not null default '',
  created_at timestamptz not null default now(),
  unique (table_id, seat_number)
);

create index seats_table_idx on public.seats (table_id);

-- Guests
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  guest_code text not null unique,
  name_en text not null default '',
  name_zh text not null default '',
  nickname text not null default '',
  phone text not null default '',
  email text not null default '',
  group_id uuid references public.guest_groups (id) on delete set null,
  rsvp_status public.rsvp_status not null default 'pending',
  expected_count integer not null default 1 check (expected_count >= 0),
  attendance_status public.attendance_status not null default 'not_arrived',
  table_id uuid references public.reception_tables (id) on delete set null,
  seat_id uuid references public.seats (id) on delete set null,
  is_vip boolean not null default false,
  is_walk_in boolean not null default false,
  dietary text not null default '',
  relationship text not null default '',
  category text not null default '',
  notes text not null default '',
  custom_fields jsonb not null default '{}'::jsonb,
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index guests_name_en_idx on public.guests using gin (to_tsvector('simple', coalesce(name_en, '')));
create index guests_name_zh_idx on public.guests (name_zh);
create index guests_phone_idx on public.guests (phone);
create index guests_guest_code_idx on public.guests (guest_code);
create index guests_group_idx on public.guests (group_id);
create index guests_table_idx on public.guests (table_id);
create index guests_rsvp_idx on public.guests (rsvp_status);
create index guests_attendance_idx on public.guests (attendance_status);
create index guests_vip_idx on public.guests (is_vip);
create index guests_search_trgm_idx on public.guests (lower(name_en), lower(name_zh), lower(nickname), phone, guest_code);

-- Check-in events (timeline + undo support)
create table public.check_in_events (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests (id) on delete cascade,
  event_type text not null check (event_type in ('check_in', 'undo', 'partial', 'group')),
  party_count integer not null default 1,
  staff_id uuid references public.profiles (id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index check_in_events_created_idx on public.check_in_events (created_at desc);
create index check_in_events_guest_idx on public.check_in_events (guest_id);

-- Audit log
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action public.audit_action not null,
  entity_type text not null,
  entity_id uuid,
  staff_id uuid references public.profiles (id) on delete set null,
  before_data jsonb,
  after_data jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_action_idx on public.audit_logs (action);

-- Helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger guests_updated_at before update on public.guests
for each row execute function public.set_updated_at();

create trigger groups_updated_at before update on public.guest_groups
for each row execute function public.set_updated_at();

create trigger tables_updated_at before update on public.reception_tables
for each row execute function public.set_updated_at();

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'viewer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Occupancy helper view
create or replace view public.table_occupancy as
select
  t.id as table_id,
  t.table_number,
  t.name,
  t.capacity,
  t.table_type,
  t.status,
  t.pos_x,
  t.pos_y,
  count(g.id) filter (where g.id is not null) as assigned_count,
  count(g.id) filter (where g.attendance_status = 'checked_in') as checked_in_count,
  greatest(t.capacity - count(g.id), 0) as available_seats
from public.reception_tables t
left join public.guests g on g.table_id = t.id
group by t.id;

-- Role helper
create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid() and is_active),
    'viewer'::public.app_role
  );
$$;

create or replace function public.has_min_role(min_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.current_role()
    when 'admin' then true
    when 'manager' then min_role in ('manager', 'checkin_staff', 'viewer')
    when 'checkin_staff' then min_role in ('checkin_staff', 'viewer')
    when 'viewer' then min_role = 'viewer'
    else false
  end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.guest_groups enable row level security;
alter table public.custom_field_defs enable row level security;
alter table public.reception_tables enable row level security;
alter table public.seats enable row level security;
alter table public.guests enable row level security;
alter table public.check_in_events enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles
create policy "Users can read profiles" on public.profiles
  for select to authenticated using (true);

create policy "Users can update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.current_role() = 'admin')
  with check (id = auth.uid() or public.current_role() = 'admin');

create policy "Admins manage profiles" on public.profiles
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- Settings
create policy "Authenticated read settings" on public.app_settings
  for select to authenticated using (true);

create policy "Admin/manager write settings" on public.app_settings
  for all to authenticated
  using (public.has_min_role('manager'))
  with check (public.has_min_role('manager'));

-- Groups
create policy "Read groups" on public.guest_groups
  for select to authenticated using (true);

create policy "Write groups manager+" on public.guest_groups
  for all to authenticated
  using (public.has_min_role('manager'))
  with check (public.has_min_role('manager'));

-- Custom fields
create policy "Read custom fields" on public.custom_field_defs
  for select to authenticated using (true);

create policy "Write custom fields admin/manager" on public.custom_field_defs
  for all to authenticated
  using (public.has_min_role('manager'))
  with check (public.has_min_role('manager'));

-- Tables
create policy "Read tables" on public.reception_tables
  for select to authenticated using (true);

create policy "Write tables manager+" on public.reception_tables
  for all to authenticated
  using (public.has_min_role('manager'))
  with check (public.has_min_role('manager'));

-- Seats
create policy "Read seats" on public.seats
  for select to authenticated using (true);

create policy "Write seats manager+" on public.seats
  for all to authenticated
  using (public.has_min_role('manager'))
  with check (public.has_min_role('manager'));

-- Guests
create policy "Read guests" on public.guests
  for select to authenticated using (true);

create policy "Insert guests checkin+" on public.guests
  for insert to authenticated
  with check (public.has_min_role('checkin_staff'));

create policy "Update guests checkin+" on public.guests
  for update to authenticated
  using (public.has_min_role('checkin_staff'))
  with check (public.has_min_role('checkin_staff'));

create policy "Delete guests manager+" on public.guests
  for delete to authenticated
  using (public.has_min_role('manager'));

-- Check-in events
create policy "Read checkin events" on public.check_in_events
  for select to authenticated using (true);

create policy "Insert checkin events" on public.check_in_events
  for insert to authenticated
  with check (public.has_min_role('checkin_staff'));

-- Audit
create policy "Read audit manager+" on public.audit_logs
  for select to authenticated
  using (public.has_min_role('manager'));

create policy "Insert audit authenticated" on public.audit_logs
  for insert to authenticated
  with check (true);

-- Default settings
insert into public.app_settings (key, value) values
  ('wedding', '{
    "coupleNames": "Alex & Jordan",
    "title": "Wedding Guest & Seating Manager",
    "date": "2026-12-31",
    "venue": "Grand Ballroom",
    "logoUrl": "",
    "backgroundImageUrl": ""
  }'::jsonb),
  ('theme', '{
    "primary": "#8B7355",
    "secondary": "#C9A66B",
    "accent": "#D4AF37",
    "background": "#F7F3EC",
    "foreground": "#2C2A26",
    "headingFont": "Cormorant Garamond",
    "bodyFont": "Source Sans 3",
    "radius": "0.75rem",
    "tableStyle": "rounded"
  }'::jsonb),
  ('guestSettings', '{
    "categories": ["Family", "Friends", "Colleagues", "VIP", "Other"],
    "rsvpStatuses": ["pending", "confirmed", "declined", "maybe"],
    "dietaryCategories": ["None", "Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-free", "Allergy"]
  }'::jsonb),
  ('tableSettings', '{
    "defaultCapacity": 10,
    "namingFormat": "Table {n}",
    "seatNumbering": "numeric",
    "tableTypes": ["normal", "vip", "family", "bride_groom", "reserved", "custom"]
  }'::jsonb),
  ('attendanceSettings', '{
    "allowWalkIns": true,
    "allowPartialGroupCheckIn": true,
    "allowOvercapacity": false,
    "requireCheckInStaff": true,
    "allowUndo": true
  }'::jsonb)
on conflict (key) do nothing;

-- Realtime
alter publication supabase_realtime add table public.guests;
alter publication supabase_realtime add table public.reception_tables;
alter publication supabase_realtime add table public.seats;
alter publication supabase_realtime add table public.guest_groups;
alter publication supabase_realtime add table public.check_in_events;
alter publication supabase_realtime add table public.app_settings;
