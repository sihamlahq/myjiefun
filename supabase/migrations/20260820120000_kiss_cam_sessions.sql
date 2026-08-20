-- Kiss Cam temporary pairing sessions (public QR / short-code)
create table if not exists public.kiss_cam_sessions (
  id uuid primary key,
  short_code text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists kiss_cam_sessions_expires_idx
  on public.kiss_cam_sessions (expires_at);

create index if not exists kiss_cam_sessions_short_code_idx
  on public.kiss_cam_sessions (short_code);

alter table public.kiss_cam_sessions enable row level security;

-- Public reception display + phone camera (anon) may create/read non-expired sessions
drop policy if exists "kiss_cam_sessions_select" on public.kiss_cam_sessions;
create policy "kiss_cam_sessions_select"
  on public.kiss_cam_sessions for select
  to anon, authenticated
  using (expires_at > now());

drop policy if exists "kiss_cam_sessions_insert" on public.kiss_cam_sessions;
create policy "kiss_cam_sessions_insert"
  on public.kiss_cam_sessions for insert
  to anon, authenticated
  with check (expires_at > now() and expires_at < now() + interval '2 hours');

drop policy if exists "kiss_cam_sessions_delete" on public.kiss_cam_sessions;
create policy "kiss_cam_sessions_delete"
  on public.kiss_cam_sessions for delete
  to anon, authenticated
  using (true);
