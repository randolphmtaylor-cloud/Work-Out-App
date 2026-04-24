-- ============================================================
-- Gym Sessions — Initial Database Schema
-- Run this in your Supabase SQL editor or via supabase db push
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------
-- Equipment
-- ---------------------------------------------------------------
CREATE TABLE equipment (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  canonical_name TEXT NOT NULL UNIQUE,
  aliases      TEXT[] DEFAULT '{}',
  category     TEXT NOT NULL CHECK (category IN ('machine','free_weight','bodyweight','cable','cardio','other')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX equipment_canonical_name_idx ON equipment (canonical_name);

-- ---------------------------------------------------------------
-- Exercises
-- ---------------------------------------------------------------
CREATE TABLE exercises (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  canonical_name TEXT NOT NULL UNIQUE,
  aliases        TEXT[] DEFAULT '{}',
  equipment_id   UUID REFERENCES equipment(id) ON DELETE SET NULL,
  muscle_groups  TEXT[] DEFAULT '{}',
  tags           TEXT[] DEFAULT '{}',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX exercises_canonical_name_idx ON exercises (canonical_name);
CREATE INDEX exercises_equipment_id_idx ON exercises (equipment_id);

-- ---------------------------------------------------------------
-- Training Phases
-- ---------------------------------------------------------------
CREATE TABLE training_phases (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL,  -- references auth.users(id)
  name           TEXT NOT NULL,
  phase_type     TEXT NOT NULL CHECK (phase_type IN ('accumulation','intensification','density')),
  phase_number   INTEGER NOT NULL DEFAULT 1,
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  rep_range_low  INTEGER NOT NULL DEFAULT 8,
  rep_range_high INTEGER NOT NULL DEFAULT 12,
  description    TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX training_phases_user_id_idx ON training_phases (user_id);
CREATE INDEX training_phases_active_idx ON training_phases (user_id, is_active);

-- ---------------------------------------------------------------
-- Workout Sessions
-- ---------------------------------------------------------------
CREATE TABLE workout_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL,
  date             DATE NOT NULL,
  notes            TEXT,
  source           TEXT NOT NULL CHECK (source IN ('import_text','import_docx','import_xlsx','manual','generated')),
  raw_text         TEXT,
  duration_minutes INTEGER,
  phase_id         UUID REFERENCES training_phases(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX workout_sessions_user_date_idx ON workout_sessions (user_id, date DESC);
CREATE INDEX workout_sessions_phase_idx ON workout_sessions (phase_id);

-- ---------------------------------------------------------------
-- Workout Sets
-- ---------------------------------------------------------------
CREATE TABLE workout_sets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id     UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  set_number      INTEGER NOT NULL DEFAULT 1,
  reps            INTEGER,
  weight_lbs      NUMERIC(7,2),
  bodyweight_lbs  NUMERIC(6,2),
  notes           TEXT,
  is_warmup       BOOLEAN NOT NULL DEFAULT FALSE,
  rpe             NUMERIC(3,1) CHECK (rpe >= 1 AND rpe <= 10),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX workout_sets_session_idx ON workout_sets (session_id);
CREATE INDEX workout_sets_exercise_idx ON workout_sets (exercise_id);
-- Used for progress queries per exercise over time
CREATE INDEX workout_sets_exercise_session_idx ON workout_sets (exercise_id, session_id);

-- ---------------------------------------------------------------
-- Generated Routines
-- ---------------------------------------------------------------
CREATE TABLE generated_routines (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL,
  phase_id              UUID REFERENCES training_phases(id) ON DELETE SET NULL,
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date                  DATE NOT NULL,
  workout_type          TEXT NOT NULL, -- push/pull/legs/upper/lower/full_body/core
  warmup                JSONB NOT NULL DEFAULT '{}',
  exercises             JSONB NOT NULL DEFAULT '[]',
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 30,
  was_completed         BOOLEAN NOT NULL DEFAULT FALSE,
  completed_session_id  UUID REFERENCES workout_sessions(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX generated_routines_user_date_idx ON generated_routines (user_id, date DESC);

-- ---------------------------------------------------------------
-- Weekly Summaries
-- ---------------------------------------------------------------
CREATE TABLE weekly_summaries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL,
  week_start    DATE NOT NULL,
  week_end      DATE NOT NULL,
  summary_text  TEXT NOT NULL,
  stats         JSONB NOT NULL DEFAULT '{}',
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX weekly_summaries_user_week_idx ON weekly_summaries (user_id, week_start DESC);

-- ---------------------------------------------------------------
-- Import Logs
-- ---------------------------------------------------------------
CREATE TABLE import_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL,
  filename         TEXT,
  file_type        TEXT NOT NULL CHECK (file_type IN ('text','docx','xlsx','csv')),
  raw_content      TEXT,
  parsed_sessions  INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL CHECK (status IN ('pending','processing','success','error')),
  errors           JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Row Level Security (RLS)
-- ---------------------------------------------------------------
ALTER TABLE training_phases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs        ENABLE ROW LEVEL SECURITY;

-- Equipment and exercises are shared/global (read by all, write by admin)
ALTER TABLE equipment  ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipment readable by all" ON equipment FOR SELECT USING (true);
CREATE POLICY "Exercises readable by all" ON exercises FOR SELECT USING (true);

-- User-scoped policies
CREATE POLICY "Users manage own phases"    ON training_phases    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own sessions"  ON workout_sessions   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own routines"  ON generated_routines FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own summaries" ON weekly_summaries   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own imports"   ON import_logs        FOR ALL USING (auth.uid() = user_id);

-- Sets inherit from session ownership
CREATE POLICY "Users manage own sets" ON workout_sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workout_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );
