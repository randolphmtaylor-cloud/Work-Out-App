-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 011 — activity_exports
--
-- Shared bridge table between Gym Sessions (producer) and the Progress App
-- (consumer). Each completed workout is written here by Gym Sessions; the
-- Progress App adapter reads from it to create daily progress log entries.
--
-- Safe to re-run (uses IF NOT EXISTS / CREATE INDEX IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.activity_exports (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,

  -- Producer identity
  source           text        not null,          -- 'gym-sessions'
  source_record_id text        not null,          -- workout_sessions.id

  -- When the activity occurred
  date             date        not null,

  -- Human-readable summary (displayed in Progress App daily notes)
  title            text        not null,
  content          text        not null,          -- markdown body

  -- Numeric / boolean metrics consumed by the reporting engine
  metrics          jsonb       not null default '{}',

  -- Set by the Progress App after it successfully imports this record
  imported_at      timestamptz,

  created_at       timestamptz not null default now(),

  unique (user_id, source, source_record_id)
);

create index if not exists activity_exports_user_date_idx
  on public.activity_exports (user_id, date desc);

create index if not exists activity_exports_pending_idx
  on public.activity_exports (user_id, source, imported_at)
  where imported_at is null;

alter table public.activity_exports enable row level security;

drop policy if exists "users_own_activity_exports" on public.activity_exports;
create policy "users_own_activity_exports"
  on public.activity_exports for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
