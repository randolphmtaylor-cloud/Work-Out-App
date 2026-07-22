import { HistoryManager } from "@/components/workout/history-manager";
import { getSessions, getSetsForSessions, getExercises } from "@/lib/data";
import { getCurrentUserId } from "@/lib/auth/user";

export default async function HistoryPage() {
  const { userId } = await getCurrentUserId();
  const sessions = await getSessions(userId);
  const sessionIds = sessions.map((s) => s.id);
  const [allSets, exercises] = await Promise.all([
    getSetsForSessions(sessionIds),
    getExercises(),
  ]);

  const exerciseMap = new Map(exercises.map((e) => [e.id, e.name]));

  const sessionsWithSets = sessions.map((session) => {
    const sets = allSets.filter((s) => s.session_id === session.id);
    const exercises = [...new Set(sets.map((s) => exerciseMap.get(s.exercise_id ?? "") ?? "Unknown"))];
    return { ...session, sets, exercises };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-8 pt-5 sm:px-6 sm:pt-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">History</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{sessions.length} sessions recorded</p>
      </div>
      <HistoryManager initialSessions={sessionsWithSets} exercises={exercises} />
    </div>
  );
}
