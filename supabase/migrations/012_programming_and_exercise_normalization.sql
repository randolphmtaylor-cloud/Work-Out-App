-- Idempotent programming/exercise normalization. Historical workout_sets are intentionally untouched.

ALTER TABLE IF EXISTS training_phases DROP CONSTRAINT IF EXISTS training_phases_rep_range_check;
ALTER TABLE IF EXISTS training_phases
  ADD CONSTRAINT training_phases_rep_range_check CHECK (rep_range_low <= rep_range_high AND rep_range_high <= 10) NOT VALID;

ALTER TABLE IF EXISTS exercise_definitions
  ADD COLUMN IF NOT EXISTS primary_category TEXT,
  ADD COLUMN IF NOT EXISTS secondary_category TEXT,
  ADD COLUMN IF NOT EXISTS primary_muscles TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS secondary_muscles TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS movement_pattern TEXT,
  ADD COLUMN IF NOT EXISTS exercise_type TEXT,
  ADD COLUMN IF NOT EXISTS environments TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS laterality TEXT,
  ADD COLUMN IF NOT EXISTS tracking_type TEXT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT,
  ADD COLUMN IF NOT EXISTS substitution_ids TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cautions TEXT[] NOT NULL DEFAULT '{}';

INSERT INTO equipment (id, name, canonical_name, aliases, category) VALUES
  ('eq-13','Barbell','barbell',ARRAY['bar'],'free_weight'),
  ('eq-14','Shoulder Press Machine','shoulder-press-machine',ARRAY['machine shoulder press'],'machine'),
  ('eq-15','Iso-Lateral Leg Press Machine','iso-lateral-leg-press-machine',ARRAY['iso leg press'],'machine'),
  ('eq-16','Legend Fitness Lateral Raise Machine','legend-fitness-lateral-raise-machine',ARRAY['machine lateral raise'],'machine')
ON CONFLICT (canonical_name) DO UPDATE SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(equipment.aliases || EXCLUDED.aliases)));

-- Merge the existing seated cable row record into the requested stable display name.
UPDATE exercise_definitions
SET name = 'Seated Row', canonical_name = 'seated-row',
    aliases = (SELECT ARRAY(SELECT DISTINCT unnest(aliases || ARRAY['Seated Cable Row','Seated Rows','Machine Row']))),
    primary_category = 'back', primary_muscles = ARRAY['back'], secondary_muscles = ARRAY['shoulders','biceps'],
    movement_pattern = 'horizontal pull', exercise_type = 'compound', environments = ARRAY['gym'], laterality = 'bilateral', tracking_type = 'weight_reps', difficulty = 'beginner'
WHERE canonical_name IN ('seated-cable-row','seated-row') OR lower(name) IN ('seated cable row','seated row');

INSERT INTO exercise_definitions
  (id,name,canonical_name,aliases,equipment_id,muscle_groups,tags,primary_category,primary_muscles,secondary_muscles,movement_pattern,exercise_type,environments,laterality,tracking_type,difficulty,cautions)
VALUES
  ('ex-zercher-squat','Zercher Squat','zercher-squat',ARRAY['Zercher Squats','Xertcher Squat'],'eq-13',ARRAY['quads','glutes','hamstrings','back','core']::muscle_group[],ARRAY['legs','lower','compound']::workout_tag[],'legs',ARRAY['quads','glutes'],ARRAY['hamstrings','back','core'],'squat','compound',ARRAY['gym'],'bilateral','weight_reps','advanced',ARRAY['Maintain a braced trunk and secure bar position in the elbow crease.']),
  ('ex-machine-shoulder-press','Machine Shoulder Press','machine-shoulder-press',ARRAY['Shoulder Press Machine'],'eq-14',ARRAY['shoulders','triceps']::muscle_group[],ARRAY['push','upper','compound']::workout_tag[],'shoulders',ARRAY['shoulders'],ARRAY['triceps'],'vertical push','compound',ARRAY['gym'],'bilateral','weight_reps','beginner',ARRAY[]::TEXT[]),
  ('ex-iso-lateral-leg-press','Iso-Lateral Leg Press','iso-lateral-leg-press',ARRAY['Iso Leg Press'],'eq-15',ARRAY['quads','glutes','hamstrings']::muscle_group[],ARRAY['legs','lower','compound']::workout_tag[],'legs',ARRAY['quads','glutes'],ARRAY['hamstrings'],'knee-dominant push','compound',ARRAY['gym'],'bilateral','weight_reps','beginner',ARRAY[]::TEXT[]),
  ('ex-legend-fitness-lateral-raise','Legend Fitness Lateral Raise','legend-fitness-lateral-raise',ARRAY['Legend deltoid raise','Machine Lateral Raise'],'eq-16',ARRAY['shoulders']::muscle_group[],ARRAY['push','upper','isolation']::workout_tag[],'shoulders',ARRAY['shoulders'],ARRAY[]::TEXT[],'shoulder abduction','isolation',ARRAY['gym'],'bilateral','weight_reps','beginner',ARRAY[]::TEXT[])
ON CONFLICT (canonical_name) DO UPDATE SET
  name = EXCLUDED.name,
  aliases = (SELECT ARRAY(SELECT DISTINCT unnest(exercise_definitions.aliases || EXCLUDED.aliases))),
  primary_category = EXCLUDED.primary_category,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  movement_pattern = EXCLUDED.movement_pattern,
  exercise_type = EXCLUDED.exercise_type,
  environments = EXCLUDED.environments,
  laterality = EXCLUDED.laterality,
  tracking_type = EXCLUDED.tracking_type,
  difficulty = EXCLUDED.difficulty;

-- Safe whole-library backfill from existing authoritative tags/muscle groups.
UPDATE exercise_definitions SET
  primary_category = COALESCE(primary_category, muscle_groups[1]::TEXT, CASE WHEN 'core' = ANY(tags::TEXT[]) THEN 'core' ELSE 'full_body' END),
  primary_muscles = CASE WHEN cardinality(primary_muscles) = 0 THEN muscle_groups::TEXT[] ELSE primary_muscles END,
  exercise_type = COALESCE(exercise_type, CASE WHEN 'compound' = ANY(tags::TEXT[]) THEN 'compound' ELSE 'isolation' END),
  environments = CASE WHEN cardinality(environments) > 0 THEN environments WHEN 'home' = ANY(tags::TEXT[]) OR equipment_id IS NULL THEN ARRAY['home','gym'] ELSE ARRAY['gym'] END,
  laterality = COALESCE(laterality, CASE WHEN lower(name) LIKE '%plank%' OR lower(name) LIKE '%hold%' THEN 'timed' ELSE 'bilateral' END),
  tracking_type = COALESCE(tracking_type, CASE WHEN lower(name) LIKE '%plank%' OR lower(name) LIKE '%hold%' THEN 'duration' WHEN lower(name) LIKE '%carry%' OR lower(name) = 'run' THEN 'distance' WHEN equipment_id IS NULL THEN 'reps' ELSE 'weight_reps' END),
  difficulty = COALESCE(difficulty, 'intermediate')
WHERE primary_category IS NULL OR cardinality(primary_muscles) = 0 OR exercise_type IS NULL OR cardinality(environments) = 0 OR laterality IS NULL OR tracking_type IS NULL OR difficulty IS NULL;

CREATE INDEX IF NOT EXISTS idx_exercise_definitions_primary_category ON exercise_definitions (primary_category);
CREATE INDEX IF NOT EXISTS idx_exercise_definitions_environments ON exercise_definitions USING gin (environments);
