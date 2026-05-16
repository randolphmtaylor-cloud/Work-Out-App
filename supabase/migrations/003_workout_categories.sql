-- ============================================================
-- Workout Categories / Canonical Exercise Review Support
-- Adds the canonical exercise category tables used by the app's
-- import review flow. Safe to run after 001/002 or after schema.sql.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------
-- App-facing exercise catalog compatibility
-- ---------------------------------------------------------------
-- The current app reads from exercise_definitions. Older migrations
-- created exercises instead, so create the app-facing table if needed.
CREATE TABLE IF NOT EXISTS exercise_definitions (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name           TEXT NOT NULL,
  canonical_name TEXT NOT NULL UNIQUE,
  aliases        TEXT[] NOT NULL DEFAULT '{}',
  equipment_id   TEXT,
  muscle_groups  TEXT[] NOT NULL DEFAULT '{}',
  tags           TEXT[] NOT NULL DEFAULT '{}',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS exercise_definitions_canonical_name_idx
  ON exercise_definitions (canonical_name);

CREATE INDEX IF NOT EXISTS exercise_definitions_equipment_id_idx
  ON exercise_definitions (equipment_id);

-- Backfill from the older exercises table when it exists.
DO $$
BEGIN
  IF to_regclass('public.exercises') IS NOT NULL THEN
    INSERT INTO exercise_definitions (
      id,
      name,
      canonical_name,
      aliases,
      equipment_id,
      muscle_groups,
      tags,
      notes,
      created_at
    )
    SELECT
      id::text,
      name,
      canonical_name,
      COALESCE(aliases, '{}'),
      equipment_id::text,
      COALESCE(muscle_groups, '{}'),
      COALESCE(tags, '{}'),
      notes,
      created_at
    FROM exercises
    ON CONFLICT (canonical_name) DO NOTHING;
  END IF;
END $$;

-- If the database was created from 001_initial_schema.sql, workout_sets
-- points at exercises(id). The app now supplies exercise_definitions ids.
DO $$
DECLARE
  exercise_id_type TEXT;
BEGIN
  SELECT data_type
  INTO exercise_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'workout_sets'
    AND column_name = 'exercise_id';

  IF exercise_id_type IS NOT NULL AND exercise_id_type <> 'text' THEN
    -- v_sets_with_context depends on workout_sets.exercise_id in databases
    -- created from supabase/schema.sql. Drop/recreate it only for the type change.
    DROP VIEW IF EXISTS v_sets_with_context;

    ALTER TABLE workout_sets
      DROP CONSTRAINT IF EXISTS workout_sets_exercise_id_fkey;

    ALTER TABLE workout_sets
      ALTER COLUMN exercise_id TYPE TEXT USING exercise_id::text;

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
      CASE
        WHEN ws.weight_lbs > 0 AND ws.reps > 0 AND ws.reps < 37
          THEN ROUND((ws.weight_lbs / (1.0278 - 0.0278 * ws.reps))::numeric, 1)
        ELSE NULL
      END                AS estimated_1rm
    FROM workout_sets ws
    JOIN exercise_definitions ed ON ed.id = ws.exercise_id
    JOIN workout_sessions wss    ON wss.id = ws.session_id;
  END IF;
END $$;

ALTER TABLE IF EXISTS workout_sets
  DROP CONSTRAINT IF EXISTS workout_sets_exercise_id_fkey;

DO $$
DECLARE
  exercise_id_type TEXT;
BEGIN
  SELECT data_type
  INTO exercise_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'workout_sets'
    AND column_name = 'exercise_id';

  IF to_regclass('public.workout_sets') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'workout_sets_exercise_id_fkey'
        AND conrelid = 'public.workout_sets'::regclass
    ) AND exercise_id_type = 'text' THEN
      ALTER TABLE workout_sets
        ADD CONSTRAINT workout_sets_exercise_id_fkey
        FOREIGN KEY (exercise_id)
        REFERENCES exercise_definitions(id)
        ON DELETE RESTRICT;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------
-- Canonical workout categories
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canonical_exercises (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL UNIQUE,
  category   TEXT NOT NULL CHECK (
    category IN ('push', 'pull', 'legs', 'upper', 'lower', 'core', 'other')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS canonical_exercises_category_idx
  ON canonical_exercises (category);

CREATE TABLE IF NOT EXISTS exercise_canonical_mappings (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  exercise_id           TEXT NOT NULL REFERENCES exercise_definitions(id) ON DELETE CASCADE,
  canonical_exercise_id TEXT NOT NULL REFERENCES canonical_exercises(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT exercise_canonical_mappings_exercise_unique UNIQUE (exercise_id)
);

CREATE INDEX IF NOT EXISTS exercise_canonical_mappings_canonical_idx
  ON exercise_canonical_mappings (canonical_exercise_id);

-- ---------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------
ALTER TABLE exercise_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_canonical_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Exercises readable by all" ON exercise_definitions;
CREATE POLICY "Exercises readable by all"
  ON exercise_definitions FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Canonical exercises readable by all" ON canonical_exercises;
CREATE POLICY "Canonical exercises readable by all"
  ON canonical_exercises FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Exercise mappings readable by all" ON exercise_canonical_mappings;
CREATE POLICY "Exercise mappings readable by all"
  ON exercise_canonical_mappings FOR SELECT
  USING (TRUE);

-- ---------------------------------------------------------------
-- Seed data used by src/lib/canonical-exercises.ts
-- ---------------------------------------------------------------
INSERT INTO canonical_exercises (id, name, category, created_at) VALUES
  ('can-1', 'Lat Pulldown', 'pull', '2024-01-01T00:00:00Z'),
  ('can-2', 'Seated Cable Row', 'pull', '2024-01-01T00:00:00Z'),
  ('can-3', 'Machine Chest Press', 'push', '2024-01-01T00:00:00Z'),
  ('can-4', 'Squat', 'legs', '2024-01-01T00:00:00Z'),
  ('can-5', 'Back Extension', 'lower', '2024-01-01T00:00:00Z'),
  ('can-6', 'Triceps Machine', 'push', '2024-01-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;
