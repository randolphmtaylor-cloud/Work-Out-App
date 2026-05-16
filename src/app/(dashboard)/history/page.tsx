import { Calendar, Clock, Dumbbell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSessions, getSetsForSessions, getExercises } from "@/lib/data";
import { formatDisplay } from "@/lib/utils/dates";
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

  // Group by month
  const grouped = new Map<string, typeof sessionsWithSets>();
  for (const s of sessionsWithSets) {
    const month = s.date.slice(0, 7); // "2025-04"
    if (!grouped.has(month)) grouped.set(month, []);
    grouped.get(month)!.push(s);
  }

  const SOURCE_LABELS: Record<string, string> = {
    import_text: "Text Import",
    import_docx: "Docx Import",
    import_xlsx: "Excel Import",
    manual: "Manual",
    generated: "Generated",
  };

  const sessionLabel = (session: { source: string; notes?: string }) =>
    session.notes?.includes("Home Workout") ? "Home Workout" : SOURCE_LABELS[session.source] ?? session.source;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">History</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{sessions.length} sessions recorded</p>
      </div>

      {[...grouped.entries()].map(([month, monthSessions]) => {
        const [year, m] = month.split("-");
        const monthName = new Date(parseInt(year), parseInt(m) - 1).toLocaleString("default", { month: "long", year: "numeric" });

        return (
          <div key={month}>
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">{monthName}</h2>
            <div className="space-y-2">
              {monthSessions.map((session) => (
                <Card key={session.id} className="hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                          <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{formatDisplay(session.date)}</span>
                          {session.duration_minutes && (
                            <span className="flex items-center gap-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                              <Clock className="w-3 h-3" />
                              {session.duration_minutes}m
                            </span>
                          )}
                        </div>

                        {session.exercises.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {session.exercises.slice(0, 6).map((ex) => (
                              <span key={ex} className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                                {ex}
                              </span>
                            ))}
                            {session.exercises.length > 6 && (
                              <span className="text-xs text-zinc-400 dark:text-zinc-500 px-1">
                                +{session.exercises.length - 6} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">No exercises recorded</p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge
                          variant={session.notes?.includes("Home Workout") ? "home" : "outline"}
                          className="text-xs"
                        >
                          {sessionLabel(session)}
                        </Badge>
                        {session.sets.length > 0 && (
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-0.5">
                            <Dumbbell className="w-3 h-3" />
                            {session.sets.length} sets
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {sessions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 dark:text-zinc-400">No sessions yet. Import your workout logs to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
