-- ================================================================
-- Migration 002 — adds shared tasks, study sessions, push subs,
-- and notifications log.
-- Run this in Supabase SQL editor (it's safe to re-run, idempotent).
-- ================================================================

-- Shared tasks (anything either of you adds dynamically) -----------
create table if not exists public.shared_task (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  detail text,
  due_at timestamptz,                              -- optional reminder time
  created_by text not null,                        -- 'snegu' | 'ribtu'
  assigned_to text,                                -- 'snegu' | 'ribtu' | null (both)
  done boolean not null default false,
  done_by text,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Study sessions (a 'room' both can join, with shared timer) -------
-- We keep one persistent row that both modify; that's the live state.
create table if not exists public.study_session (
  id text primary key default 'main',              -- single row 'main' for now
  mode text not null default 'pomodoro',           -- 'pomodoro' | 'free'
  duration_seconds int not null default 1500,      -- 25 min default
  started_at timestamptz,                          -- null when paused/stopped
  paused_remaining_seconds int,                    -- non-null when paused
  is_running boolean not null default false,
  round int not null default 1,
  who_last text,                                   -- 'snegu'|'ribtu' last to control
  meet_link text,
  updated_at timestamptz not null default now()
);
insert into public.study_session (id) values ('main')
  on conflict (id) do nothing;

-- Presence in study room -------------------------------------------
create table if not exists public.study_presence (
  who text primary key,                            -- 'snegu' | 'ribtu'
  in_room boolean not null default false,
  cam_on boolean not null default false,
  last_seen timestamptz not null default now()
);
insert into public.study_presence (who) values ('snegu') on conflict (who) do nothing;
insert into public.study_presence (who) values ('ribtu') on conflict (who) do nothing;

-- Push subscriptions ------------------------------------------------
create table if not exists public.push_subscription (
  id uuid primary key default gen_random_uuid(),
  who text not null,                               -- 'snegu' | 'ribtu'
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text,                               -- e.g. 'snegu's phone'
  created_at timestamptz not null default now()
);
create index if not exists idx_push_sub_who on public.push_subscription(who);

-- Notification log (so we don't spam reminders multiple times) -----
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  who text not null,
  kind text not null,                              -- 'meds_morning', 'meds_evening', 'water', 'task', 'love'
  ref_id text,                                     -- e.g. task id
  title text not null,
  body text,
  sent_at timestamptz not null default now()
);
create index if not exists idx_notif_log_who on public.notification_log(who, sent_at desc);

-- Indexes & policies ------------------------------------------------
create index if not exists idx_shared_task_due  on public.shared_task(due_at);
create index if not exists idx_shared_task_done on public.shared_task(done, created_at desc);

alter table public.shared_task        enable row level security;
alter table public.study_session      enable row level security;
alter table public.study_presence     enable row level security;
alter table public.push_subscription  enable row level security;
alter table public.notification_log   enable row level security;

-- Permissive policies (app-level PIN auth handles security)
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'allow shared_task' and tablename = 'shared_task') then
    create policy "allow shared_task" on public.shared_task for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'allow study_session' and tablename = 'study_session') then
    create policy "allow study_session" on public.study_session for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'allow study_presence' and tablename = 'study_presence') then
    create policy "allow study_presence" on public.study_presence for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'allow push_subscription' and tablename = 'push_subscription') then
    create policy "allow push_subscription" on public.push_subscription for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'allow notification_log' and tablename = 'notification_log') then
    create policy "allow notification_log" on public.notification_log for all using (true) with check (true);
  end if;
end $$;

-- Realtime
do $$ begin
  alter publication supabase_realtime add table public.shared_task;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.study_session;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.study_presence;
exception when duplicate_object then null; end $$;

-- updated_at triggers
drop trigger if exists trg_shared_task_updated_at on public.shared_task;
create trigger trg_shared_task_updated_at
before update on public.shared_task
for each row execute function set_updated_at();

drop trigger if exists trg_study_session_updated_at on public.study_session;
create trigger trg_study_session_updated_at
before update on public.study_session
for each row execute function set_updated_at();
