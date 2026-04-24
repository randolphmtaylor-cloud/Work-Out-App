-- ============================================================
-- Gym Sessions — Supabase SQL Schema
-- Paste this entire file into the Supabase SQL Editor and run.
-- ============================================================

-- ---------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- fuzzy-search on exercise names (optional but useful)


-- ---------------------------------------------------------------
-- 1. Enum types
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE equipment_category AS ENUM (
    'machine', 'free_weight', 'bodyweight', 'cable', 'cardio', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE muscle_group AS ENUM (
    'chest', 'back', 'shoulders', 'biceps', 'triceps',
    'legs', 'glutes', 'hamstrings', 'quads', 'calves',
    'core', 'full_body'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE workout_tag AS ENUM (
    'push', 'pull', 'legs', 'upper', 'lower',
    'full_body', 'core', 'compound', 'isolation'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE phase_type AS ENUM (
    'accumulation', 'intensification', 'density'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE workout_source AS ENUM (
    'import_text', 'import_docx', 'import_xlsx', 'manual', 'generated'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE import_file_type AS ENUM ('text', 'docx', 'xlsx', 'csv');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE import_status AS ENUM (
    'pending', 'processing', 'success', 'error'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ---------------------------------------------------------------
-- 2. Reference tables (no RLS — public read, admin write)
-- ---------------------------------------------------------------

-- 2a. equipment
CREATE TABLE IF NOT EXISTS equipment (
  id               TEXT        PRIMARY KEY,
  name             TEXT        NOT NULL,
  canonical_name   TEXT        NOT NULL UNIQUE,
  aliases          TEXT[]      NOT NULL DEFAULT '{}',
  category         equipment_category NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2b. exercise_definitions
--     (The app queries this table as "exercise_definitions")
CREATE TABLE IF NOT EXISTS exercise_definitions (
  id               TEXT        PRIMARY KEY,
  name             TEXT        NOT NULL,
  canonical_name   TEXT        NOT NULL UNIQUE,
  aliases          TEXT[]      NOT NULL DEFAULT '{}',
  equipment_id     TEXT        REFERENCES equipment(id) ON DELETE SET NULL,
  muscle_groups    muscle_group[]  NOT NULL DEFAULT '{}',
  tags             workout_tag[]   NOT NULL DEFAULT '{}',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigram index for fuzzy name search
CREATE INDEX IF NOT EXISTS idx_exercise_definitions_name_trgm
  ON exercise_definitions USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_exercise_definitions_canonical
  ON exercise_definitions (canonical_name);


-- ---------------------------------------------------------------
-- 3. User-scoped tables
-- ---------------------------------------------------------------

-- 3a. training_phases
CREATE TABLE IF NOT EXISTS training_phases (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  phase_type       phase_type  NOT NULL,
  phase_number     INT         NOT NULL DEFAULT 1,
  start_date       DATE        NOT NULL,
  end_date         DATE        NOT NULL,
  rep_range_low    INT         NOT NULL,
  rep_range_high   INT         NOT NULL,
  description      TEXT        NOT NULL DEFAULT '',
  is_active        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_phases_rep_range_check CHECK (rep_range_low <= rep_range_high),
  CONSTRAINT training_phases_date_range_check CHECK (start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS idx_training_phases_user_active
  ON training_phases (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_training_phases_user_start
  ON training_phases (user_id, start_date DESC);


-- 3b. workout_sessions
CREATE TABLE IF NOT EXISTS workout_sessions (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             DATE        NOT NULL,
  notes            TEXT,
  source           workout_source NOT NULL DEFAULT 'manual',
  raw_text         TEXT,
  duration_minutes INT,
  phase_id         TEXT        REFERENCES training_phases(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date
  ON workout_sessions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_phase
  ON workout_sessions (user_id, phase_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date
  ON workout_sessions (date);


-- 3c. workout_sets
CREATE TABLE IF NOT EXISTS workout_sets (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id       TEXT        NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id      TEXT        NOT NULL REFERENCES exercise_definitions(id),
  set_number       INT         NOT NULL,
  reps             INT,
  weight_lbs       NUMERIC(7, 2),
  bodyweight_lbs   NUMERIC(7, 2),
  notes            TEXT,
  is_warmup        BOOLEAN     NOT NULL DEFAULT FALSE,
  rpe              NUMERIC(3, 1),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workout_sets_rpe_range CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
  CONSTRAINT workout_sets_set_number_positive CHECK (set_number >= 1)
);

CREATE INDEX IF NOT EXISTS idx_workout_sets_session
  ON workout_sets (session_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise
  ON workout_sets (exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_session_exercise
  ON workout_sets (session_id, exercise_id);


-- 3d. generated_routines
--     warmup  → { description: string, duration_minutes: number }
--     exercises → ExercisePrescription[]
CREATE TABLE IF NOT EXISTS generated_routines (
  id                       TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id                  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase_id                 TEXT        REFERENCES training_phases(id) ON DELETE SET NULL,
  generated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date                     DATE        NOT NULL,
  workout_type             workout_tag NOT NULL,
  warmup                   JSONB       NOT NULL DEFAULT '{}',
  exercises                JSONB       NOT NULL DEFAULT '[]',
  estimated_duration_minutes INT       NOT NULL DEFAULT 30,
  was_completed            BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_session_id     TEXT        REFERENCES workout_sessions(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_routines_user_date
  ON generated_routines (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_generated_routines_user_completed
  ON generated_routines (user_id, was_completed);


-- 3e. weekly_summaries
--     stats → WeeklySummaryStats (JSONB)
--       { sessions_completed, total_sets, total_volume_lbs,
--         exercises_performed[], top_lifts[{exercise,best_set}],
--         days_trained[] }
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start       DATE        NOT NULL,
  week_end         DATE        NOT NULL,
  summary_text     TEXT        NOT NULL DEFAULT '',
  stats            JSONB       NOT NULL DEFAULT '{}',
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_summaries_user_week
  ON weekly_summaries (user_id, week_start DESC);


-- 3f. import_jobs
--     errors → [{ line?: number, message: string }]
CREATE TABLE IF NOT EXISTS import_jobs (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename         TEXT,
  file_type        import_file_type NOT NULL DEFAULT 'text',
  raw_content      TEXT,
  parsed_sessions  INT         NOT NULL DEFAULT 0,
  status           import_status NOT NULL DEFAULT 'pending',
  errors           JSONB       NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_user_created
  ON import_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status
  ON import_jobs (user_id, status);


-- 3g. raw_workout_entries
--     Stores each day's raw parsed text + structured data before
--     it is matched to a workout_session. Useful for debugging
--     import failures and re-processing with updated parsers.
--     parsed_data → { exercises: [{ exercise_name, sets: [{reps, weight_lbs}] }] }
CREATE TABLE IF NOT EXISTS raw_workout_entries (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id    TEXT        REFERENCES import_jobs(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             DATE,
  raw_text         TEXT        NOT NULL,
  parsed_data      JSONB,
  session_id       TEXT        REFERENCES workout_sessions(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_workout_entries_user
  ON raw_workout_entries (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_raw_workout_entries_import_job
  ON raw_workout_entries (import_job_id);
CREATE INDEX IF NOT EXISTS idx_raw_workout_entries_session
  ON raw_workout_entries (session_id);


-- 3h. user_preferences
--     One row per user; upserted on first use.
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id                          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  weekly_session_target            INT         NOT NULL DEFAULT 3,
  preferred_session_duration_min   INT         NOT NULL DEFAULT 30,
  default_unit                     TEXT        NOT NULL DEFAULT 'lbs'
                                               CHECK (default_unit IN ('lbs', 'kg')),
  timezone                         TEXT        NOT NULL DEFAULT 'America/New_York',
  preferred_workout_days           TEXT[]      NOT NULL DEFAULT '{}',
  notifications_enabled            BOOLEAN     NOT NULL DEFAULT TRUE,
  theme                            TEXT        NOT NULL DEFAULT 'system'
                                               CHECK (theme IN ('light', 'dark', 'system')),
  created_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ---------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------

-- Reference tables: authenticated users can read; only service role writes
ALTER TABLE equipment           ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read equipment"
  ON equipment FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Public read exercise_definitions"
  ON exercise_definitions FOR SELECT TO authenticated USING (TRUE);

-- User-scoped tables: each user sees/touches only their own rows
ALTER TABLE training_phases     ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_routines  ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_workout_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences    ENABLE ROW LEVEL SECURITY;

-- training_phases
CREATE POLICY "Users manage own phases"
  ON training_phases FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- workout_sessions
CREATE POLICY "Users manage own sessions"
  ON workout_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- workout_sets: ownership via session join
CREATE POLICY "Users manage own sets"
  ON workout_sets FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = workout_sets.session_id
        AND ws.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = workout_sets.session_id
        AND ws.user_id = auth.uid()
    )
  );

-- generated_routines
CREATE POLICY "Users manage own routines"
  ON generated_routines FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- weekly_summaries
CREATE POLICY "Users manage own summaries"
  ON weekly_summaries FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- import_jobs
CREATE POLICY "Users manage own import jobs"
  ON import_jobs FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- raw_workout_entries
CREATE POLICY "Users manage own raw entries"
  ON raw_workout_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_preferences
CREATE POLICY "Users manage own preferences"
  ON user_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------
-- 5. Seed data — equipment & exercise_definitions
--    Mirrors MOCK_EQUIPMENT and MOCK_EXERCISES from mock-data.ts
-- ---------------------------------------------------------------

INSERT INTO equipment (id, name, canonical_name, aliases, category, created_at) VALUES
  ('eq-1',  'Cybex Incline Chest Press',     'cybex-incline-press',        ARRAY['cybex incline'],          'machine',     '2024-01-01T00:00:00Z'),
  ('eq-2',  'Icarian Leg Press',             'icarian-leg-press',           ARRAY['icarian','leg press'],    'machine',     '2024-01-01T00:00:00Z'),
  ('eq-3',  'Hammer Strength Bench Press',   'hammer-strength-bench',       ARRAY['hammer bench'],           'machine',     '2024-01-01T00:00:00Z'),
  ('eq-4',  'Pull-Up Bar',                   'pull-up-bar',                 ARRAY['pull-ups'],               'bodyweight',  '2024-01-01T00:00:00Z'),
  ('eq-5',  'Dip Bars',                      'dip-bars',                    ARRAY['dips'],                   'bodyweight',  '2024-01-01T00:00:00Z'),
  ('eq-6',  'Cable Machine',                 'cable-machine',               ARRAY['cables'],                 'cable',       '2024-01-01T00:00:00Z'),
  ('eq-7',  'Dumbbells',                     'dumbbells',                   ARRAY['dbs','db'],               'free_weight', '2024-01-01T00:00:00Z'),
  ('eq-8',  'Trap Bar',                      'trap-bar',                    ARRAY['hex bar'],                'free_weight', '2024-01-01T00:00:00Z'),
  ('eq-9',  'Ab Wheel',                      'ab-wheel',                    ARRAY['ab roller'],              'bodyweight',  '2024-01-01T00:00:00Z'),
  ('eq-10', 'Leg Extension Machine',         'leg-extension-machine',       ARRAY['leg extension'],          'machine',     '2024-01-01T00:00:00Z'),
  ('eq-11', 'Lying Leg Curl Machine',        'lying-leg-curl-machine',      ARRAY['leg curl'],               'machine',     '2024-01-01T00:00:00Z'),
  ('eq-12', 'Hammer Strength Row',           'hammer-strength-row',         ARRAY['hammer row','hs row'],    'machine',     '2024-01-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO exercise_definitions
  (id, name, canonical_name, aliases, equipment_id, muscle_groups, tags, created_at)
VALUES
  ('ex-1',  'Cybex Incline Press',
   'cybex-incline-press',
   ARRAY['cybex incline'],
   'eq-1',
   ARRAY['chest','shoulders','triceps']::muscle_group[],
   ARRAY['push','upper','compound']::workout_tag[],
   '2024-01-01T00:00:00Z'),

  ('ex-2',  'Hammer Strength Bench',
   'hammer-strength-bench',
   ARRAY['hammer bench'],
   'eq-3',
   ARRAY['chest','triceps','shoulders']::muscle_group[],
   ARRAY['push','upper','compound']::workout_tag[],
   '2024-01-01T00:00:00Z'),

  ('ex-3',  'Pull-Up',
   'pull-up',
   ARRAY['pullup','chin-up'],
   'eq-4',
   ARRAY['back','biceps']::muscle_group[],
   ARRAY['pull','upper','compound']::workout_tag[],
   '2024-01-01T00:00:00Z'),

  ('ex-4',  'Dip',
   'dip',
   ARRAY['dips','parallel dip'],
   'eq-5',
   ARRAY['triceps','chest','shoulders']::muscle_group[],
   ARRAY['push','upper','compound']::workout_tag[],
   '2024-01-01T00:00:00Z'),

  ('ex-5',  'Icarian Leg Press',
   'icarian-leg-press',
   ARRAY['leg press'],
   'eq-2',
   ARRAY['quads','glutes','hamstrings']::muscle_group[],
   ARRAY['legs','lower','compound']::workout_tag[],
   '2024-01-01T00:00:00Z'),

  ('ex-6',  'Cable Fly',
   'cable-fly',
   ARRAY['cable crossover'],
   'eq-6',
   ARRAY['chest']::muscle_group[],
   ARRAY['push','upper','isolation']::workout_tag[],
   '2024-01-01T00:00:00Z'),

  ('ex-7',  'Hammer Strength Row',
   'hammer-strength-row',
   ARRAY['hammer row','hs row'],
   'eq-12',
   ARRAY['back','biceps']::muscle_group[],
   ARRAY['pull','upper','compound']::workout_tag[],
   '2024-01-01T00:00:00Z'),

  ('ex-8',  'Dumbbell Curl',
   'dumbbell-curl',
   ARRAY['db curl'],
   'eq-7',
   ARRAY['biceps']::muscle_group[],
   ARRAY['pull','upper','isolation']::workout_tag[],
   '2024-01-01T00:00:00Z'),

  ('ex-9',  'Tricep Pushdown',
   'tricep-pushdown',
   ARRAY['cable pushdown'],
   'eq-6',
   ARRAY['triceps']::muscle_group[],
   ARRAY['push','upper','isolation']::workout_tag[],
   '2024-01-01T00:00:00Z'),

  ('ex-10', 'Ab Wheel Rollout',
   'ab-wheel-rollout',
   ARRAY['ab rollout'],
   'eq-9',
   ARRAY['core']::muscle_group[],
   ARRAY['core','compound']::workout_tag[],
   '2024-01-01T00:00:00Z'),

  ('ex-11', 'Trap Bar Deadlift',
   'trap-bar-deadlift',
   ARRAY['hex bar deadlift'],
   'eq-8',
   ARRAY['glutes','hamstrings','back','quads']::muscle_group[],
   ARRAY['legs','lower','compound']::workout_tag[],
   '2024-01-01T00:00:00Z'),

  ('ex-12', 'Leg Extension',
   'leg-extension',
   ARRAY['quad extension'],
   'eq-10',
   ARRAY['quads']::muscle_group[],
   ARRAY['legs','lower','isolation']::workout_tag[],
   '2024-01-01T00:00:00Z'),

  ('ex-13', 'Lying Leg Curl',
   'lying-leg-curl',
   ARRAY['hamstring curl'],
   'eq-11',
   ARRAY['hamstrings']::muscle_group[],
   ARRAY['legs','lower','isolation']::workout_tag[],
   '2024-01-01T00:00:00Z'),

  ('ex-14', 'Dumbbell Lateral Raise',
   'dumbbell-lateral-raise',
   ARRAY['lateral raise'],
   'eq-7',
   ARRAY['shoulders']::muscle_group[],
   ARRAY['push','upper','isolation']::workout_tag[],
   '2024-01-01T00:00:00Z'),

  ('ex-15', 'Dumbbell Shoulder Press',
   'dumbbell-shoulder-press',
   ARRAY['db ohp','db shoulder'],
   'eq-7',
   ARRAY['shoulders','triceps']::muscle_group[],
   ARRAY['push','upper','compound']::workout_tag[],
   '2024-01-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------
-- 6. Helpful views (optional — remove if not needed)
-- ---------------------------------------------------------------

-- Flat view of sets with exercise name and session date (useful for analytics)
CREATE OR REPLACE VIEW v_sets_with_context AS
SELECT
  ws.id              AS set_id,
  ws.session_id,
  ws.exercise_id,
  ed.name            AS exercise_name,
  ed.canonical_name  AS exercise_canonical,
  ed.muscle_groups,
  ed.tags            AS exercise_tags,
  wss.user_id,
  wss.date           AS session_date,
  wss.source         AS session_source,
  ws.set_number,
  ws.reps,
  ws.weight_lbs,
  ws.bodyweight_lbs,
  ws.is_warmup,
  ws.rpe,
  ws.notes           AS set_notes,
  -- Brzycki estimated 1RM
  CASE
    WHEN ws.weight_lbs > 0 AND ws.reps > 0 AND ws.reps < 37
      THEN ROUND((ws.weight_lbs / (1.0278 - 0.0278 * ws.reps))::numeric, 1)
    ELSE NULL
  END                AS estimated_1rm
FROM workout_sets ws
JOIN exercise_definitions ed ON ed.id = ws.exercise_id
JOIN workout_sessions wss    ON wss.id = ws.session_id;

-- Per-user weekly volume summary (used by VolumeChart)
CREATE OR REPLACE VIEW v_weekly_volume AS
SELECT
  wss.user_id,
  DATE_TRUNC('week', wss.date)::date  AS week_start,
  COUNT(DISTINCT wss.id)              AS sessions,
  COUNT(ws.id)                        AS total_sets,
  COALESCE(SUM(ws.weight_lbs * ws.reps), 0) AS volume_lbs
FROM workout_sessions wss
LEFT JOIN workout_sets ws ON ws.session_id = wss.id AND NOT ws.is_warmup
GROUP BY wss.user_id, DATE_TRUNC('week', wss.date)::date;

-- ---------------------------------------------------------------
-- Done. ✓
-- ---------------------------------------------------------------
