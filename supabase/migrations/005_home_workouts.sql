-- ============================================================
-- Home Workouts
-- Adds home as a workout category and seeds common home exercises.
-- ============================================================

DO $$ BEGIN
  ALTER TYPE workout_tag ADD VALUE IF NOT EXISTS 'home';
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "Authenticated users can create exercise definitions" ON exercise_definitions;
CREATE POLICY "Authenticated users can create exercise definitions"
  ON exercise_definitions FOR INSERT TO authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Authenticated users can update exercise definitions" ON exercise_definitions;
CREATE POLICY "Authenticated users can update exercise definitions"
  ON exercise_definitions FOR UPDATE TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

INSERT INTO exercise_definitions (
  id,
  name,
  canonical_name,
  aliases,
  muscle_groups,
  tags,
  created_at
) VALUES
  ('home-run', 'Run', 'run', ARRAY['running', 'jog'], ARRAY['full_body'], ARRAY['full_body'], NOW()),
  ('home-push-ups', 'Push Ups', 'push-ups', ARRAY['pushups', 'push up'], ARRAY['chest', 'shoulders', 'triceps'], ARRAY['push', 'upper'], NOW()),
  ('home-squats', 'Squats', 'squats', ARRAY['bodyweight squats'], ARRAY['quads', 'glutes', 'hamstrings'], ARRAY['legs', 'lower'], NOW()),
  ('home-romanian-dead-lifts', 'Romanian Dead Lifts', 'romanian-dead-lifts', ARRAY['rdl', 'rdls'], ARRAY['hamstrings', 'glutes', 'back'], ARRAY['legs', 'lower'], NOW()),
  ('home-sit-ups', 'Sit Ups', 'sit-ups', ARRAY['situps'], ARRAY['core'], ARRAY['core'], NOW()),
  ('home-planks', 'Planks', 'planks', ARRAY['plank'], ARRAY['core'], ARRAY['core'], NOW()),
  ('home-lunges', 'Lunges', 'lunges', ARRAY['bodyweight lunges'], ARRAY['quads', 'glutes', 'hamstrings'], ARRAY['legs', 'lower'], NOW()),
  ('home-burpees', 'Burpees', 'burpees', ARRAY['burpee'], ARRAY['full_body'], ARRAY['compound'], NOW()),
  ('home-pull-ups-rows', 'Pull Ups / Rows', 'pull-ups-rows', ARRAY['pull ups', 'rows', 'inverted rows'], ARRAY['back', 'biceps'], ARRAY['pull', 'upper'], NOW()),
  ('home-jumping-jacks', 'Jumping Jacks', 'jumping-jacks', ARRAY['jumping jack'], ARRAY['full_body'], ARRAY['full_body'], NOW())
ON CONFLICT (canonical_name) DO NOTHING;
