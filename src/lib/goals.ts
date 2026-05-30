import type { Exercise, GoalProgress, WorkoutGoal, WorkoutSession, WorkoutSet } from "@/types";

export const STARTER_GOALS = [
  {
    name: "Abs",
    description: "Build core strength and control with regular focused work.",
    focus_area: "core",
    canonical_exercises: ["ab-wheel-rollout", "lying-leg-lifts", "sit-ups", "plank", "hanging-knee-raise", "cable-crunch"],
  },
  {
    name: "Glutes",
    description: "Prioritize glute strength through hinge, squat, bridge, and kickback patterns.",
    focus_area: "glutes",
    canonical_exercises: ["hip-thrust", "romanian-deadlift", "squat", "icarian-leg-press", "trap-bar-deadlift", "dumbbell-lunge", "glute-bridge", "cable-kickback"],
  },
] as const;

function normalizedFocus(value: string): string {
  const normalized = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_");
  return normalized === "abs" || normalized === "abdominals" ? "core" : normalized;
}

export function inferGoalExerciseIds(goal: Pick<WorkoutGoal, "name" | "focus_area">, exercises: Exercise[]): string[] {
  const focus = normalizedFocus(goal.focus_area || goal.name);
  const starter = STARTER_GOALS.find((item) => item.name.toLowerCase() === goal.name.toLowerCase());
  const preferred = new Set<string>(starter?.canonical_exercises ?? []);
  const focusMuscles: Record<string, string[]> = {
    arms: ["biceps", "triceps"],
    lower: ["legs", "glutes", "hamstrings", "quads", "calves"],
    upper: ["chest", "back", "shoulders", "biceps", "triceps"],
  };
  const targetMuscles = focusMuscles[focus] ?? [focus];
  return exercises
    .filter((exercise) =>
      preferred.has(exercise.canonical_name) ||
      exercise.muscle_groups.some((muscle) => targetMuscles.includes(muscle)) ||
      (focus === "strength" && exercise.tags.includes("compound"))
    )
    .map((exercise) => exercise.id);
}

export function goalAppliesToDay(goal: WorkoutGoal, dayType: string): boolean {
  const focus = normalizedFocus(goal.focus_area || goal.name);
  if (focus === "core") return true;
  if (focus === "glutes" || focus === "quads" || focus === "hamstrings" || focus === "legs") return dayType === "legs";
  if (focus === "chest" || focus === "shoulders" || focus === "triceps") return dayType === "push";
  if (focus === "back" || focus === "biceps") return dayType === "pull";
  if (focus === "arms" || focus === "upper" || focus === "strength") return dayType === "push" || dayType === "pull";
  return true;
}

export function mappedGoalsForExercise(goalList: WorkoutGoal[], exercise: Exercise, dayType?: string): WorkoutGoal[] {
  return goalList.filter((goal) => {
    if (goal.status !== "active" || (dayType && !goalAppliesToDay(goal, dayType))) return false;
    return goal.exercise_ids.includes(exercise.id) || inferGoalExerciseIds(goal, [exercise]).length > 0;
  });
}

export function buildGoalProgress(
  goals: WorkoutGoal[],
  sessions: WorkoutSession[],
  sets: WorkoutSet[],
  exercises: Exercise[]
): GoalProgress[] {
  const exercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));

  return goals.map((goal) => {
    const matched = sets.filter((set) => {
      const exercise = exercisesById.get(set.exercise_id);
      return exercise ? mappedGoalsForExercise([{ ...goal, status: "active" }], exercise).length > 0 : goal.exercise_ids.includes(set.exercise_id);
    });
    const grouped = new Map<string, WorkoutSet[]>();
    matched.forEach((set) => grouped.set(set.session_id, [...(grouped.get(set.session_id) ?? []), set]));
    const recent_sessions = [...grouped.entries()]
      .map(([sessionId, sessionSets]) => ({
        session_id: sessionId,
        date: sessionsById.get(sessionId)?.date ?? sessionSets[0].created_at.split("T")[0],
        set_count: sessionSets.length,
        exercise_names: Array.from(new Set(sessionSets.map((set) => exercisesById.get(set.exercise_id)?.name ?? "Exercise"))),
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4);
    return {
      goal_id: goal.id,
      total_sets: matched.length,
      session_count: grouped.size,
      recent_sessions,
    };
  });
}
