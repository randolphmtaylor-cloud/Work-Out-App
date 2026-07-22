// ============================================================
// Routine Generation Engine — v2
//
// Design goals:
//   • 30-minute hard cap (warmup + sets × time-per-set)
//   • Bias toward historically used exercises
//   • Avoid repeating the same exercise selection 2 sessions in a row
//   • History-aware day-type rotation (push → pull → legs)
//   • Real progression: suggest weight based on last set + trend
//   • Per-exercise time budgets (compounds take longer)
// ============================================================
import {
  TrainingPhase,
  WorkoutSet,
  WorkoutSession,
  GeneratedRoutine,
  ExercisePrescription,
  WorkoutTag,
  Exercise,
  WorkoutGoal,
} from "@/types";
import { MOCK_EXERCISES, MOCK_EQUIPMENT } from "@/lib/mock-data";
import { getSimilarWorkouts } from "@/lib/workout-repository";
import { mappedGoalsForExercise } from "@/lib/goals";

// ---- Timing constants ----
const WARMUP_MINUTES = 3;
const MAX_SESSION_MINUTES = 30;
// Per-set time by exercise type (minutes): compound = 3 min (set + rest), isolation = 2 min
const SET_TIME: Record<string, number> = {
  compound:  3.0,
  isolation: 2.0,
};

// ---- Phase configs ----
const PHASE_CONFIGS = {
  accumulation: {
    compound_sets: 3, isolation_sets: 3,
    reps_low: 6,  reps_high: 10,
    compound_rest: 75, isolation_rest: 60,
    max_exercises: 5,
  },
  intensification: {
    compound_sets: 4, isolation_sets: 3,
    reps_low: 5,  reps_high: 8,
    compound_rest: 90, isolation_rest: 75,
    max_exercises: 4,
  },
  density: {
    compound_sets: 3, isolation_sets: 3,
    reps_low: 8, reps_high: 10,
    compound_rest: 60, isolation_rest: 45,
    max_exercises: 5,
  },
} as const;

// ---- Day type rotation ----
const DAY_TYPES: WorkoutTag[] = ["upper", "lower"];

const TARGET_MUSCLES: Record<string, string[]> = {
  upper: ["chest", "shoulders", "triceps", "back", "biceps"],
  lower: ["quads", "hamstrings", "glutes", "core"],
};

const WARMUP_TEXT: Record<string, string> = {
  upper: "3 min: arm circles, shoulder rolls, band pull-aparts, and a feeder set for the first push/pull pair",
  lower: "3 min: leg swings, hip circles, bodyweight squats, then a feeder set for the first compound",
};

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

/** Next day type based on the actual session history (not just count).
 *  Home workouts are intentionally excluded so they don't shift the gym rotation. */
function nextDayType(recentSessions: WorkoutSession[]): WorkoutTag {
  // Only gym/planned sessions count toward the push→pull→legs rotation.
  // Home workouts are logged as history but must not advance the planned rotation.
  const gymSessions = recentSessions.filter((s) => s.workout_type !== "home");
  const last = gymSessions[0];
  if (!last) return "upper";

  // Try to infer from session notes
  if (last.notes) {
    for (const t of DAY_TYPES) {
      if (last.notes.toLowerCase().includes(t)) {
        const next = DAY_TYPES[(DAY_TYPES.indexOf(t) + 1) % DAY_TYPES.length];
        return next;
      }
    }
  }

  // Round-robin based on gym-session count mod 3
  const idx = gymSessions.length % DAY_TYPES.length;
  return DAY_TYPES[idx];
}

/** Muscles trained in the last N hours */
function recentlyTrainedMuscles(
  sessions: WorkoutSession[],
  sets: WorkoutSet[],
  hours = 48
): Set<string> {
  const cutoff = Date.now() - hours * 3600 * 1000;
  const recentSessionIds = new Set(
    sessions.filter((s) => new Date(s.date + "T23:59:00").getTime() > cutoff).map((s) => s.id)
  );
  const muscles = new Set<string>();
  for (const s of sets) {
    if (!recentSessionIds.has(s.session_id)) continue;
    const ex = MOCK_EXERCISES.find((e) => e.id === s.exercise_id);
    ex?.muscle_groups.forEach((m) => muscles.add(m));
  }
  return muscles;
}

