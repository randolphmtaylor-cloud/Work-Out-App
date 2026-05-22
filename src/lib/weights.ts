import type { WorkoutSession, WorkoutSet } from "@/types";

export type ParsedWeightInput = {
  weight_lbs?: number;
  bodyweight_lbs?: number;
};

export type PersonalBest = {
  weight_lbs?: number;
  bodyweight_lbs?: number;
  reps?: number;
  date?: string;
};

const BODYWEIGHT_PATTERN = /^bw(?:\s*\+\s*(\d+(?:\.\d+)?))?$/i;

function roundWeight(value: number) {
  return Math.round(value * 10) / 10;
}

export function parseWeightInput(value: string): ParsedWeightInput {
  const trimmed = value.trim();
  if (!trimmed) return {};

  const bodyweightMatch = trimmed.match(BODYWEIGHT_PATTERN);
  if (bodyweightMatch) {
    const addedLoad = bodyweightMatch[1] ? Number(bodyweightMatch[1]) : undefined;
    return {
      bodyweight_lbs: 0,
      weight_lbs: Number.isFinite(addedLoad) && addedLoad && addedLoad > 0 ? roundWeight(addedLoad) : undefined,
    };
  }

  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric > 0 ? { weight_lbs: roundWeight(numeric) } : {};
}

export function formatWeightInput(set: Pick<WorkoutSet, "weight_lbs" | "bodyweight_lbs">): string {
  const addedLoad = set.weight_lbs && set.weight_lbs > 0 ? set.weight_lbs : undefined;
  if (set.bodyweight_lbs !== undefined && set.bodyweight_lbs !== null) {
    return addedLoad ? `BW + ${addedLoad}` : "BW";
  }
  return addedLoad ? String(addedLoad) : "";
}

export function formatLoggedWeight(set: Pick<WorkoutSet, "weight_lbs" | "bodyweight_lbs">): string {
  const addedLoad = set.weight_lbs && set.weight_lbs > 0 ? set.weight_lbs : undefined;
  if (set.bodyweight_lbs !== undefined && set.bodyweight_lbs !== null) {
    return addedLoad ? `BW + ${addedLoad}` : "BW";
  }
  return addedLoad ? `${addedLoad} lbs` : "BW";
}

function scoreSet(set: Pick<WorkoutSet, "weight_lbs" | "bodyweight_lbs" | "reps">) {
  const addedLoad = set.weight_lbs ?? 0;
  const reps = set.reps ?? 0;
  return {
    addedLoad,
    reps,
    isBodyweight: set.bodyweight_lbs !== undefined && set.bodyweight_lbs !== null,
  };
}

function isBetterSet(
  candidate: Pick<WorkoutSet, "weight_lbs" | "bodyweight_lbs" | "reps">,
  current: Pick<WorkoutSet, "weight_lbs" | "bodyweight_lbs" | "reps">
) {
  const a = scoreSet(candidate);
  const b = scoreSet(current);

  if (a.addedLoad !== b.addedLoad) return a.addedLoad > b.addedLoad;
  return a.reps > b.reps;
}

export function getPersonalBestForExercise(
  exerciseId: string,
  sets: WorkoutSet[],
  sessions: WorkoutSession[]
): PersonalBest | null {
  const sessionDateById = new Map(sessions.map((session) => [session.id, session.date]));
  let bestSet: WorkoutSet | null = null;

  for (const set of sets) {
    if (set.exercise_id !== exerciseId || set.is_warmup) continue;
    const hasLoad = (set.weight_lbs ?? 0) > 0;
    const isBodyweight = set.bodyweight_lbs !== undefined && set.bodyweight_lbs !== null;
    if (!hasLoad && !isBodyweight) continue;
    if (!bestSet || isBetterSet(set, bestSet)) bestSet = set;
  }

  if (!bestSet) return null;

  return {
    weight_lbs: bestSet.weight_lbs,
    bodyweight_lbs: bestSet.bodyweight_lbs,
    reps: bestSet.reps,
    date: sessionDateById.get(bestSet.session_id),
  };
}
