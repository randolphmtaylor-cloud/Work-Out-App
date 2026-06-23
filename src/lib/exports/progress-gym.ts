import type { SessionSnapshot } from "@/components/workout/session-logger";
import type { GeneratedRoutine } from "@/types";
import type { WorkoutSet } from "@/types";

export interface ProgressGymPayload {
  workoutName: string;
  date: string;
  durationMinutes: number;
  bodyweight?: number;
  exercises: Array<{
    name: string;
    sets: Array<{ reps: number; weight?: number }>;
  }>;
}

export function buildProgressGymImportPayload(
  snapshot: SessionSnapshot,
  routine: GeneratedRoutine,
  bodyweight: number | null
): ProgressGymPayload {
  const completedSets = snapshot.loggedSets.filter(
    (s) => s.completed && !snapshot.skippedExerciseIds.has(s.exercise_id)
  );

  const exerciseMap = new Map<string, { name: string; sets: typeof completedSets }>();
  for (const set of completedSets) {
    const prescription = snapshot.plannedExercises.find((ex) => ex.exercise_id === set.exercise_id);
    const name = prescription?.exercise_name ?? set.exercise_id;
    if (!exerciseMap.has(set.exercise_id)) {
      exerciseMap.set(set.exercise_id, { name, sets: [] });
    }
    exerciseMap.get(set.exercise_id)!.sets.push(set);
  }

  const durationMinutes = Math.max(Math.round((Date.now() - snapshot.startTime) / 60000), 1);
  const routineLabel = `${snapshot.workoutType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Day`;

  const exercises = Array.from(exerciseMap.values()).map((ex) => ({
    name: ex.name,
    sets: ex.sets
      .filter((s) => s.reps != null)
      .map((s) => {
        const entry: { reps: number; weight?: number } = { reps: s.reps! };
        if (s.weight_lbs != null) {
          entry.weight = s.weight_lbs;
        } else if (s.bodyweight_lbs != null) {
          entry.weight = s.bodyweight_lbs;
        } else if (bodyweight && bodyweight > 0) {
          entry.weight = bodyweight;
        }
        return entry;
      }),
  }));

  const payload: ProgressGymPayload = {
    workoutName: routineLabel,
    date: snapshot.sessionDate,
    durationMinutes,
    exercises,
  };
  if (bodyweight && bodyweight > 0) payload.bodyweight = bodyweight;
  return payload;
}

export function buildProgressExportFromHistory(
  session: { date: string; workout_type?: string; duration_minutes?: number; notes?: string },
  sets: WorkoutSet[],
  exerciseMap: Map<string, string>
): ProgressGymPayload {
  const bodyweightSet = sets.find((s) => s.bodyweight_lbs != null && s.bodyweight_lbs > 0);
  const sessionBodyweight = bodyweightSet?.bodyweight_lbs ?? null;

  const workoutTypeRaw = session.workout_type ?? (session.notes?.includes("Home Workout") ? "home" : "gym");
  const workoutName =
    workoutTypeRaw
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) + " Workout";

  const grouped = new Map<string, { name: string; sets: WorkoutSet[] }>();
  for (const set of sets) {
    const id = set.exercise_id ?? "unknown";
    if (!grouped.has(id)) {
      grouped.set(id, { name: exerciseMap.get(id) ?? id, sets: [] });
    }
    grouped.get(id)!.sets.push(set);
  }

  const exercises = Array.from(grouped.values()).map((ex) => ({
    name: ex.name,
    sets: ex.sets
      .sort((a, b) => a.set_number - b.set_number)
      .filter((s) => s.reps != null)
      .map((s) => {
        const entry: { reps: number; weight?: number } = { reps: s.reps! };
        if (s.weight_lbs != null) {
          entry.weight = s.weight_lbs;
        } else if (s.bodyweight_lbs != null) {
          entry.weight = s.bodyweight_lbs;
        } else if (sessionBodyweight && sessionBodyweight > 0) {
          entry.weight = sessionBodyweight;
        }
        return entry;
      }),
  }));

  const payload: ProgressGymPayload = {
    workoutName,
    date: session.date,
    durationMinutes: session.duration_minutes ?? 1,
    exercises,
  };
  if (sessionBodyweight && sessionBodyweight > 0) payload.bodyweight = sessionBodyweight;
  return payload;
}
