-- ============================================================
-- Seed Data — Equipment & Exercises
-- Representative of real gym equipment mentioned in user logs
-- ============================================================

-- ---------------------------------------------------------------
-- Equipment
-- ---------------------------------------------------------------
INSERT INTO equipment (canonical_name, name, aliases, category) VALUES
  ('cybex-incline-press',       'Cybex Incline Chest Press',    ARRAY['cybex incline','incline chest machine','cybex incline press machine'], 'machine'),
  ('icarian-leg-press',         'Icarian Leg Press',             ARRAY['icarian leg press','leg press machine','icarian'], 'machine'),
  ('hammer-strength-bench',     'Hammer Strength Bench Press',   ARRAY['hammer strength bench','hammer bench','hs bench press'], 'machine'),
  ('hammer-strength-incline',   'Hammer Strength Incline Press', ARRAY['hammer incline','hs incline'], 'machine'),
  ('hammer-strength-row',       'Hammer Strength Row',           ARRAY['hammer row','hs row','hammer strength iso row'], 'machine'),
  ('hammer-strength-shoulder',  'Hammer Strength Shoulder Press',ARRAY['hammer shoulder press','hs shoulder'], 'machine'),
  ('cable-machine',             'Cable Machine',                 ARRAY['cable','cables','cable stack','functional trainer'], 'cable'),
  ('pull-up-bar',               'Pull-Up Bar',                   ARRAY['pullup bar','chin up bar','pull-ups'], 'bodyweight'),
  ('dip-bars',                  'Dip Bars',                      ARRAY['dips','parallel bars','dip station'], 'bodyweight'),
  ('dumbbells',                 'Dumbbells',                     ARRAY['dbs','db','dumbbell'], 'free_weight'),
  ('barbells',                  'Barbells',                      ARRAY['barbell','bb','olympic bar'], 'free_weight'),
  ('trap-bar',                  'Trap Bar',                      ARRAY['hex bar','trap bar deadlift'], 'free_weight'),
  ('ab-wheel',                  'Ab Wheel',                      ARRAY['ab roller','ab rollout'], 'bodyweight'),
  ('leg-extension-machine',     'Leg Extension Machine',         ARRAY['leg extension','quad extension'], 'machine'),
  ('lying-leg-curl-machine',    'Lying Leg Curl Machine',        ARRAY['leg curl','hamstring curl','lying curl'], 'machine'),
  ('lat-pulldown-machine',      'Lat Pulldown Machine',          ARRAY['lat pulldown','pulldown machine','cable pulldown'], 'machine'),
  ('seated-row-machine',        'Seated Row Machine',            ARRAY['cable row','seated cable row','row machine'], 'machine'),
  ('chest-fly-machine',         'Chest Fly Machine',             ARRAY['pec deck','fly machine','cable fly'], 'machine'),
  ('preacher-curl-machine',     'Preacher Curl Machine',         ARRAY['preacher curl','scott curl'], 'machine'),
  ('tricep-pushdown-cable',     'Tricep Pushdown Cable',         ARRAY['tricep pushdown','cable pushdown','pushdown'], 'cable'),
  ('bodyweight',                'Bodyweight',                    ARRAY['bw','body weight'], 'bodyweight'),
  ('ez-curl-bar',               'EZ Curl Bar',                   ARRAY['ez bar','curl bar'], 'free_weight')
ON CONFLICT (canonical_name) DO NOTHING;

