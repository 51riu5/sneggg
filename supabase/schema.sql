-- ================================================================
-- Snegu app — Supabase schema
-- Run this in: Supabase dashboard -> SQL Editor -> New query
-- ================================================================

-- Ensure uuid helper
create extension if not exists "pgcrypto";

-- Daily log (one row per day) -----------------------------------
create table if not exists public.daily_log (
  id uuid primary key default gen_random_uuid(),
  day date not null unique,
  checklist jsonb not null default '[]'::jsonb,    -- list of completed checklist indices
  cups int not null default 0,                     -- 0..10
  meals jsonb not null default '[]'::jsonb,        -- list of completed meal indices
  mood text,                                       -- rough|tired|okay|better|cozy
  mood_note text,                                  -- her own note (optional)
  symptoms jsonb not null default '[]'::jsonb,     -- ['headache','sore_throat',...]
  notes text,                                      -- free-text journal
  meds_taken jsonb not null default '[]'::jsonb,   -- list of med names taken
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Period tracker ------------------------------------------------
create table if not exists public.period_log (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date,
  flow text,                                       -- light|medium|heavy
  symptoms jsonb not null default '[]'::jsonb,
  mood text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Love notes between Snegu and Ribtu ----------------------------
create table if not exists public.love_note (
  id uuid primary key default gen_random_uuid(),
  from_user text not null,                         -- 'snegu' | 'ribtu'
  to_user text not null,
  body text not null,
  seen boolean not null default false,
  created_at timestamptz not null default now()
);

-- AI insights cache (so we don't re-query for same window) ------
create table if not exists public.ai_insight (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                              -- 'period' | 'recovery' | 'weekly'
  window_start date,
  window_end date,
  prompt_hash text,
  response text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_daily_log_day on public.daily_log(day desc);
create index if not exists idx_period_log_start on public.period_log(start_date desc);
create index if not exists idx_love_note_created on public.love_note(created_at desc);
create index if not exists idx_ai_insight_kind on public.ai_insight(kind, created_at desc);

-- ================================================================
-- Row Level Security
-- The app uses a server-side service role with PIN-gated API
-- routes, so we keep RLS on but allow service role only.
-- We will NEVER expose service role to client.
-- The client uses anon key and only reads via edge functions,
-- but for simplicity we do all writes server-side via the API.
-- ================================================================
alter table public.daily_log   enable row level security;
alter table public.period_log  enable row level security;
alter table public.love_note   enable row level security;
alter table public.ai_insight  enable row level security;

-- Allow anon read/write (we protect via app-level PIN).
-- If you want harder security, replace these with stricter policies.
create policy "allow all read daily_log"  on public.daily_log  for select using (true);
create policy "allow all write daily_log" on public.daily_log  for all    using (true) with check (true);

create policy "allow all read period_log"  on public.period_log  for select using (true);
create policy "allow all write period_log" on public.period_log  for all    using (true) with check (true);

create policy "allow all read love_note"  on public.love_note  for select using (true);
create policy "allow all write love_note" on public.love_note  for all    using (true) with check (true);

create policy "allow all read ai_insight"  on public.ai_insight  for select using (true);
create policy "allow all write ai_insight" on public.ai_insight  for all    using (true) with check (true);

-- Enable Realtime on these tables (so Ribtu sees live updates)
alter publication supabase_realtime add table public.daily_log;
alter publication supabase_realtime add table public.period_log;
alter publication supabase_realtime add table public.love_note;

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_daily_log_updated_at on public.daily_log;
create trigger trg_daily_log_updated_at
before update on public.daily_log
for each row execute function set_updated_at();

drop trigger if exists trg_period_log_updated_at on public.period_log;
create trigger trg_period_log_updated_at
before update on public.period_log
for each row execute function set_updated_at();
