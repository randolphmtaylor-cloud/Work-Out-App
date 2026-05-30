-- ============================================================
-- Workout goals and goal-aware exercise catalog
-- Starter goal rows are created for each authenticated user by the app
-- on first access so they have the correct user_id under RLS.
-- ============================================================

CREATE TABLE IF NOT EXISTS workout_goals (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT NOT NULL DEFAULT '',
  focus_area  TEXT NOT NULL CHECK (length(trim(focus_area)) > 0),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_goals_user_name
  ON workout_goals (user_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_workout_goals_user_active
  ON workout_goals (user_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS goal_exercise_links (
  goal_id     TEXT NOT NULL REFERENCES workout_goals(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercise_definitions(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (goal_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_goal_exercise_links_exercise
  ON goal_exercise_links (exercise_id, goal_id);

CREATE OR REPLACE FUNCTION update_workout_goal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workout_goals_updated_at ON workout_goals;
CREATE TRIGGER trg_workout_goals_updated_at
  BEFORE UPDATE ON workout_goals
  FOR EACH ROW EXECUTE FUNCTION update_workout_goal_updated_at();

ALTER TABLE workout_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_exercise_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own goals" ON workout_goals;
CREATE POLICY "Users manage own goals"
  ON workout_goals FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage exercise links for own goals" ON goal_exercise_links;
CREATE POLICY "Users manage exercise links for own goals"
  ON goal_exercise_links FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_goals goal
      WHERE goal.id = goal_exercise_links.goal_id
        AND goal.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_goals goal
      WHERE goal.id = goal_exercise_links.goal_id
        AND goal.user_id = auth.uid()
    )
  );

INSERT INTO exercise_definitions (id, name, canonical_name, aliases, equipment_id, muscle_groups, tags, created_at) VALUES
  ('goal-abs-leg-lifts',      'Lying Leg Lifts',      'lying-leg-lifts',      ARRAY['lying leg raises', 'leg lifts'], NULL, ARRAY['core']::muscle_group[],                    ARRAY['core', 'isolation']::workout_tag[],       NOW()),
  ('goal-abs-sit-ups',        'Sit-Ups',              'sit-ups',              ARRAY['sit ups', 'situps'],             NULL, ARRAY['core']::muscle_group[],                    ARRAY['core', 'isolation']::workout_tag[],       NOW()),
  ('goal-abs-plank',          'Plank',                'plank',                ARRAY['forearm plank'],                 NULL, ARRAY['core']::muscle_group[],                    ARRAY['core', 'isolation']::workout_tag[],       NOW()),
  ('goal-abs-knee-raise',     'Hanging Knee Raise',   'hanging-knee-raise',   ARRAY['hanging leg raise'],             NULL, ARRAY['core']::muscle_group[],                    ARRAY['core', 'compound']::workout_tag[],        NOW()),
  ('goal-abs-cable-crunch',   'Cable Crunch',         'cable-crunch',         ARRAY['rope crunch'],                   NULL, ARRAY['core']::muscle_group[],                    ARRAY['core', 'isolation']::workout_tag[],       NOW()),
  ('goal-glutes-hip-thrust',  'Hip Thrust',           'hip-thrust',           ARRAY['barbell hip thrust'],            NULL, ARRAY['glutes', 'hamstrings']::muscle_group[],    ARRAY['legs', 'lower', 'compound']::workout_tag[], NOW()),
  ('goal-glutes-rdl',         'Romanian Deadlift',    'romanian-deadlift',    ARRAY['rdl'],                           NULL, ARRAY['glutes', 'hamstrings', 'back']::muscle_group[], ARRAY['legs', 'lower', 'compound']::workout_tag[], NOW()),
  ('goal-glutes-bridge',      'Glute Bridge',         'glute-bridge',         ARRAY['bridges'],                       NULL, ARRAY['glutes']::muscle_group[],                  ARRAY['legs', 'lower', 'isolation']::workout_tag[], NOW()),
  ('goal-glutes-kickback',    'Cable Kickback',       'cable-kickback',       ARRAY['glute kickback'],                NULL, ARRAY['glutes']::muscle_group[],                  ARRAY['legs', 'lower', 'isolation']::workout_tag[], NOW())
ON CONFLICT (canonical_name) DO NOTHING;