-- ---------------------------------------------------------------
-- Exercises
-- ---------------------------------------------------------------
INSERT INTO exercises (canonical_name, name, aliases, equipment_id, muscle_groups, tags) VALUES
  -- CHEST
  ('cybex-incline-press',      'Cybex Incline Press',     ARRAY['cybex incline','incline machine press'],
    (SELECT id FROM equipment WHERE canonical_name='cybex-incline-press'),
    ARRAY['chest','shoulders','triceps'], ARRAY['push','upper','compound']),

  ('hammer-strength-bench',    'Hammer Strength Bench',   ARRAY['hammer bench','hs flat bench'],
    (SELECT id FROM equipment WHERE canonical_name='hammer-strength-bench'),
    ARRAY['chest','triceps','shoulders'], ARRAY['push','upper','compound']),

  ('hammer-strength-incline',  'Hammer Strength Incline', ARRAY['hammer incline','hs incline press'],
    (SELECT id FROM equipment WHERE canonical_name='hammer-strength-incline'),
    ARRAY['chest','shoulders','triceps'], ARRAY['push','upper','compound']),

  ('dumbbell-flat-press',      'Dumbbell Flat Press',     ARRAY['db bench','db press','dumbbell press'],
    (SELECT id FROM equipment WHERE canonical_name='dumbbells'),
    ARRAY['chest','triceps','shoulders'], ARRAY['push','upper','compound']),

  ('dumbbell-incline-press',   'Dumbbell Incline Press',  ARRAY['db incline','dumbbell incline'],
    (SELECT id FROM equipment WHERE canonical_name='dumbbells'),
    ARRAY['chest','shoulders','triceps'], ARRAY['push','upper','compound']),

  ('cable-fly',                'Cable Fly',               ARRAY['cable crossover','cable chest fly','pec deck'],
    (SELECT id FROM equipment WHERE canonical_name='cable-machine'),
    ARRAY['chest'], ARRAY['push','upper','isolation']),

  -- BACK
  ('pull-up',                  'Pull-Up',                 ARRAY['pullup','chin up','chinup','wide grip pull-up'],
    (SELECT id FROM equipment WHERE canonical_name='pull-up-bar'),
    ARRAY['back','biceps'], ARRAY['pull','upper','compound']),

  ('hammer-strength-row',      'Hammer Strength Row',     ARRAY['hammer row','hs row','iso row'],
    (SELECT id FROM equipment WHERE canonical_name='hammer-strength-row'),
    ARRAY['back','biceps'], ARRAY['pull','upper','compound']),

  ('lat-pulldown',             'Lat Pulldown',            ARRAY['lat pull','cable pulldown','wide lat pulldown'],
    (SELECT id FROM equipment WHERE canonical_name='lat-pulldown-machine'),
    ARRAY['back','biceps'], ARRAY['pull','upper','compound']),

  ('seated-cable-row',         'Seated Cable Row',        ARRAY['cable row','seated row','low row'],
    (SELECT id FROM equipment WHERE canonical_name='seated-row-machine'),
    ARRAY['back','biceps'], ARRAY['pull','upper','compound']),

  ('dumbbell-row',             'Dumbbell Row',            ARRAY['db row','single arm row','one arm row'],
    (SELECT id FROM equipment WHERE canonical_name='dumbbells'),
    ARRAY['back','biceps'], ARRAY['pull','upper','compound']),

  -- SHOULDERS
  ('dumbbell-shoulder-press',  'Dumbbell Shoulder Press', ARRAY['db shoulder press','db ohp','dumbbell ohp'],
    (SELECT id FROM equipment WHERE canonical_name='dumbbells'),
    ARRAY['shoulders','triceps'], ARRAY['push','upper','compound']),

  ('hammer-strength-shoulder-press', 'Hammer Strength Shoulder Press', ARRAY['hammer shoulder','hs ohp'],
    (SELECT id FROM equipment WHERE canonical_name='hammer-strength-shoulder'),
    ARRAY['shoulders','triceps'], ARRAY['push','upper','compound']),

  ('dumbbell-lateral-raise',   'Dumbbell Lateral Raise',  ARRAY['lateral raise','side raise','db lateral'],
    (SELECT id FROM equipment WHERE canonical_name='dumbbells'),
    ARRAY['shoulders'], ARRAY['push','upper','isolation']),

  ('cable-lateral-raise',      'Cable Lateral Raise',     ARRAY['cable side raise','cable lateral'],
    (SELECT id FROM equipment WHERE canonical_name='cable-machine'),
    ARRAY['shoulders'], ARRAY['push','upper','isolation']),

  -- BICEPS
  ('dumbbell-curl',            'Dumbbell Curl',           ARRAY['db curl','dumbbell bicep curl','alternating curl'],
    (SELECT id FROM equipment WHERE canonical_name='dumbbells'),
    ARRAY['biceps'], ARRAY['pull','upper','isolation']),

  ('cable-curl',               'Cable Curl',              ARRAY['cable bicep curl','rope curl','bar cable curl'],
    (SELECT id FROM equipment WHERE canonical_name='cable-machine'),
    ARRAY['biceps'], ARRAY['pull','upper','isolation']),

  ('preacher-curl',            'Preacher Curl',           ARRAY['scott curl','preacher machine curl'],
    (SELECT id FROM equipment WHERE canonical_name='preacher-curl-machine'),
    ARRAY['biceps'], ARRAY['pull','upper','isolation']),

  -- TRICEPS
  ('dip',                      'Dip',                     ARRAY['parallel bar dip','chest dip','tricep dip'],
    (SELECT id FROM equipment WHERE canonical_name='dip-bars'),
    ARRAY['triceps','chest','shoulders'], ARRAY['push','upper','compound']),

  ('tricep-pushdown',          'Tricep Pushdown',         ARRAY['cable pushdown','rope pushdown','bar pushdown'],
    (SELECT id FROM equipment WHERE canonical_name='tricep-pushdown-cable'),
    ARRAY['triceps'], ARRAY['push','upper','isolation']),

  ('overhead-tricep-extension', 'Overhead Tricep Extension', ARRAY['overhead extension','skull crushers','cable overhead tricep'],
    (SELECT id FROM equipment WHERE canonical_name='cable-machine'),
    ARRAY['triceps'], ARRAY['push','upper','isolation']),

  -- LEGS
  ('icarian-leg-press',        'Icarian Leg Press',       ARRAY['leg press','leg press machine'],
    (SELECT id FROM equipment WHERE canonical_name='icarian-leg-press'),
    ARRAY['quads','glutes','hamstrings'], ARRAY['legs','lower','compound']),

  ('leg-extension',            'Leg Extension',           ARRAY['quad extension','leg ext'],
    (SELECT id FROM equipment WHERE canonical_name='leg-extension-machine'),
    ARRAY['quads'], ARRAY['legs','lower','isolation']),

  ('lying-leg-curl',           'Lying Leg Curl',          ARRAY['hamstring curl','leg curl','lying curl'],
    (SELECT id FROM equipment WHERE canonical_name='lying-leg-curl-machine'),
    ARRAY['hamstrings'], ARRAY['legs','lower','isolation']),

  ('trap-bar-deadlift',        'Trap Bar Deadlift',       ARRAY['hex bar deadlift','trap bar dl'],
    (SELECT id FROM equipment WHERE canonical_name='trap-bar'),
    ARRAY['glutes','hamstrings','back','quads'], ARRAY['legs','lower','compound']),

  ('barbell-squat',            'Barbell Squat',           ARRAY['back squat','squat'],
    (SELECT id FROM equipment WHERE canonical_name='barbells'),
    ARRAY['quads','glutes','hamstrings'], ARRAY['legs','lower','compound']),

  ('dumbbell-lunge',           'Dumbbell Lunge',          ARRAY['db lunge','walking lunge','reverse lunge'],
    (SELECT id FROM equipment WHERE canonical_name='dumbbells'),
    ARRAY['quads','glutes','hamstrings'], ARRAY['legs','lower','compound']),

  -- CORE
  ('ab-wheel-rollout',         'Ab Wheel Rollout',        ARRAY['ab rollout','ab wheel','rollout'],
    (SELECT id FROM equipment WHERE canonical_name='ab-wheel'),
    ARRAY['core'], ARRAY['core','compound']),

  ('plank',                    'Plank',                   ARRAY['forearm plank','plank hold'],
    (SELECT id FROM equipment WHERE canonical_name='bodyweight'),
    ARRAY['core'], ARRAY['core','isolation']),

  ('cable-crunch',             'Cable Crunch',            ARRAY['rope crunch','cable ab crunch'],
    (SELECT id FROM equipment WHERE canonical_name='cable-machine'),
    ARRAY['core'], ARRAY['core','isolation']),

  ('hanging-leg-raise',        'Hanging Leg Raise',       ARRAY['leg raise','hanging knee raise'],
    (SELECT id FROM equipment WHERE canonical_name='pull-up-bar'),
    ARRAY['core'], ARRAY['core','compound'])

ON CONFLICT (canonical_name) DO NOTHING;
