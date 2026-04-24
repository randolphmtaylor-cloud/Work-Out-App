// ============================================================
// Core domain types for the Gym Sessions app
// ============================================================

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "glutes"
  | "hamstrings"
  | "quads"
  | "calves"
  | "core"
  | "full_body";

export type WorkoutTag =
  | "push"
  | "pull"
  | "legs"
  | "upper"
  | "lower"
  | "full_body"
  | "core"
  | "compound"
  | "isolation";

export type EquipmentCategory =
  | "machine"
  | "free_weight"
  | "bodyweight"
  | "cable"
  | "cardio"
  | "other";

export type PhaseType = "accumulation" | "intensification" | "density";

export type WorkoutSource = "import_text" | "import_docx" | "import_xlsx" | "manual" | "generated";
export type ExerciseStatus = "active" | "unreviewed";

// ---------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------
export interface Equipment {
  id: string;
  name: string;
  canonical_name: string;
  aliases: string[];
  category: EquipmentCategory;
  notes?: string;
  created_at: string;
}

// ---------------------------------------------------------------
// Exercise
// ---------------------------------------------------------------
export interface Exercise {
  id: string;
  name: string;
  canonical_name: string;
  aliases: string[];
  status?: ExerciseStatus;
  equipment_id?: string;
  equipment?: Equipment;
  muscle_groups: MuscleGroup[];
  tags: WorkoutTag[];
  notes?: string;
  created_at: string;
}

// ---------------------------------------------------------------
// Training Phase
// ---------------------------------------------------------------
export interface TrainingPhase {
  id: string;
  user_id: string;
  name: string;
  phase_type: PhaseType;
  phase_number: number;
  start_date: string; // ISO date
  end_date: string;
  rep_range_low: number;
  rep_range_high: number;
  description: string;
  is_active: boolean;
  created_at: string;
}

// ---------------------------------------------------------------
// Workout Session
// ---------------------------------------------------------------
export interface WorkoutSession {
  id: string;
  user_id: string;
  date: string; // ISO date
  notes?: string;
  source: WorkoutSource;
  raw_text?: string;
  duration_minutes?: number;
  phase_id?: string;
  phase?: TrainingPhase;
  sets?: WorkoutSet[];
  created_at: string;
}

// ---------------------------------------------------------------
// Workout Set
// ---------------------------------------------------------------
export interface WorkoutSet {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise?: Exercise;
  set_number: number;
  reps?: number;
  weight_lbs?: number;
  bodyweight_lbs?: number;
  notes?: string;
  is_warmup: boolean;
  rpe?: number; // Rate of Perceived Exertion 1–10
  created_at: string;
}

// ---------------------------------------------------------------
// Generated Routine
// ---------------------------------------------------------------
export interface ExercisePrescription {
  exercise_id: string;
  exercise_name: string;
  equipment_name?: string;
  sets: number;
  reps_low: number;
  reps_high: number;
  rest_seconds: number;
  notes?: string;
  substitutions?: string[]; // exercise names if equipment unavailable
}

export interface GeneratedRoutine {
  id: string;
  user_id: string;
  phase_id?: string;
  generated_at: string;
  date: string;
  workout_type: WorkoutTag;
  warmup: { description: string; duration_minutes: number };
  exercises: ExercisePrescription[];
  estimated_duration_minutes: number;
  was_completed: boolean;
  completed_session_id?: string;
  created_at: string;
}

// ---------------------------------------------------------------
// Weekly Summary
// ---------------------------------------------------------------
export interface WeeklySummaryStats {
  sessions_completed: number;
  total_sets: number;
  total_volume_lbs: number;
  exercises_performed: string[];
  top_lifts: Array<{ exercise: string; best_set: string }>;
  days_trained: string[];
}

export interface WeeklySummary {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  summary_text: string;
  stats: WeeklySummaryStats;
  generated_at: string;
  created_at: string;
}

// ---------------------------------------------------------------
// Import
// ---------------------------------------------------------------
export interface ImportLog {
  id: string;
  user_id: string;
  filename?: string;
  file_type: "text" | "docx" | "xlsx" | "csv";
  raw_content?: string;
  parsed_sessions: number;
  status: "pending" | "processing" | "success" | "error";
  errors?: Array<{ line?: number; message: string }>;
  created_at: string;
}

// ---------------------------------------------------------------
// Analytics helpers
// ---------------------------------------------------------------
export interface ExerciseProgress {
  exercise_id: string;
  exercise_name: string;
  dates: string[];
  best_weights: number[];
  avg_reps: number[];
  total_volume: number[];
}

export interface ConsistencyData {
  week: string;
  sessions: number;
  target: number;
}

export interface PlateauDetection {
  exercise_name: string;
  weeks_stalled: number;
  last_pr_date: string;
  last_pr_weight: number;
  recommendation: string;
}

// ---------------------------------------------------------------
// AI Chat
// ---------------------------------------------------------------
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// ---------------------------------------------------------------
// SYSTEMS PROGRESS APP — Future Integration Point
// When connecting to Systems Progress App, expose these types
// via a shared API contract (versioned REST or tRPC router).
// ---------------------------------------------------------------
export interface WorkoutMetricExport {
  user_id: string;
  week_start: string;
  sessions: number;
  volume_lbs: number;
  top_exercises: string[];
  phase_name: string;
  summary: string;
}
