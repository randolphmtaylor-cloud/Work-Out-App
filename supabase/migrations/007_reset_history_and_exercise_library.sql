-- ============================================================
-- Safe workout-history reset + exercise library management
-- Keeps exercise_definitions, canonical_exercises, mappings,
-- categories/templates, phases, and user preferences intact.
-- ============================================================

ALTER TABLE IF EXISTS exercise_definitions
  ADD COLUMN IF NOT EXISTS library_category TEXT NOT NULL DEFAULT 'Strength'
    CHECK (library_category IN ('Strength', 'Calisthenics', 'Home Workout', 'Running/Cardio', 'Warmup', 'Recovery')),
  ADD COLUMN IF NOT EXISTS phase_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_exercise_definitions_library_category
  ON exercise_definitions (library_category, phase_order, name);

CREATE OR REPLACE FUNCTION reset_workout_history()
RETURNS TABLE (
  sessions_deleted INT,
  sets_deleted INT,
  imports_deleted INT,
  summaries_deleted INT,
  routines_deleted INT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_session_ids TEXT[];
  v_sessions_deleted INT := 0;
  v_sets_deleted INT := 0;
  v_imports_deleted INT := 0;
  v_summaries_deleted INT := 0;
  v_routines_deleted INT := 0;
BEGIN
  SELECT COALESCE(array_agg(id), ARRAY[]::TEXT[])
    INTO v_session_ids
  FROM workout_sessions
  WHERE user_id = auth.uid();

  SELECT COUNT(*)::INT
    INTO v_sets_deleted
  FROM workout_sets
  WHERE session_id = ANY(v_session_ids);

  SELECT COUNT(*)::INT
    INTO v_imports_deleted
  FROM import_batches
  WHERE user_id = auth.uid();

  SELECT COUNT(*)::INT
    INTO v_summaries_deleted
  FROM weekly_summaries
  WHERE user_id = auth.uid();

  SELECT COUNT(*)::INT
    INTO v_routines_deleted
  FROM generated_routines
  WHERE user_id = auth.uid();

  IF to_regclass('public.raw_workout_entries') IS NOT NULL THEN
    EXECUTE 'DELETE FROM raw_workout_entries WHERE user_id = auth.uid()';
  END IF;

  IF to_regclass('public.workout_logs') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'workout_logs' AND column_name = 'session_id'
    ) THEN
      EXECUTE 'DELETE FROM workout_logs WHERE session_id = ANY($1)' USING v_session_ids;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'workout_logs' AND column_name = 'user_id'
    ) THEN
      EXECUTE 'DELETE FROM workout_logs WHERE user_id = auth.uid()';
    END IF;
  END IF;

  IF to_regclass('public.workout_exercises') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'workout_exercises' AND column_name = 'session_id'
    ) THEN
      EXECUTE 'DELETE FROM workout_exercises WHERE session_id = ANY($1)' USING v_session_ids;
    END IF;
  END IF;

  IF to_regclass('public.exercise_logs') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'exercise_logs' AND column_name = 'session_id'
    ) THEN
      EXECUTE 'DELETE FROM exercise_logs WHERE session_id = ANY($1)' USING v_session_ids;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'exercise_logs' AND column_name = 'user_id'
    ) THEN
      EXECUTE 'DELETE FROM exercise_logs WHERE user_id = auth.uid()';
    END IF;
  END IF;

  IF to_regclass('public.sets') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sets' AND column_name = 'session_id'
    ) THEN
      EXECUTE 'DELETE FROM sets WHERE session_id = ANY($1)' USING v_session_ids;
    END IF;
  END IF;

  DELETE FROM generated_routines
  WHERE user_id = auth.uid();

  DELETE FROM weekly_summaries
  WHERE user_id = auth.uid();

  IF to_regclass('public.import_jobs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM import_jobs WHERE user_id = auth.uid()';
  END IF;

  DELETE FROM workout_sessions
  WHERE user_id = auth.uid();
  GET DIAGNOSTICS v_sessions_deleted = ROW_COUNT;

  DELETE FROM import_batches
  WHERE user_id = auth.uid();

  RETURN QUERY SELECT v_sessions_deleted, v_sets_deleted, v_imports_deleted, v_summaries_deleted, v_routines_deleted;
END;
$$;
