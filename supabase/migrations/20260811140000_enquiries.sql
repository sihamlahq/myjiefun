-- Myjiefun — contact / reservation enquiries
-- Run in the Myjiefun Supabase project's SQL Editor.
-- Do NOT run this against Sihamla, The Agarwood, or Venus Makeup Artist projects.

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  party_size integer,
  preferred_at timestamptz,
  message text not null default '',
  source text not null default 'website',
  status text not null default 'new'
    check (status in ('new', 'contacted', 'booked', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists enquiries_created_at_idx
  on public.enquiries (created_at desc);

create index if not exists enquiries_status_idx
  on public.enquiries (status);

alter table public.enquiries enable row level security;

-- Public may insert enquiries from the website form.
drop policy if exists "Public can create enquiries" on public.enquiries;
create policy "Public can create enquiries"
  on public.enquiries
  for insert
  to anon, authenticated
  with check (true);

-- No direct public reads/updates/deletes (admin uses service role).
drop policy if exists "No public read enquiries" on public.enquiries;
create policy "No public read enquiries"
  on public.enquiries
  for select
  using (false);

drop policy if exists "No public update enquiries" on public.enquiries;
create policy "No public update enquiries"
  on public.enquiries
  for update
  using (false);

drop policy if exists "No public delete enquiries" on public.enquiries;
create policy "No public delete enquiries"
  on public.enquiries
  for delete
  using (false);
