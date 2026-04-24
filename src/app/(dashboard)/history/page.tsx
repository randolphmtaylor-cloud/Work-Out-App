import { Calendar, Clock, Dumbbell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSessions, getSetsForSessions, getActivePhase } from "@/lib/data";
import { MOCK_EXERCISES } from "@/lib/mock-data";
import { formatDisplay } from "@/lib/utils/dates";
import { DEMO_USER_ID } from "@/lib/constants/demo";

const DEMO_USER = DEMO_USER_ID;

export default async function HistoryPage() {
  const sessions = await getSessions(DEMO_USER);
  const sessionIds = sessions.map((s) => s.id);
  const allSets = await getSetsForSessions(sessionIds);

  const exerciseMap = new Map(MOCK_EXERCISES.map((e) => [e.id, e.name]));

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

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">History</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{sessions.length} sessions recorded</p>
      </div>

      {[...grouped.entries()].map(([month, monthSessions]) => {
        const [year, m] = month.split("-");
        const monthName = new Date(parseInt(year), parseInt(m) - 1).toLocaleString("default", { month: "long", year: "numeric" });

        return (
          <div key={month}>
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">{monthName}</h2>
            <div className="space-y-2">
              {monthSessions.map((session) => (
                <Card key={session.id} className="hover:border-zinc-300 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="font-medium text-zinc-900 text-sm">{formatDisplay(session.date)}</span>
                          {session.duration_minutes && (
                            <span className="flex items-center gap-0.5 text-xs text-zinc-400">
                              <Clock className="w-3 h-3" />
                              {session.duration_minutes}m
                            </span>
                          )}
                        </div>

                        {session.exercises.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {session.exercises.slice(0, 6).map((ex) => (
                              <span key={ex} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                                {ex}
                              </span>
                            ))}
                            {session.exercises.length > 6 && (
                              <span className="text-xs text-zinc-400 px-1">
                                +{session.exercises.length - 6} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400">No exercises recorded</p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {SOURCE_LABELS[session.source] ?? session.source}
                        </Badge>
                        {session.sets.length > 0 && (
                          <span className="text-xs text-zinc-400 flex items-center gap-0.5">
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
            <Dumbbell className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500">No sessions yet. Import your workout logs to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}