-- Kiss Cam recordings: private Storage bucket (50MB/file) + metadata table

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kiss-cam-recordings',
  'kiss-cam-recordings',
  false,
  52428800, -- 50 MiB
  array['video/webm', 'video/mp4', 'video/quicktime']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.kiss_cam_recordings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.kiss_cam_sessions (id) on delete cascade,
  storage_path text not null unique,
  bytes bigint,
  mime_type text,
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists kiss_cam_recordings_session_idx
  on public.kiss_cam_recordings (session_id, created_at desc);

alter table public.kiss_cam_recordings enable row level security;

-- Staff can list/read recording metadata; uploads go through service role API
drop policy if exists "kiss_cam_recordings_select_auth" on public.kiss_cam_recordings;
create policy "kiss_cam_recordings_select_auth"
  on public.kiss_cam_recordings for select
  to authenticated
  using (true);

-- Storage: authenticated staff may download; no anon writes (signed upload / service role)
drop policy if exists "kiss_cam_recordings_storage_select_auth" on storage.objects;
create policy "kiss_cam_recordings_storage_select_auth"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'kiss-cam-recordings');
