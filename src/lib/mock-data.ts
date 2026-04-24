// ============================================================
// Mock data — seeded from representative workout history
// Used when Supabase is not configured (placeholder keys)
// In production: replace all data layer calls with Supabase queries
// ============================================================
import {
  Equipment,
  Exercise,
  TrainingPhase,
  WorkoutSession,
  WorkoutSet,
  GeneratedRoutine,
  WeeklySummary,
  ExerciseProgress,
  ConsistencyData,
  PlateauDetection,
} from "@/types";

// ---------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------
export const MOCK_EQUIPMENT: Equipment[] = [
  { id: "eq-1", name: "Cybex Incline Chest Press", canonical_name: "cybex-incline-press", aliases: ["cybex incline"], category: "machine", created_at: "2024-01-01T00:00:00Z" },
  { id: "eq-2", name: "Icarian Leg Press", canonical_name: "icarian-leg-press", aliases: ["icarian","leg press"], category: "machine", created_at: "2024-01-01T00:00:00Z" },
  { id: "eq-3", name: "Hammer Strength Bench Press", canonical_name: "hammer-strength-bench", aliases: ["hammer bench"], category: "machine", created_at: "2024-01-01T00:00:00Z" },
  { id: "eq-4", name: "Pull-Up Bar", canonical_name: "pull-up-bar", aliases: ["pull-ups"], category: "bodyweight", created_at: "2024-01-01T00:00:00Z" },
  { id: "eq-5", name: "Dip Bars", canonical_name: "dip-bars", aliases: ["dips"], category: "bodyweight", created_at: "2024-01-01T00:00:00Z" },
  { id: "eq-6", name: "Cable Machine", canonical_name: "cable-machine", aliases: ["cables"], category: "cable", created_at: "2024-01-01T00:00:00Z" },
  { id: "eq-7", name: "Dumbbells", canonical_name: "dumbbells", aliases: ["dbs","db"], category: "free_weight", created_at: "2024-01-01T00:00:00Z" },
  { id: "eq-8", name: "Trap Bar", canonical_name: "trap-bar", aliases: ["hex bar"], category: "free_weight", created_at: "2024-01-01T00:00:00Z" },
  { id: "eq-9", name: "Ab Wheel", canonical_name: "ab-wheel", aliases: ["ab roller"], category: "bodyweight", created_at: "2024-01-01T00:00:00Z" },
  { id: "eq-10", name: "Leg Extension Machine", canonical_name: "leg-extension-machine", aliases: ["leg extension"], category: "machine", created_at: "2024-01-01T00:00:00Z" },
  { id: "eq-11", name: "Lying Leg Curl Machine", canonical_name: "lying-leg-curl-machine", aliases: ["leg curl"], category: "machine", created_at: "2024-01-01T00:00:00Z" },
  { id: "eq-12", name: "Hammer Strength Row", canonical_name: "hammer-strength-row", aliases: ["hammer row","hs row"], category: "machine", created_at: "2024-01-01T00:00:00Z" },
];

