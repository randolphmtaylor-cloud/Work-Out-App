-- ============================================================
-- Workout logging reliability + exercise library editing support
-- Safe to paste into Supabase SQL Editor.
-- ============================================================

ALTER TABLE IF EXISTS workout_sessions
  ADD COLUMN IF NOT EXISTS workout_type TEXT;

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date_created
  ON workout_sessions (user_id, date DESC, created_at DESC);

ALTER TABLE IF EXISTS exercise_definitions
  ADD COLUMN IF NOT EXISTS library_category TEXT NOT NULL DEFAULT 'Strength',
  ADD COLUMN IF NOT EXISTS phase_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS equipment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_exercise_definitions_library_category
  ON exercise_definitions (library_category, phase_order, name);

CREATE INDEX IF NOT EXISTS idx_exercise_definitions_archived_at
  ON exercise_definitions (archived_at)
  WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exercise_definitions_equipment_id
  ON exercise_definitions (equipment_id);

DROP POLICY IF EXISTS "Authenticated users can create exercise definitions" ON exercise_definitions;
CREATE POLICY "Authenticated users can create exercise definitions"
  ON exercise_definitions FOR INSERT TO authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Authenticated users can update exercise definitions" ON exercise_definitions;
CREATE POLICY "Authenticated users can update exercise definitions"
  ON exercise_definitions FOR UPDATE TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);