/** Exercises used in the most recent session — to drive variety */
function exercisesInLastSession(
  sessions: WorkoutSession[],
  sets: WorkoutSet[]
): Set<string> {
  const last = sessions[0];
  if (!last) return new Set();
  return new Set(
    sets.filter((s) => s.session_id === last.id).map((s) => s.exercise_id ?? "")
  );
}

/** How many times each exercise has been performed — for frequency bias */
function exerciseFrequency(sets: WorkoutSet[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const s of sets) {
    if (!s.exercise_id) continue;
    freq.set(s.exercise_id, (freq.get(s.exercise_id) ?? 0) + 1);
  }
  return freq;
}

/** Best recent set for an exercise (last 6 weeks) */
function bestRecentSet(exerciseId: string, sets: WorkoutSet[], sessions: WorkoutSession[]): WorkoutSet | null {
  const sixWeeksAgo = new Date();
  sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
  const recentSessionIds = new Set(
    sessions.filter((s) => new Date(s.date) >= sixWeeksAgo).map((s) => s.id)
  );
  const exSets = sets
    .filter((s) => s.exercise_id === exerciseId && recentSessionIds.has(s.session_id) && !s.is_warmup)
    .sort((a, b) => {
      // Sort by estimated 1RM descending
      const aEst = (a.weight_lbs ?? 0) / (1.0278 - 0.0278 * Math.min(a.reps ?? 1, 36));
      const bEst = (b.weight_lbs ?? 0) / (1.0278 - 0.0278 * Math.min(b.reps ?? 1, 36));
      return bEst - aEst;
    });
  return exSets[0] ?? null;
}

/** Suggest next target weight: add 5 lbs if user hit top of rep range last time */
function suggestWeight(lastSet: WorkoutSet | null, repsHigh: number): number | null {
  if (!lastSet?.weight_lbs) return null;
  const hitTop = (lastSet.reps ?? 0) >= repsHigh;
  const increment = lastSet.weight_lbs >= 135 ? 5 : 2.5;
  return hitTop ? Math.round((lastSet.weight_lbs + increment) / 2.5) * 2.5 : lastSet.weight_lbs;
}

/** Minutes a single exercise will consume: (sets × time-per-set) */
function exerciseMinutes(ex: Exercise, sets: number): number {
  const isCompound = ex.tags.includes("compound");
  return sets * (isCompound ? SET_TIME.compound : SET_TIME.isolation);
}

// ---------------------------------------------------------------
// Main export
// ---------------------------------------------------------------
export interface RoutineGenerationInput {
  phase: TrainingPhase;
  recentSessions: WorkoutSession[];
  allSets: WorkoutSet[];
  workoutType?: WorkoutTag;
  userId: string;
  exercises?: Exercise[];
  equipment?: Array<{ id: string; name: string }>;
  activeGoals?: WorkoutGoal[];
}

