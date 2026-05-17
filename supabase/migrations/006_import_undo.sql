-- ============================================================
-- Import Batch Undo Tracking
-- Adds tracked import batches and transactional delete helpers.
-- Existing imported rows without import_batch_id remain untouched.
-- ============================================================

CREATE TABLE IF NOT EXISTS import_batches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_file_name TEXT NOT NULL,
  workout_count    INT NOT NULL DEFAULT 0 CHECK (workout_count >= 0),
  notes            TEXT
);

ALTER TABLE IF EXISTS workout_sessions
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS workout_sets
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS raw_workout_entries
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS exercise_logs
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_import_batches_user_created
  ON import_batches (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_import_batch_id
  ON workout_sessions (user_id, import_batch_id)
  WHERE import_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_sets_import_batch_id
  ON workout_sets (import_batch_id)
  WHERE import_batch_id IS NOT NULL;

DO $$ BEGIN
  IF to_regclass('public.raw_workout_entries') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_raw_workout_entries_import_batch_id
      ON raw_workout_entries (import_batch_id)
      WHERE import_batch_id IS NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.exercise_logs') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_exercise_logs_import_batch_id
      ON exercise_logs (import_batch_id)
      WHERE import_batch_id IS NOT NULL;
  END IF;
END $$;

ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own import batches"
    ON import_batches FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION list_import_batches()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  created_at TIMESTAMPTZ,
  source_file_name TEXT,
  workout_count INT,
  notes TEXT,
  session_count BIGINT,
  set_count BIGINT
)
LANGUAGE SQL
SECURITY INVOKER
STABLE
AS $$
  SELECT
    batch.id,
    batch.user_id,
    batch.created_at,
    batch.source_file_name,
    batch.workout_count,
    batch.notes,
    COUNT(DISTINCT session_row.id) AS session_count,
    COUNT(set_row.id) AS set_count
  FROM import_batches batch
  LEFT JOIN workout_sessions session_row
    ON session_row.import_batch_id = batch.id
    AND session_row.user_id = batch.user_id
  LEFT JOIN workout_sets set_row
    ON set_row.session_id = session_row.id
  WHERE batch.user_id = auth.uid()
  GROUP BY batch.id
  ORDER BY batch.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION preview_legacy_import_candidates()
RETURNS TABLE (found INT, skipped INT, candidates JSONB)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  v_condition TEXT := '(source::text LIKE ''import_%'' OR imported_at IS NOT NULL OR import_batch IS NOT NULL OR source_id IS NOT NULL OR notes ILIKE ''%import%'')';
  v_reason_extra TEXT := '';
  v_found INT;
  v_total_untagged INT;
  v_candidates JSONB;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workout_sessions' AND column_name = 'source_file_name'
  ) THEN
    v_condition := v_condition || ' OR source_file_name IS NOT NULL';
    v_reason_extra := v_reason_extra || ', CASE WHEN source_file_name IS NOT NULL THEN ''source_file_name'' END';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workout_sessions' AND column_name = 'created_by_import'
  ) THEN
    v_condition := v_condition || ' OR created_by_import IS TRUE';
    v_reason_extra := v_reason_extra || ', CASE WHEN created_by_import IS TRUE THEN ''created_by_import'' END';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workout_sessions' AND column_name = 'is_imported'
  ) THEN
    v_condition := v_condition || ' OR is_imported IS TRUE';
    v_reason_extra := v_reason_extra || ', CASE WHEN is_imported IS TRUE THEN ''is_imported'' END';
  END IF;

  SELECT COUNT(*)::INT
    INTO v_total_untagged
  FROM workout_sessions
  WHERE user_id = auth.uid()
    AND import_batch_id IS NULL;

  EXECUTE 'SELECT COUNT(*)::INT FROM workout_sessions WHERE user_id = auth.uid() AND import_batch_id IS NULL AND (' || v_condition || ')'
    INTO v_found;

  EXECUTE
    'SELECT COALESCE(jsonb_agg(row_data), ''[]''::jsonb)
     FROM (
       SELECT jsonb_build_object(
         ''id'', id,
         ''date'', date,
         ''source'', source,
         ''notes'', notes,
         ''reason'', concat_ws('', '',
           CASE WHEN source::text LIKE ''import_%'' THEN ''source='' || source::text END,
           CASE WHEN imported_at IS NOT NULL THEN ''imported_at'' END,
           CASE WHEN import_batch IS NOT NULL THEN ''import_batch'' END,
           CASE WHEN source_id IS NOT NULL THEN ''source_id'' END,
           CASE WHEN notes ILIKE ''%import%'' THEN ''notes mention import'' END' || v_reason_extra || '
         )
       ) AS row_data
       FROM workout_sessions
       WHERE user_id = auth.uid()
         AND import_batch_id IS NULL
         AND (' || v_condition || ')
       ORDER BY date DESC, created_at DESC
       LIMIT 25
     ) preview_rows'
    INTO v_candidates;

  RETURN QUERY SELECT v_found, GREATEST(v_total_untagged - v_found, 0), v_candidates;
END;
$$;