// ---------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------
export const MOCK_EXERCISES: Exercise[] = [
  { id: "ex-1",  name: "Cybex Incline Press",          canonical_name: "cybex-incline-press",          aliases: ["cybex incline"],          equipment_id: "eq-1",  muscle_groups: ["chest","shoulders","triceps"], tags: ["push","upper","compound"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-2",  name: "Hammer Strength Bench",         canonical_name: "hammer-strength-bench",         aliases: ["hammer bench"],           equipment_id: "eq-3",  muscle_groups: ["chest","triceps","shoulders"],tags: ["push","upper","compound"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-3",  name: "Pull-Up",                       canonical_name: "pull-up",                       aliases: ["pullup","chin-up"],        equipment_id: "eq-4",  muscle_groups: ["back","biceps"],              tags: ["pull","upper","compound"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-4",  name: "Dip",                           canonical_name: "dip",                           aliases: ["dips","parallel dip"],     equipment_id: "eq-5",  muscle_groups: ["triceps","chest","shoulders"],tags: ["push","upper","compound"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-5",  name: "Icarian Leg Press",             canonical_name: "icarian-leg-press",             aliases: ["leg press"],               equipment_id: "eq-2",  muscle_groups: ["quads","glutes","hamstrings"],tags: ["legs","lower","compound"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-6",  name: "Cable Fly",                     canonical_name: "cable-fly",                     aliases: ["cable crossover"],         equipment_id: "eq-6",  muscle_groups: ["chest"],                      tags: ["push","upper","isolation"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-7",  name: "Hammer Strength Row",           canonical_name: "hammer-strength-row",           aliases: ["hammer row","hs row"],     equipment_id: "eq-12", muscle_groups: ["back","biceps"],              tags: ["pull","upper","compound"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-8",  name: "Dumbbell Curl",                 canonical_name: "dumbbell-curl",                 aliases: ["db curl"],                 equipment_id: "eq-7",  muscle_groups: ["biceps"],                     tags: ["pull","upper","isolation"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-9",  name: "Tricep Pushdown",               canonical_name: "tricep-pushdown",               aliases: ["cable pushdown"],          equipment_id: "eq-6",  muscle_groups: ["triceps"],                    tags: ["push","upper","isolation"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-10", name: "Ab Wheel Rollout",              canonical_name: "ab-wheel-rollout",              aliases: ["ab rollout"],              equipment_id: "eq-9",  muscle_groups: ["core"],                       tags: ["core","compound"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-11", name: "Trap Bar Deadlift",             canonical_name: "trap-bar-deadlift",             aliases: ["hex bar deadlift"],        equipment_id: "eq-8",  muscle_groups: ["glutes","hamstrings","back","quads"], tags: ["legs","lower","compound"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-12", name: "Leg Extension",                 canonical_name: "leg-extension",                 aliases: ["quad extension"],          equipment_id: "eq-10", muscle_groups: ["quads"],                      tags: ["legs","lower","isolation"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-13", name: "Lying Leg Curl",                canonical_name: "lying-leg-curl",                aliases: ["hamstring curl"],          equipment_id: "eq-11", muscle_groups: ["hamstrings"],                 tags: ["legs","lower","isolation"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-14", name: "Dumbbell Lateral Raise",        canonical_name: "dumbbell-lateral-raise",        aliases: ["lateral raise"],           equipment_id: "eq-7",  muscle_groups: ["shoulders"],                  tags: ["push","upper","isolation"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-15", name: "Dumbbell Shoulder Press",       canonical_name: "dumbbell-shoulder-press",       aliases: ["db ohp","db shoulder"],    equipment_id: "eq-7",  muscle_groups: ["shoulders","triceps"],        tags: ["push","upper","compound"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-16", name: "Lat Pulldown",                  canonical_name: "lat-pulldown",                  aliases: ["pull downs","pulldowns","pull down","lat pulldown","wide grip pulldown"], equipment_id: "eq-6", muscle_groups: ["back","biceps"], tags: ["pull","upper","compound"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-17", name: "Squat",                         canonical_name: "squat",                         aliases: ["squats","bw squats","ssb squat","hatfield squat"], equipment_id: "eq-8", muscle_groups: ["quads","glutes","hamstrings","core"], tags: ["legs","lower","compound"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-18", name: "Seated Row",                    canonical_name: "seated-row",                    aliases: ["seated rows","seated cable row","seated row - mag"], equipment_id: "eq-6", muscle_groups: ["back","biceps"], tags: ["pull","upper","compound"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-19", name: "Back Extension",                canonical_name: "back-extension",                aliases: ["back extensions","45 degree back extension"], muscle_groups: ["back","glutes","hamstrings"], tags: ["lower","compound"], created_at: "2024-01-01T00:00:00Z" },
  { id: "ex-20", name: "Triceps Machine",               canonical_name: "triceps-machine",               aliases: ["icarian triceps","icarian tricepts","triceps machine"], equipment_id: "eq-2", muscle_groups: ["triceps"], tags: ["push","upper","isolation"], created_at: "2024-01-01T00:00:00Z" },
];

// ---------------------------------------------------------------
// Training Phase (active)
// ---------------------------------------------------------------
export const MOCK_ACTIVE_PHASE: TrainingPhase = {
  id: "phase-2",
  user_id: "00000000-0000-4000-8000-000000000001",
  name: "Intensification",
  phase_type: "intensification",
  phase_number: 2,
  start_date: "2026-04-07",
  end_date: "2026-04-27",
  rep_range_low: 5,
  rep_range_high: 8,
  description: "Strength bias — heavier loads, lower reps, compound focus. Goal: push 1RM estimates up across key lifts.",
  is_active: true,
  created_at: "2026-04-07T00:00:00Z",
};

export const MOCK_PHASES: TrainingPhase[] = [
  {
    id: "phase-1",
    user_id: "00000000-0000-4000-8000-000000000001",
    name: "Accumulation",
    phase_type: "accumulation",
    phase_number: 1,
    start_date: "2026-03-17",
    end_date: "2026-04-06",
    rep_range_low: 8,
    rep_range_high: 12,
    description: "Hypertrophy block — moderate loads, higher reps, volume building.",
    is_active: false,
    created_at: "2026-03-17T00:00:00Z",
  },
  MOCK_ACTIVE_PHASE,
];

// ---------------------------------------------------------------
// Workout Sessions (last ~8 weeks)
// ---------------------------------------------------------------
export const MOCK_SESSIONS: WorkoutSession[] = [
  { id: "s-1",  user_id: "00000000-0000-4000-8000-000000000001", date: "2026-04-21", source: "manual", duration_minutes: 28, phase_id: "phase-2", created_at: "2026-04-21T09:00:00Z" },
  { id: "s-2",  user_id: "00000000-0000-4000-8000-000000000001", date: "2026-04-18", source: "manual", duration_minutes: 30, phase_id: "phase-2", created_at: "2026-04-18T09:00:00Z" },
  { id: "s-3",  user_id: "00000000-0000-4000-8000-000000000001", date: "2026-04-15", source: "manual", duration_minutes: 27, phase_id: "phase-2", created_at: "2026-04-15T09:00:00Z" },
  { id: "s-4",  user_id: "00000000-0000-4000-8000-000000000001", date: "2026-04-12", source: "manual", duration_minutes: 29, phase_id: "phase-2", created_at: "2026-04-12T09:00:00Z" },
  { id: "s-5",  user_id: "00000000-0000-4000-8000-000000000001", date: "2026-04-09", source: "manual", duration_minutes: 26, phase_id: "phase-2", created_at: "2026-04-09T09:00:00Z" },
  { id: "s-6",  user_id: "00000000-0000-4000-8000-000000000001", date: "2026-04-05", source: "import_text", duration_minutes: 30, phase_id: "phase-1", created_at: "2026-04-05T09:00:00Z" },
  { id: "s-7",  user_id: "00000000-0000-4000-8000-000000000001", date: "2026-04-01", source: "import_text", duration_minutes: 28, phase_id: "phase-1", created_at: "2026-04-01T09:00:00Z" },
  { id: "s-8",  user_id: "00000000-0000-4000-8000-000000000001", date: "2026-03-28", source: "import_text", duration_minutes: 29, phase_id: "phase-1", created_at: "2026-03-28T09:00:00Z" },
  { id: "s-9",  user_id: "00000000-0000-4000-8000-000000000001", date: "2026-03-25", source: "import_text", duration_minutes: 27, phase_id: "phase-1", created_at: "2026-03-25T09:00:00Z" },
  { id: "s-10", user_id: "00000000-0000-4000-8000-000000000001", date: "2026-03-22", source: "import_text", duration_minutes: 30, phase_id: "phase-1", created_at: "2026-03-22T09:00:00Z" },
  { id: "s-11", user_id: "00000000-0000-4000-8000-000000000001", date: "2026-03-18", source: "import_text", duration_minutes: 25, phase_id: "phase-1", created_at: "2026-03-18T09:00:00Z" },
  { id: "s-12", user_id: "00000000-0000-4000-8000-000000000001", date: "2026-03-14", source: "import_text", duration_minutes: 28, phase_id: "phase-1", created_at: "2026-03-14T09:00:00Z" },
  { id: "s-13", user_id: "00000000-0000-4000-8000-000000000001", date: "2026-03-10", source: "import_text", duration_minutes: 27, phase_id: "phase-1", created_at: "2026-03-10T09:00:00Z" },
  { id: "s-14", user_id: "00000000-0000-4000-8000-000000000001", date: "2026-03-06", source: "import_text", duration_minutes: 29, phase_id: "phase-1", created_at: "2026-03-06T09:00:00Z" },
  { id: "s-15", user_id: "00000000-0000-4000-8000-000000000001", date: "2026-03-02", source: "import_text", duration_minutes: 26, phase_id: "phase-1", created_at: "2026-03-02T09:00:00Z" },
];

// ---------------------------------------------------------------
// Workout Sets
// ---------------------------------------------------------------
export const MOCK_SETS: WorkoutSet[] = [
  // Session s-1: Push day (Apr 21)
  { id: "ws-1",   session_id: "s-1",  exercise_id: "ex-1",  set_number: 1, reps: 6,  weight_lbs: 185, is_warmup: false, created_at: "2026-04-21T09:05:00Z" },
  { id: "ws-2",   session_id: "s-1",  exercise_id: "ex-1",  set_number: 2, reps: 6,  weight_lbs: 185, is_warmup: false, created_at: "2026-04-21T09:08:00Z" },
  { id: "ws-3",   session_id: "s-1",  exercise_id: "ex-1",  set_number: 3, reps: 5,  weight_lbs: 185, is_warmup: false, created_at: "2026-04-21T09:11:00Z" },
  { id: "ws-4",   session_id: "s-1",  exercise_id: "ex-2",  set_number: 1, reps: 6,  weight_lbs: 170, is_warmup: false, created_at: "2026-04-21T09:16:00Z" },
  { id: "ws-5",   session_id: "s-1",  exercise_id: "ex-2",  set_number: 2, reps: 6,  weight_lbs: 170, is_warmup: false, created_at: "2026-04-21T09:19:00Z" },
  { id: "ws-6",   session_id: "s-1",  exercise_id: "ex-4",  set_number: 1, reps: 8,  weight_lbs: undefined, is_warmup: false, created_at: "2026-04-21T09:24:00Z" },
  { id: "ws-7",   session_id: "s-1",  exercise_id: "ex-4",  set_number: 2, reps: 7,  weight_lbs: undefined, is_warmup: false, created_at: "2026-04-21T09:27:00Z" },
  { id: "ws-8",   session_id: "s-1",  exercise_id: "ex-9",  set_number: 1, reps: 12, weight_lbs: 60, is_warmup: false, created_at: "2026-04-21T09:32:00Z" },
  { id: "ws-9",   session_id: "s-1",  exercise_id: "ex-9",  set_number: 2, reps: 12, weight_lbs: 60, is_warmup: false, created_at: "2026-04-21T09:35:00Z" },

  // Session s-2: Pull day (Apr 18)
  { id: "ws-10",  session_id: "s-2",  exercise_id: "ex-3",  set_number: 1, reps: 8,  weight_lbs: undefined, is_warmup: false, created_at: "2026-04-18T09:05:00Z" },
  { id: "ws-11",  session_id: "s-2",  exercise_id: "ex-3",  set_number: 2, reps: 7,  weight_lbs: undefined, is_warmup: false, created_at: "2026-04-18T09:08:00Z" },
  { id: "ws-12",  session_id: "s-2",  exercise_id: "ex-3",  set_number: 3, reps: 6,  weight_lbs: undefined, is_warmup: false, created_at: "2026-04-18T09:11:00Z" },
  { id: "ws-13",  session_id: "s-2",  exercise_id: "ex-7",  set_number: 1, reps: 6,  weight_lbs: 180, is_warmup: false, created_at: "2026-04-18T09:16:00Z" },
  { id: "ws-14",  session_id: "s-2",  exercise_id: "ex-7",  set_number: 2, reps: 6,  weight_lbs: 180, is_warmup: false, created_at: "2026-04-18T09:19:00Z" },
  { id: "ws-15",  session_id: "s-2",  exercise_id: "ex-8",  set_number: 1, reps: 10, weight_lbs: 35, is_warmup: false, created_at: "2026-04-18T09:24:00Z" },
  { id: "ws-16",  session_id: "s-2",  exercise_id: "ex-8",  set_number: 2, reps: 10, weight_lbs: 35, is_warmup: false, created_at: "2026-04-18T09:27:00Z" },
  { id: "ws-17",  session_id: "s-2",  exercise_id: "ex-10", set_number: 1, reps: 8,  weight_lbs: undefined, is_warmup: false, created_at: "2026-04-18T09:32:00Z" },

  // Session s-3: Legs (Apr 15)
  { id: "ws-18",  session_id: "s-3",  exercise_id: "ex-5",  set_number: 1, reps: 6,  weight_lbs: 360, is_warmup: false, created_at: "2026-04-15T09:05:00Z" },
  { id: "ws-19",  session_id: "s-3",  exercise_id: "ex-5",  set_number: 2, reps: 6,  weight_lbs: 360, is_warmup: false, created_at: "2026-04-15T09:09:00Z" },
  { id: "ws-20",  session_id: "s-3",  exercise_id: "ex-5",  set_number: 3, reps: 5,  weight_lbs: 360, is_warmup: false, created_at: "2026-04-15T09:13:00Z" },
  { id: "ws-21",  session_id: "s-3",  exercise_id: "ex-11", set_number: 1, reps: 5,  weight_lbs: 275, is_warmup: false, created_at: "2026-04-15T09:18:00Z" },
  { id: "ws-22",  session_id: "s-3",  exercise_id: "ex-11", set_number: 2, reps: 5,  weight_lbs: 275, is_warmup: false, created_at: "2026-04-15T09:22:00Z" },
  { id: "ws-23",  session_id: "s-3",  exercise_id: "ex-12", set_number: 1, reps: 10, weight_lbs: 100, is_warmup: false, created_at: "2026-04-15T09:28:00Z" },
  { id: "ws-24",  session_id: "s-3",  exercise_id: "ex-13", set_number: 1, reps: 10, weight_lbs: 70,  is_warmup: false, created_at: "2026-04-15T09:33:00Z" },

  // Session s-4 through s-15 abbreviated for brevity — included in consistent data
  { id: "ws-25",  session_id: "s-4",  exercise_id: "ex-1",  set_number: 1, reps: 6,  weight_lbs: 180, is_warmup: false, created_at: "2026-04-12T09:05:00Z" },
  { id: "ws-26",  session_id: "s-4",  exercise_id: "ex-1",  set_number: 2, reps: 6,  weight_lbs: 180, is_warmup: false, created_at: "2026-04-12T09:08:00Z" },
  { id: "ws-27",  session_id: "s-4",  exercise_id: "ex-2",  set_number: 1, reps: 7,  weight_lbs: 165, is_warmup: false, created_at: "2026-04-12T09:14:00Z" },
  { id: "ws-28",  session_id: "s-5",  exercise_id: "ex-3",  set_number: 1, reps: 7,  weight_lbs: undefined, is_warmup: false, created_at: "2026-04-09T09:05:00Z" },
  { id: "ws-29",  session_id: "s-5",  exercise_id: "ex-3",  set_number: 2, reps: 7,  weight_lbs: undefined, is_warmup: false, created_at: "2026-04-09T09:08:00Z" },
  { id: "ws-30",  session_id: "s-5",  exercise_id: "ex-7",  set_number: 1, reps: 7,  weight_lbs: 175, is_warmup: false, created_at: "2026-04-09T09:14:00Z" },
  { id: "ws-31",  session_id: "s-6",  exercise_id: "ex-1",  set_number: 1, reps: 10, weight_lbs: 165, is_warmup: false, created_at: "2026-04-05T09:05:00Z" },
  { id: "ws-32",  session_id: "s-6",  exercise_id: "ex-1",  set_number: 2, reps: 9,  weight_lbs: 165, is_warmup: false, created_at: "2026-04-05T09:08:00Z" },
  { id: "ws-33",  session_id: "s-6",  exercise_id: "ex-1",  set_number: 3, reps: 9,  weight_lbs: 165, is_warmup: false, created_at: "2026-04-05T09:11:00Z" },
  { id: "ws-34",  session_id: "s-7",  exercise_id: "ex-5",  set_number: 1, reps: 12, weight_lbs: 320, is_warmup: false, created_at: "2026-04-01T09:05:00Z" },
  { id: "ws-35",  session_id: "s-7",  exercise_id: "ex-5",  set_number: 2, reps: 12, weight_lbs: 320, is_warmup: false, created_at: "2026-04-01T09:09:00Z" },
  { id: "ws-36",  session_id: "s-8",  exercise_id: "ex-3",  set_number: 1, reps: 6,  weight_lbs: undefined, is_warmup: false, created_at: "2026-03-28T09:05:00Z" },
  { id: "ws-37",  session_id: "s-9",  exercise_id: "ex-1",  set_number: 1, reps: 11, weight_lbs: 155, is_warmup: false, created_at: "2026-03-25T09:05:00Z" },
  { id: "ws-38",  session_id: "s-10", exercise_id: "ex-2",  set_number: 1, reps: 12, weight_lbs: 150, is_warmup: false, created_at: "2026-03-22T09:05:00Z" },
  { id: "ws-39",  session_id: "s-11", exercise_id: "ex-5",  set_number: 1, reps: 12, weight_lbs: 300, is_warmup: false, created_at: "2026-03-18T09:05:00Z" },
  { id: "ws-40",  session_id: "s-12", exercise_id: "ex-1",  set_number: 1, reps: 10, weight_lbs: 155, is_warmup: false, created_at: "2026-03-14T09:05:00Z" },
  { id: "ws-41",  session_id: "s-13", exercise_id: "ex-11", set_number: 1, reps: 8,  weight_lbs: 250, is_warmup: false, created_at: "2026-03-10T09:05:00Z" },
  { id: "ws-42",  session_id: "s-14", exercise_id: "ex-3",  set_number: 1, reps: 5,  weight_lbs: undefined, is_warmup: false, created_at: "2026-03-06T09:05:00Z" },
  { id: "ws-43",  session_id: "s-15", exercise_id: "ex-1",  set_number: 1, reps: 9,  weight_lbs: 145, is_warmup: false, created_at: "2026-03-02T09:05:00Z" },
];

// ---------------------------------------------------------------
// Today's Generated Routine
// ---------------------------------------------------------------
export const MOCK_TODAY_ROUTINE: GeneratedRoutine = {
  id: "routine-today",
  user_id: "00000000-0000-4000-8000-000000000001",
  phase_id: "phase-2",
  generated_at: new Date().toISOString(),
  date: new Date().toISOString().split("T")[0],
  workout_type: "pull",
  warmup: {
    description: "3 min: arm circles, band pull-aparts, shoulder rolls, light lat activation",
    duration_minutes: 3,
  },
  exercises: [
    {
      exercise_id: "ex-3",
      exercise_name: "Pull-Up",
      equipment_name: "Pull-Up Bar",
      sets: 4,
      reps_low: 5,
      reps_high: 8,
      rest_seconds: 90,
      notes: "Aim for 3 working sets after a warm-up set. Full ROM.",
      substitutions: ["Lat Pulldown"],
    },
    {
      exercise_id: "ex-7",
      exercise_name: "Hammer Strength Row",
      equipment_name: "Hammer Strength Row",
      sets: 3,
      reps_low: 5,
      reps_high: 7,
      rest_seconds: 90,
      notes: "Drive elbows back. Squeeze at top.",
    },
    {
      exercise_id: "ex-8",
      exercise_name: "Dumbbell Curl",
      equipment_name: "Dumbbells",
      sets: 3,
      reps_low: 8,
      reps_high: 10,
      rest_seconds: 60,
    },
    {
      exercise_id: "ex-10",
      exercise_name: "Ab Wheel Rollout",
      equipment_name: "Ab Wheel",
      sets: 3,
      reps_low: 8,
      reps_high: 12,
      rest_seconds: 60,
    },
  ],
  estimated_duration_minutes: 28,
  was_completed: false,
  created_at: new Date().toISOString(),
};

// ---------------------------------------------------------------
// Weekly Summary
// ---------------------------------------------------------------
export const MOCK_LATEST_SUMMARY: WeeklySummary = {
  id: "summary-1",
  user_id: "00000000-0000-4000-8000-000000000001",
  week_start: "2026-04-14",
  week_end: "2026-04-20",
  summary_text: `**Strong week.** You hit 3 sessions and stayed within the 30-minute target each time.

**Wins:** Cybex Incline Press moved to 185 lbs — a new working-weight PR. Pull-ups held steady at 8/7/6 reps, which is consistent with your best recent sets.

**Trends:** Your leg press weight climbed from 320 → 360 lbs over the last two weeks. That's a 12% jump — impressive, but watch recovery on the next legs day.

**Flagged:** Shoulder isolation work (lateral raises) hasn't appeared in 2 weeks. Consider adding a set or two on the next push day.

**Next week focus:** Maintain intensity on the incline press. On the pull day, push for 3×8 on pull-ups before adding load.`,
  stats: {
    sessions_completed: 3,
    total_sets: 24,
    total_volume_lbs: 14320,
    exercises_performed: ["Cybex Incline Press", "Hammer Strength Bench", "Dip", "Pull-Up", "Hammer Strength Row", "Icarian Leg Press", "Trap Bar Deadlift"],
    top_lifts: [
      { exercise: "Cybex Incline Press", best_set: "3×6 @ 185 lbs" },
      { exercise: "Icarian Leg Press", best_set: "3×6 @ 360 lbs" },
      { exercise: "Pull-Up", best_set: "8 reps BW" },
    ],
    days_trained: ["2026-04-15", "2026-04-18", "2026-04-21"],
  },
  generated_at: "2026-04-21T10:00:00Z",
  created_at: "2026-04-21T10:00:00Z",
};

// ---------------------------------------------------------------
// Exercise Progress (chart data)
// ---------------------------------------------------------------
export const MOCK_EXERCISE_PROGRESS: ExerciseProgress[] = [
  {
    exercise_id: "ex-1",
    exercise_name: "Cybex Incline Press",
    dates: ["Mar 2","Mar 14","Mar 25","Apr 5","Apr 12","Apr 21"],
    best_weights: [145, 155, 155, 165, 180, 185],
    avg_reps: [9, 10, 11, 9.7, 6, 5.7],
    total_volume: [1305, 1550, 1705, 4815, 2160, 1665],
  },
  {
    exercise_id: "ex-3",
    exercise_name: "Pull-Up",
    dates: ["Mar 6","Mar 28","Apr 9","Apr 18"],
    best_weights: [0, 0, 0, 0],
    avg_reps: [5, 6, 7, 7],
    total_volume: [5, 6, 14, 21],
  },
  {
    exercise_id: "ex-5",
    exercise_name: "Icarian Leg Press",
    dates: ["Mar 18","Apr 1","Apr 15"],
    best_weights: [300, 320, 360],
    avg_reps: [12, 12, 5.7],
    total_volume: [7200, 7680, 5760],
  },
  {
    exercise_id: "ex-11",
    exercise_name: "Trap Bar Deadlift",
    dates: ["Mar 10","Apr 15"],
    best_weights: [250, 275],
    avg_reps: [8, 5],
    total_volume: [2000, 2750],
  },
];

// ---------------------------------------------------------------
// Consistency Data (chart)
// ---------------------------------------------------------------
export const MOCK_CONSISTENCY: ConsistencyData[] = [
  { week: "Feb 24", sessions: 2, target: 3 },
  { week: "Mar 3",  sessions: 3, target: 3 },
  { week: "Mar 10", sessions: 3, target: 3 },
  { week: "Mar 17", sessions: 2, target: 3 },
  { week: "Mar 24", sessions: 3, target: 3 },
  { week: "Mar 31", sessions: 3, target: 3 },
  { week: "Apr 7",  sessions: 2, target: 3 },
  { week: "Apr 14", sessions: 3, target: 3 },
];

// ---------------------------------------------------------------
// Plateau Detection
// ---------------------------------------------------------------
export const MOCK_PLATEAUS: PlateauDetection[] = [
  {
    exercise_name: "Pull-Up",
    weeks_stalled: 3,
    last_pr_date: "2026-03-28",
    last_pr_weight: 0,
    recommendation: "Try weighted pull-ups (+5–10 lbs) or add a 4th set to break through.",
  },
  {
    exercise_name: "Dumbbell Curl",
    weeks_stalled: 2,
    last_pr_date: "2026-04-09",
    last_pr_weight: 35,
    recommendation: "Move to 40 lbs for 2 sets, drop back to 35 lbs for failure set.",
  },
];

// ---------------------------------------------------------------
// Equipment usage frequency
// ---------------------------------------------------------------
export const MOCK_EQUIPMENT_USAGE = [
  { name: "Cybex Incline Press", sessions: 8, percentage: 53 },
  { name: "Pull-Up Bar",         sessions: 5, percentage: 33 },
  { name: "Hammer Strength Row", sessions: 5, percentage: 33 },
  { name: "Icarian Leg Press",   sessions: 4, percentage: 27 },
  { name: "Trap Bar",            sessions: 3, percentage: 20 },
  { name: "Dumbbells",           sessions: 7, percentage: 47 },
  { name: "Cable Machine",       sessions: 4, percentage: 27 },
  { name: "Ab Wheel",            sessions: 3, percentage: 20 },
  { name: "Dip Bars",            sessions: 3, percentage: 20 },
];
