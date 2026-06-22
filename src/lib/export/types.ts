// ─────────────────────────────────────────────────────────────────────────────
// Shared activity export contract
//
// Gym Sessions writes DailyActivityExport records to the `activity_exports`
// Supabase table. The Progress App reads them via its WorkoutAdapter.
// Future apps (Timer Stacks, Work Todos, Reading Tracker, etc.) should export
// the same shape so the Progress App can consume any source generically.
// ─────────────────────────────────────────────────────────────────────────────

export interface DailyActivityExport {
  /** Identifies the producing app, e.g. 'gym-sessions'. */
  source: string;

  /** Unique ID of the source record (workout_sessions.id). Used for dedup. */
  sourceRecordId: string;

  /** ISO date string YYYY-MM-DD — the day the activity occurred. */
  date: string;

  /** Short display title, e.g. "Push Day Workout". */
  title: string;

  /** Markdown-formatted summary shown in daily notes. */
  content: string;

  /** Numeric / boolean metrics for the reporting engine. */
  metrics: WorkoutMetrics;
}

export interface WorkoutMetrics {
  workoutCompleted: boolean;
  workoutDurationMinutes: number;
  workoutVolume: number;
  bodyweight?: number;
  exercisesCompleted: number;
  setsCompleted: number;
  repsCompleted: number;
  [key: string]: number | string | boolean | undefined;
}

/** Shape stored in the `activity_exports.metrics` JSONB column. */
export type ActivityMetrics = Record<string, number | string | boolean | null>;
