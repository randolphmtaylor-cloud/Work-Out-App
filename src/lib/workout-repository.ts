import type { Exercise, ExerciseSubstitution } from "@/types";
import { MOCK_EQUIPMENT, MOCK_EXERCISES } from "@/lib/mock-data";

const DIRECT_REPLACEMENTS: Record<string, string[]> = {
  "pull-up": ["lat-pulldown", "seated-cable-row"],
  "dip": ["tricep-pushdown", "triceps-machine", "machine-chest-press"],
  "cybex-incline-press": ["machine-chest-press", "dumbbell-shoulder-press", "cable-fly"],
  "machine-chest-press": ["cybex-incline-press", "dumbbell-shoulder-press", "dip"],
  "hammer-strength-row": ["seated-cable-row", "lat-pulldown", "dumbbell-curl"],
  "trap-bar-deadlift": ["icarian-leg-press", "squat", "back-extension"],
  "icarian-leg-press": ["trap-bar-deadlift", "squat", "leg-extension"],
  "leg-extension": ["squat", "icarian-leg-press"],
  "lying-leg-curl": ["back-extension", "trap-bar-deadlift"],
  "ab-wheel-rollout": ["back-extension"],
};

function equipmentName(exercise: Exercise, equipment: Array<{ id: string; name: string }> = MOCK_EQUIPMENT): string | undefined {
  return exercise.equipment?.name ?? equipment.find((item) => item.id === exercise.equipment_id)?.name;
}

function overlapCount(a: readonly string[], b: readonly string[]): number {
  const bSet = new Set(b);
  return a.filter((item) => bSet.has(item)).length;
}

function formatReason(original: Exercise, replacement: Exercise): string {
  const matchingMuscles = original.muscle_groups.filter((muscle) =>
    replacement.muscle_groups.includes(muscle)
  );
  const style = original.tags.includes("compound") && replacement.tags.includes("compound")
    ? "compound pattern"
    : original.tags.includes("isolation") && replacement.tags.includes("isolation")
      ? "isolation pattern"
      : "same training slot";

  return matchingMuscles.length > 0
    ? `${style}; targets ${matchingMuscles.join(", ")}`
    : style;
}

export function getWorkoutRepository(): Exercise[] {
  return [...MOCK_EXERCISES];
}

export function getSimilarWorkouts(
  exercise: Exercise,
  limit = 3,
  library: Exercise[] = MOCK_EXERCISES,
  equipment: Array<{ id: string; name: string }> = MOCK_EQUIPMENT
): ExerciseSubstitution[] {
  const activeLibrary = library.filter((candidate) => candidate.status !== "archived");
  const direct = DIRECT_REPLACEMENTS[exercise.canonical_name] ?? [];

  const directMatches = direct
    .map((canonicalName) => activeLibrary.find((candidate) => candidate.canonical_name === canonicalName))
    .filter((candidate): candidate is Exercise => Boolean(candidate));

  const scored = activeLibrary
    .filter((candidate) => candidate.id !== exercise.id)
    .map((candidate) => {
      let score = 0;
      score += overlapCount(exercise.muscle_groups, candidate.muscle_groups) * 8;
      score += overlapCount(exercise.tags, candidate.tags) * 4;
      if (exercise.tags.includes("compound") === candidate.tags.includes("compound")) score += 5;
      if (exercise.equipment_id && exercise.equipment_id !== candidate.equipment_id) score += 2;
      return { candidate, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ candidate }) => candidate);

  const unique = [...directMatches, ...scored].filter(
    (candidate, index, all) => all.findIndex((item) => item.id === candidate.id) === index
  );

  return unique.slice(0, limit).map((replacement) => ({
    exercise_id: replacement.id,
    exercise_name: replacement.name,
    equipment_name: equipmentName(replacement, equipment),
    reason: formatReason(exercise, replacement),
  }));
}
