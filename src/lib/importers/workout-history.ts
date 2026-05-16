import workoutHistory from "@/data/workout-history.json";
import { createUnreviewedExercise, getActivePhase, getExercises, insertSessionWithSetsIfNew } from "@/lib/data";
import { normalizeExerciseName } from "@/lib/parsers/normalize";
import type { Exercise, WorkoutSession, WorkoutSet } from "@/types";

interface BundledSet {
  reps: number;
  weight_lbs?: number;
  bodyweight_lbs?: number;
  is_warmup: boolean;
}

interface BundledExercise {
  name: string;
  raw_name: string;
  is_warmup: boolean;
  sets: BundledSet[];
}

interface BundledWorkout {
  source_id: string;
  date: string;
  title: string;
  raw_header: string;
  notes?: string;
  exercises: BundledExercise[];
}

interface BundledWorkoutHistory {
  document_id: string;
  title: string;
  source_filename: string;
  generated_at: string;
  date_assumptions: string;
  workouts: BundledWorkout[];
}

export interface WorkoutHistoryImportResult {
  imported_sessions: number;
  skipped_duplicates: number;
  imported_sets: number;
  unreviewed_created: string[];
  errors: string[];
}

const history = workoutHistory as BundledWorkoutHistory;

function buildExerciseMap(exercises: Exercise[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const exercise of exercises) {
    map.set(exercise.canonical_name, exercise.id);
    map.set(exercise.name.toLowerCase(), exercise.id);
    for (const alias of exercise.aliases) {
      map.set(alias.toLowerCase(), exercise.id);
    }
  }
  return map;
}

function rawWorkoutText(workout: BundledWorkout) {
  const lines = [workout.raw_header];
  for (const exercise of workout.exercises) {
    const setText = exercise.sets
      .map((set) => {
        const weight = set.weight_lbs ?? "BW";
        return `${weight}x1x${set.reps}`;
      })
      .join(" ");
    lines.push(`${exercise.raw_name}: ${setText}`);
  }
  if (workout.notes) lines.push(workout.notes);
  return lines.join("\n");
}

export async function importBundledWorkoutHistory(userId: string): Promise<WorkoutHistoryImportResult> {
  const exercises = await getExercises();
  const exerciseMap = buildExerciseMap(exercises);
  const phase = await getActivePhase(userId);
  const importedAt = new Date().toISOString();
  const createdUnreviewed = new Set<string>();
  const errors: string[] = [];
  let importedSessions = 0;
  let skippedDuplicates = 0;
  let importedSets = 0;

  for (const workout of history.workouts) {
    const sessionId = crypto.randomUUID();
    const sets: WorkoutSet[] = [];
    let sessionSetIndex = 0;

    for (const exercise of workout.exercises) {
      const normalized = normalizeExerciseName(exercise.name, exercises);
      let exerciseId = normalized.canonical_name ? exerciseMap.get(normalized.canonical_name) : undefined;

      if (!exerciseId) {
        try {
          const created = await createUnreviewedExercise(exercise.name, [exercise.raw_name, exercise.name]);
          exerciseId = created.exercise.id;
          exerciseMap.set(created.exercise.canonical_name, created.exercise.id);
          exerciseMap.set(created.exercise.name.toLowerCase(), created.exercise.id);
          for (const alias of created.exercise.aliases) {
            exerciseMap.set(alias.toLowerCase(), created.exercise.id);
          }
          if (created.created) createdUnreviewed.add(created.exercise.name);
        } catch (error) {
          errors.push(`Could not create exercise "${exercise.name}" for ${workout.raw_header}`);
          continue;
        }
      }

      if (!exerciseId) {
        errors.push(`Could not resolve exercise "${exercise.name}" for ${workout.raw_header}`);
        continue;
      }

      let exerciseSetIndex = 0;
      for (const set of exercise.sets) {
        sessionSetIndex += 1;
        exerciseSetIndex += 1;
        sets.push({
          id: crypto.randomUUID(),
          session_id: sessionId,
          exercise_id: exerciseId,
          set_number: exerciseSetIndex,
          reps: set.reps,
          weight_lbs: set.weight_lbs,
          bodyweight_lbs: set.bodyweight_lbs,
          is_warmup: set.is_warmup,
          notes: set.bodyweight_lbs !== undefined ? "bodyweight" : undefined,
          source_id: `${workout.source_id}:set:${String(sessionSetIndex).padStart(3, "0")}`,
          import_batch: history.document_id,
          imported_at: importedAt,
          created_at: importedAt,
        });
      }
    }

    const session: WorkoutSession = {
      id: sessionId,
      user_id: userId,
      date: workout.date,
      source: "import_docx",
      raw_text: rawWorkoutText(workout),
      notes: `Imported from ${history.source_filename}: ${workout.title}`,
      phase_id: phase?.id,
      source_id: workout.source_id,
      import_batch: history.document_id,
      imported_at: importedAt,
      created_at: importedAt,
    };

    const result = await insertSessionWithSetsIfNew(session, sets);
    if (result.skipped) {
      skippedDuplicates += 1;
      continue;
    }
    if (!result.inserted || result.error) {
      errors.push(`${workout.raw_header}: ${result.error ?? "Import failed"}`);
      continue;
    }

    importedSessions += 1;
    importedSets += result.setsInserted;
  }

  return {
    imported_sessions: importedSessions,
    skipped_duplicates: skippedDuplicates,
    imported_sets: importedSets,
    unreviewed_created: Array.from(createdUnreviewed),
    errors,
  };
}

export function getBundledWorkoutHistorySummary() {
  return {
    document_id: history.document_id,
    source_filename: history.source_filename,
    workouts: history.workouts.length,
    sets: history.workouts.reduce(
      (total, workout) =>
        total + workout.exercises.reduce((exerciseTotal, exercise) => exerciseTotal + exercise.sets.length, 0),
      0
    ),
    date_assumptions: history.date_assumptions,
  };
}
