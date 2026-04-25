-- ================================================================
-- Migration 003 — photo memories + voice notes
-- Run after migration_002_features.sql.
-- Idempotent: safe to re-run.
-- ================================================================

-- Memories table -------------------------------------------------
create table if not exists public.memory (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,                      -- 'memories/<uuid>.jpg'
  caption text,
  taken_on date,                                   -- optional: when the photo was taken
  uploaded_by text not null,                       -- 'snegu' | 'ribtu'
  pinned boolean not null default false,           -- show more often
  created_at timestamptz not null default now()
);
create index if not exists idx_memory_created on public.memory(created_at desc);
create index if not exists idx_memory_pinned on public.memory(pinned, created_at desc);

-- Voice notes table ----------------------------------------------
create table if not exists public.voice_note (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,                      -- 'voices/<uuid>.webm'
  duration_seconds int,                            -- 0..60
  from_user text not null,                         -- 'snegu' | 'ribtu'
  to_user text not null,
  caption text,                                    -- optional short text
  seen boolean not null default false,
  played_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_voice_to_seen on public.voice_note(to_user, seen, created_at desc);

-- Permissive policies (app-level PIN auth) -----------------------
alter table public.memory     enable row level security;
alter table public.voice_note enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'allow memory' and tablename = 'memory') then
    create policy "allow memory" on public.memory for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'allow voice_note' and tablename = 'voice_note') then
    create policy "allow voice_note" on public.voice_note for all using (true) with check (true);
  end if;
end $$;

-- Realtime --------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.memory;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.voice_note;
exception when duplicate_object then null; end $$;

-- Storage bucket --------------------------------------------------
-- Public bucket: anyone with the public URL can view files.
-- Inserts/Deletes are gated by our app-level API (using anon key,
-- but our server uses the same anon key + cookie auth).
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Storage object policies: allow anon to read, insert, delete in 'media' bucket
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'media public read' and tablename = 'objects') then
    create policy "media public read" on storage.objects for select
      using (bucket_id = 'media');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'media insert' and tablename = 'objects') then
    create policy "media insert" on storage.objects for insert
      with check (bucket_id = 'media');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'media delete' and tablename = 'objects') then
    create policy "media delete" on storage.objects for delete
      using (bucket_id = 'media');
  end if;
end $$;
