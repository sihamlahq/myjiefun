-- Myjiefun — site settings (hours, location, WhatsApp)
-- Separate from Sihamla / Agarwood / Venus settings tables.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "Public can read settings" on public.app_settings;
create policy "Public can read settings"
  on public.app_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "No public write settings" on public.app_settings;
create policy "No public write settings"
  on public.app_settings
  for all
  using (false)
  with check (false);

insert into public.app_settings (key, value)
values
  ('hours', '"Tue–Sun · 12:00 – 22:00"'::jsonb),
  ('location', '"Coming soon — stay tuned"'::jsonb),
  ('whatsapp_number', '""'::jsonb)
on conflict (key) do nothing;
