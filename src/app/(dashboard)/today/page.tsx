import { getTodayRoutine, getActivePhase, getRecentSessions, getAllSets } from "@/lib/data";
import { generateRoutine } from "@/lib/routine-engine";
import { formatDisplay } from "@/lib/utils/dates";
import { TodayWorkoutPanel } from "@/components/workout/today-workout-panel";
import { getCurrentUserId } from "@/lib/auth/user";

export default async function TodayPage() {
  const today = new Date().toISOString().split("T")[0];
  const { userId } = await getCurrentUserId();

  let routine = await getTodayRoutine(userId);

  if (!routine) {
    const [phase, recentSessions, allSets] = await Promise.all([
      getActivePhase(userId),
      getRecentSessions(userId, 14),
      getAllSets(userId),
    ]);
    if (phase) {
      routine = generateRoutine({ phase, recentSessions, allSets, userId });
    }
  }

  return <TodayWorkoutPanel routine={routine} displayDate={formatDisplay(today)} />;
}
