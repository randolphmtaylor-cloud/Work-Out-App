-- ============================================================
-- Workout Import Metadata
-- Adds stable import identifiers for idempotent bundled history imports.
-- ============================================================

ALTER TABLE IF EXISTS workout_sessions
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch TEXT,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS workout_sets
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS import_batch TEXT,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_sessions_user_source_id
  ON workout_sessions (user_id, source_id)
  WHERE source_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_sets_source_id
  ON workout_sets (source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_sessions_import_batch
  ON workout_sessions (user_id, import_batch)
  WHERE import_batch IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_sets_import_batch
  ON workout_sets (import_batch)
  WHERE import_batch IS NOT NULL;
