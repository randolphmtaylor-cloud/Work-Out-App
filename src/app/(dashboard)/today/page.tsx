import { getTodayRoutine, getActivePhase, getRecentSessions, getAllSets, getExercises, getEquipment, getGoals } from "@/lib/data";
import { generateRoutine } from "@/lib/routine-engine";
import { formatDisplay } from "@/lib/utils/dates";
import { TodayWorkoutPanel } from "@/components/workout/today-workout-panel";
import { getCurrentUserId } from "@/lib/auth/user";

export default async function TodayPage() {
  const today = new Date().toISOString().split("T")[0];
  const { userId } = await getCurrentUserId();

  let routine = await getTodayRoutine(userId);
  let hasActivePhase = true;

  if (!routine) {
    const [phase, recentSessions, allSets, exercises, equipment, activeGoals] = await Promise.all([
      getActivePhase(userId),
      getRecentSessions(userId, 14),
      getAllSets(userId),
      getExercises(),
      getEquipment(),
      getGoals(userId, { ensureStarter: true }),
    ]);
    hasActivePhase = Boolean(phase);
    if (phase) {
      routine = generateRoutine({ phase, recentSessions, allSets, userId, exercises, equipment, activeGoals });
    }
  }

  return <TodayWorkoutPanel routine={routine} displayDate={formatDisplay(today)} hasActivePhase={hasActivePhase} todayDate={today} />;
}
