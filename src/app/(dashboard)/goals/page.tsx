import { Target } from "lucide-react";
import { GoalsManager } from "@/components/goals/goals-manager";
import { getAllSets, getExercises, getGoals, getSessions } from "@/lib/data";
import { buildGoalProgress } from "@/lib/goals";
import { getCurrentUserId } from "@/lib/auth/user";

export default async function GoalsPage() {
  const { userId } = await getCurrentUserId();
  const [goals, sessions, sets, exercises] = await Promise.all([
    getGoals(userId, { ensureStarter: true }),
    getSessions(userId),
    getAllSets(userId),
    getExercises(),
  ]);
  const progress = buildGoalProgress(goals, sessions, sets, exercises);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-indigo-600" />
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Goals</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Active goals add focused exercises to generated routines when they fit the scheduled training day.
        </p>
      </div>
      <GoalsManager goals={goals} progress={progress} />
    </div>
  );
}