CREATE OR REPLACE FUNCTION undo_import_batch(p_import_batch_id UUID)
RETURNS TABLE (sessions_deleted INT, sets_deleted INT)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_sets_deleted INT;
  v_sessions_deleted INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM import_batches WHERE id = p_import_batch_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Import batch not found';
  END IF;

  SELECT COUNT(*)::INT
    INTO v_sets_deleted
  FROM workout_sets set_row
  JOIN workout_sessions session_row
    ON session_row.id = set_row.session_id
  WHERE session_row.user_id = auth.uid()
    AND session_row.import_batch_id = p_import_batch_id;

  IF to_regclass('public.raw_workout_entries') IS NOT NULL THEN
    EXECUTE 'DELETE FROM raw_workout_entries WHERE user_id = auth.uid() AND import_batch_id = $1'
      USING p_import_batch_id;
  END IF;

  IF to_regclass('public.exercise_logs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM exercise_logs WHERE import_batch_id = $1' USING p_import_batch_id;
  END IF;

  DELETE FROM workout_sessions
  WHERE user_id = auth.uid()
    AND import_batch_id = p_import_batch_id;

  GET DIAGNOSTICS v_sessions_deleted = ROW_COUNT;

  DELETE FROM import_batches
  WHERE id = p_import_batch_id
    AND user_id = auth.uid();

  RETURN QUERY SELECT v_sessions_deleted, v_sets_deleted;
END;
$$;

CREATE OR REPLACE FUNCTION delete_all_imported_history()
RETURNS TABLE (batches_deleted INT, sessions_deleted INT, sets_deleted INT)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_batches_deleted INT;
  v_sessions_deleted INT;
  v_sets_deleted INT;
BEGIN
  SELECT COUNT(*)::INT
    INTO v_batches_deleted
  FROM import_batches
  WHERE user_id = auth.uid();

  SELECT COUNT(*)::INT
    INTO v_sets_deleted
  FROM workout_sets set_row
  JOIN workout_sessions session_row
    ON session_row.id = set_row.session_id
  WHERE session_row.user_id = auth.uid()
    AND session_row.import_batch_id IS NOT NULL;

  IF to_regclass('public.raw_workout_entries') IS NOT NULL THEN
    EXECUTE 'DELETE FROM raw_workout_entries WHERE user_id = auth.uid() AND import_batch_id IS NOT NULL';
  END IF;

  IF to_regclass('public.exercise_logs') IS NOT NULL THEN
    EXECUTE
      'DELETE FROM exercise_logs WHERE import_batch_id IN (SELECT id FROM import_batches WHERE user_id = auth.uid())';
  END IF;

  DELETE FROM workout_sessions
  WHERE user_id = auth.uid()
    AND import_batch_id IS NOT NULL;

  GET DIAGNOSTICS v_sessions_deleted = ROW_COUNT;

  DELETE FROM import_batches
  WHERE user_id = auth.uid();

  RETURN QUERY SELECT v_batches_deleted, v_sessions_deleted, v_sets_deleted;
END;
$$;

CREATE OR REPLACE FUNCTION assign_legacy_import_batch()
RETURNS TABLE (import_batch_id UUID, found INT, tagged INT, skipped INT)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_import_batch_id UUID;
  v_condition TEXT := '(source::text LIKE ''import_%'' OR imported_at IS NOT NULL OR import_batch IS NOT NULL OR source_id IS NOT NULL OR notes ILIKE ''%import%'')';
  v_total INT;
  v_total_untagged INT;
  v_tagged INT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workout_sessions' AND column_name = 'source_file_name'
  ) THEN
    v_condition := v_condition || ' OR source_file_name IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workout_sessions' AND column_name = 'created_by_import'
  ) THEN
    v_condition := v_condition || ' OR created_by_import IS TRUE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workout_sessions' AND column_name = 'is_imported'
  ) THEN
    v_condition := v_condition || ' OR is_imported IS TRUE';
  END IF;

  SELECT COUNT(*)::INT
    INTO v_total_untagged
  FROM workout_sessions
  WHERE user_id = auth.uid()
    AND import_batch_id IS NULL;

  EXECUTE 'SELECT COUNT(*)::INT FROM workout_sessions WHERE user_id = auth.uid() AND import_batch_id IS NULL AND (' || v_condition || ')'
    INTO v_total;

  IF v_total = 0 THEN
    RETURN QUERY SELECT NULL::UUID, 0, 0, v_total_untagged;
    RETURN;
  END IF;

  INSERT INTO import_batches (user_id, source_file_name, workout_count, notes)
  VALUES (
    auth.uid(),
    'Legacy Import',
    v_total,
    'Generated for imported workouts that existed before import tracking.'
  )
  RETURNING id INTO v_import_batch_id;

  EXECUTE
    'UPDATE workout_sessions
     SET import_batch_id = $1
     WHERE user_id = auth.uid()
       AND import_batch_id IS NULL
       AND (' || v_condition || ')'
    USING v_import_batch_id;

  GET DIAGNOSTICS v_tagged = ROW_COUNT;

  UPDATE workout_sets set_row
  SET import_batch_id = v_import_batch_id
  FROM workout_sessions session_row
  WHERE set_row.session_id = session_row.id
    AND session_row.user_id = auth.uid()
    AND session_row.import_batch_id = v_import_batch_id
    AND set_row.import_batch_id IS NULL;

  UPDATE raw_workout_entries raw_row
  SET import_batch_id = v_import_batch_id
  FROM workout_sessions session_row
  WHERE raw_row.session_id = session_row.id
    AND raw_row.user_id = auth.uid()
    AND session_row.import_batch_id = v_import_batch_id
    AND raw_row.import_batch_id IS NULL;

  RETURN QUERY SELECT v_import_batch_id, v_total, v_tagged, GREATEST(v_total_untagged - v_total, 0);
END;
$$;