export function generateRoutine(input: RoutineGenerationInput): GeneratedRoutine {
  const { phase, recentSessions, allSets, userId } = input;
  const library = (input.exercises?.length ? input.exercises : MOCK_EXERCISES).filter((exercise) => exercise.status !== "archived");
  const equipmentLibrary = input.equipment?.length ? input.equipment : MOCK_EQUIPMENT;
  const cfg = PHASE_CONFIGS[phase.phase_type] ?? PHASE_CONFIGS.accumulation;

  const requestedType = input.workoutType;
  const dayType: WorkoutTag = requestedType === "push" || requestedType === "pull" || requestedType === "upper"
    ? "upper"
    : requestedType === "legs" || requestedType === "core" || requestedType === "lower"
      ? "lower"
      : nextDayType(recentSessions);
  const activeGoals = (input.activeGoals ?? []).filter((goal) => goal.status === "active");
  const targetMuscles = new Set(TARGET_MUSCLES[dayType] ?? TARGET_MUSCLES.upper);
  const recentMuscles = recentlyTrainedMuscles(recentSessions, allSets);
  const lastSessionExercises = exercisesInLastSession(recentSessions, allSets);
  const freq = exerciseFrequency(allSets);
  const goalsForExercise = (exercise: Exercise) => mappedGoalsForExercise(activeGoals, exercise, dayType);
  const attributedCoreChoice =
    library.find((exercise) => exercise.tags.includes("core") && !exercise.tags.includes("compound") && goalsForExercise(exercise).length > 0 && !lastSessionExercises.has(exercise.id)) ??
    library.find((exercise) => exercise.tags.includes("core") && goalsForExercise(exercise).length > 0 && !lastSessionExercises.has(exercise.id)) ??
    library.find((exercise) => exercise.tags.includes("core") && goalsForExercise(exercise).length > 0);

  // Filter to exercises that match today's workout type.
  // When an exercise carries an explicit day tag (legs/lower/push/pull), that tag
  // takes precedence over muscle-group overlap — this prevents a Legs exercise that
  // happens to train the back (e.g. Trap Bar Deadlift) from appearing on Pull Day.
  const candidates = library.filter((ex) => {
    const hasLegTag  = ex.tags.some((t) => t === "legs" || t === "lower");
    const hasPushTag = ex.tags.includes("push");
    const hasPullTag = ex.tags.includes("pull");

    if (dayType === "lower") return hasLegTag || ex.tags.includes("core");
    if (dayType === "upper") return (hasPushTag || hasPullTag) && !hasLegTag;

    // Fallback: match by muscle groups for exercises without explicit day tags
    const muscles = new Set<string>(ex.muscle_groups);
    return [...targetMuscles].some((m) => muscles.has(m));
  });

  // Score each exercise
  const scored = candidates.map((ex) => {
    let score = 0;

    // Strong preference for exercises we've done before
    const timesUsed = freq.get(ex.id) ?? 0;
    score += Math.min(timesUsed * 3, 30); // cap at 30 pts

    // Penalise if we did this exact exercise last session (variety)
    if (lastSessionExercises.has(ex.id)) score -= 15;

    // Prefer compound movements
    if (ex.tags.includes("compound")) score += 10;

    // Goal work supplements the normal day structure when it fits today's focus.
    if (goalsForExercise(ex).length > 0) score += 1000;

    // Mild penalty if muscles trained within 48h (allowed for compounds)
    const muscleOverlap = [...ex.muscle_groups].some((m) => recentMuscles.has(m));
    if (muscleOverlap && !ex.tags.includes("compound")) score -= 20;

    // Slight randomisation so we don't always pick identical order
    score += Math.random() * 5;

    return { ex, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Build the prescription within the 30-min budget
  const budgetMinutes = MAX_SESSION_MINUTES - WARMUP_MINUTES;
  const goalCoreReserveMinutes = attributedCoreChoice ? exerciseMinutes(attributedCoreChoice, 3) : 0;
  let minutesUsed = 0;
  const prescriptions: ExercisePrescription[] = [];
  let compoundAdded = 0;
  let isolationAdded = 0;
  const upperRoles = new Set<string>();

  // Target: 2-3 compounds, 1-2 isolations, 1 core
  const maxCompound = 2;
  const maxIsolation = cfg.max_exercises - maxCompound - 1; // -1 for core

  for (const { ex } of scored) {
    if (prescriptions.length >= cfg.max_exercises - 1) break; // leave room for core

    const isCompound = ex.tags.includes("compound");
    const isCore = ex.tags.includes("core");
    if (isCore) continue; // added at end

    let upperRole: string | undefined;
    if (dayType === "upper") {
      const direction = ex.tags.includes("push") ? "push" : ex.tags.includes("pull") ? "pull" : "other";
      upperRole = `${direction}-${isCompound ? "compound" : "isolation"}`;
      if (direction === "other" || upperRoles.has(upperRole)) continue;
    }

    if (isCompound && compoundAdded >= maxCompound) continue;
    if (!isCompound && isolationAdded >= maxIsolation) continue;

    const sets = isCompound ? cfg.compound_sets : cfg.isolation_sets;
    const mins = exerciseMinutes(ex, sets);
    if (minutesUsed + mins > budgetMinutes - goalCoreReserveMinutes) continue;

    const lastSet = bestRecentSet(ex.id, allSets, recentSessions);
    const targetWeight = suggestWeight(lastSet, cfg.reps_high);
    const equipment = equipmentLibrary.find((e) => e.id === ex.equipment_id);
    const matchedGoals = goalsForExercise(ex);

    let note: string | undefined;
    if (targetWeight && lastSet?.weight_lbs) {
      if (targetWeight > lastSet.weight_lbs) {
        note = `Up to ${targetWeight} lbs today (+${targetWeight - lastSet.weight_lbs} lbs)`;
      } else {
        note = `Hold at ${targetWeight} lbs — hit ${cfg.reps_high} clean reps to earn the jump`;
      }
    } else if (lastSet && !lastSet.weight_lbs) {
      note = `Last time: ${lastSet.reps} reps BW — aim for ${(lastSet.reps ?? 0) + 1}+`;
    }

    prescriptions.push({
      exercise_id: ex.id,
      exercise_name: ex.name,
      equipment_name: equipment?.name,
      sets,
      reps_low: isCompound && phase.phase_type === "intensification" ? 4 : isCompound ? cfg.reps_low : 8,
      reps_high: Math.min(10, cfg.reps_high),
      tracking_type: ex.tracking_type ?? (equipment ? "weight_reps" : "reps"),
      rest_seconds: isCompound ? cfg.compound_rest : cfg.isolation_rest,
      notes: note,
      goal_ids: matchedGoals.map((goal) => goal.id),
      goal_names: matchedGoals.map((goal) => goal.name),
      substitutions: getSubstitutions(ex, library, equipmentLibrary),
    });
    if (upperRole) upperRoles.add(upperRole);

    minutesUsed += mins;
    if (isCompound) compoundAdded++;
    else isolationAdded++;
  }

  // Always add 1 core exercise if budget allows
  const coreExercises = library.filter((e) => e.tags.includes("core"));
  // Pick one that wasn't done last session, or just the first
  const coreChoice =
    attributedCoreChoice ??
    coreExercises.find((e) => !lastSessionExercises.has(e.id)) ??
    coreExercises[0];

  if (coreChoice && minutesUsed + exerciseMinutes(coreChoice, 3) <= budgetMinutes) {
    const coreEquipment = equipmentLibrary.find((e) => e.id === coreChoice.equipment_id);
    const matchedGoals = goalsForExercise(coreChoice);
    prescriptions.push({
      exercise_id: coreChoice.id,
      exercise_name: coreChoice.name,
      equipment_name: coreEquipment?.name,
      sets: 3,
      reps_low: coreChoice.tracking_type === "duration" || coreChoice.laterality === "timed" ? 0 : 8,
      reps_high: coreChoice.tracking_type === "duration" || coreChoice.laterality === "timed" ? 0 : 10,
      tracking_type: coreChoice.tracking_type ?? "reps",
      target_duration_seconds: coreChoice.tracking_type === "duration" || coreChoice.laterality === "timed" ? 30 : undefined,
      rest_seconds: 45,
      goal_ids: matchedGoals.map((goal) => goal.id),
      goal_names: matchedGoals.map((goal) => goal.name),
      substitutions: getSimilarWorkouts(coreChoice, 2, library, equipmentLibrary),
    });
    minutesUsed += exerciseMinutes(coreChoice, 3);
  }

  if (dayType === "upper") {
    const push = prescriptions.filter((item) => library.find((ex) => ex.id === item.exercise_id)?.tags.includes("push"));
    const pull = prescriptions.filter((item) => library.find((ex) => ex.id === item.exercise_id)?.tags.includes("pull"));
    const pairCount = Math.min(push.length, pull.length);
    for (let index = 0; index < pairCount; index++) {
      const group = String.fromCharCode(65 + index);
      push[index].superset_group = group;
      push[index].superset_position = 1;
      pull[index].superset_group = group;
      pull[index].superset_position = 2;
    }
  }

  validateRoutinePrescriptions(prescriptions);
  const estimatedMinutes = WARMUP_MINUTES + minutesUsed;

  return {
    id: crypto.randomUUID(),
    user_id: userId,
    phase_id: phase.id,
    generated_at: new Date().toISOString(),
    date: new Date().toISOString().split("T")[0],
    workout_type: dayType,
    warmup: {
      description: WARMUP_TEXT[dayType] ?? WARMUP_TEXT.upper,
      duration_minutes: WARMUP_MINUTES,
    },
    exercises: prescriptions,
    estimated_duration_minutes: Math.min(Math.round(estimatedMinutes), MAX_SESSION_MINUTES),
    was_completed: false,
    created_at: new Date().toISOString(),
  };
}

export function validateRoutinePrescriptions(prescriptions: ExercisePrescription[]): void {
  for (const prescription of prescriptions) {
    const durationBased = prescription.tracking_type === "duration" || prescription.tracking_type === "distance";
    if (!durationBased && (prescription.reps_low < 1 || prescription.reps_high > 10 || prescription.reps_low > prescription.reps_high)) {
      throw new Error(`Invalid prescription for ${prescription.exercise_name}: rep targets must be between 1 and 10.`);
    }
  }
}

function getSubstitutions(
  ex: Exercise,
  library: Exercise[],
  equipment: Array<{ id: string; name: string }>
) {
  return getSimilarWorkouts(ex, 3, library, equipment);
}

// ---------------------------------------------------------------
// Phase advancement
// ---------------------------------------------------------------
export function buildNextPhase(current: TrainingPhase): TrainingPhase {
  const order: TrainingPhase["phase_type"][] = ["accumulation", "intensification", "density"];
  const nextType = order[(order.indexOf(current.phase_type) + 1) % order.length];

  const cfgKey = nextType as keyof typeof PHASE_CONFIGS;
  const cfg = PHASE_CONFIGS[cfgKey];

  const NAMES: Record<string, string> = {
    accumulation:    "Accumulation",
    intensification: "Intensification",
    density:         "Density",
  };
  const DESCS: Record<string, string> = {
    accumulation:    "Volume block — moderate loads, 6–10 reps, with new accessory pairings and controlled tempo.",
    intensification: "Strength bias — heavier loads, 5–8 reps, compound priority. Push estimated 1RM up.",
    density:         "Efficiency block — 8–10 reps, shorter rest, refreshed variations, and more work per minute.",
  };

  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 21);

  return {
    id: crypto.randomUUID(),
    user_id: current.user_id,
    name: NAMES[nextType],
    phase_type: nextType,
    phase_number: current.phase_number + 1,
    start_date: start.toISOString().split("T")[0],
    end_date: end.toISOString().split("T")[0],
    rep_range_low: cfg.reps_low,
    rep_range_high: cfg.reps_high,
    description: DESCS[nextType],
    is_active: true,
    created_at: new Date().toISOString(),
  };
}

export function buildDefaultPhase(userId: string): TrainingPhase {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 21);

  return {
    id: crypto.randomUUID(),
    user_id: userId,
    name: "Accumulation",
    phase_type: "accumulation",
    phase_number: 1,
    start_date: start.toISOString().split("T")[0],
    end_date: end.toISOString().split("T")[0],
    rep_range_low: PHASE_CONFIGS.accumulation.reps_low,
    rep_range_high: PHASE_CONFIGS.accumulation.reps_high,
    description: "Starter volume block — moderate loads, 6–10 reps, upper supersets, and planned lower-body core work.",
    is_active: true,
    created_at: new Date().toISOString(),
  };
}
