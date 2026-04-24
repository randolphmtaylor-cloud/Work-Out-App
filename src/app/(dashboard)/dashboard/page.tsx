import Link from "next/link";
import { ArrowRight, Flame, Target, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhasePanel } from "@/components/workout/phase-panel";
import {
  getActivePhase,
  getRecentSessions,
  getLatestSummary,
  getTodayRoutine,
  getAllSets,
} from "@/lib/data";
import { computeAnalytics } from "@/lib/analytics";
import { DEMO_USER_ID } from "@/lib/constants/demo";
import { formatDisplay, formatShort, differenceInDays, parseISO } from "@/lib/utils/dates";
import type { GeneratedRoutine, TrainingPhase, WeeklySummary, WorkoutSession, WorkoutSet } from "@/types";

export default async function DashboardPage() {
  let phase: TrainingPhase | null = null;
  let sessions: WorkoutSession[] = [];
  let summary: WeeklySummary | null = null;
  let todayRoutine: GeneratedRoutine | null = null;
  let allSets: WorkoutSet[] = [];

  try {
    [phase, sessions, summary, todayRoutine, allSets] = await Promise.all([
      getActivePhase(DEMO_USER_ID),
      getRecentSessions(DEMO_USER_ID, 30),
      getLatestSummary(DEMO_USER_ID),
      getTodayRoutine(DEMO_USER_ID),
      getAllSets(DEMO_USER_ID),
    ]);
  } catch (error) {
    console.error("[dashboard] failed to load data, rendering fallback", error);
  }

  const analytics = computeAnalytics(sessions, allSets);
  const today = new Date().toISOString().split("T")[0];
  const lastSession = sessions[0];
  const daysSinceLast = lastSession
    ? differenceInDays(new Date(), parseISO(lastSession.date))
    : null;

  // This week
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekStart = monday.toISOString().split("T")[0];
  const weekSessions = sessions.filter((s) => s.date >= weekStart);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{formatDisplay(today)}</p>
        </div>
        <Link href="/today">
          <Button variant="accent" size="sm" className="gap-1.5">
            <Flame className="w-3.5 h-3.5" />
            Today&apos;s Workout
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total sessions"
          value={analytics.totalSessions.toString()}
          icon={<Calendar className="w-4 h-4 text-indigo-500" />}
        />
        <StatCard
          label="This week"
          value={`${weekSessions.length}/3`}
          icon={<Target className="w-4 h-4 text-green-500" />}
          sub={weekSessions.length >= 3 ? "On target" : `${3 - weekSessions.length} to go`}
        />
        <StatCard
          label="Last session"
          value={lastSession ? formatShort(lastSession.date) : "—"}
          icon={<TrendingUp className="w-4 h-4 text-amber-500" />}
          sub={daysSinceLast !== null ? `${daysSinceLast}d ago` : undefined}
        />
        <StatCard
          label="Avg session"
          value={`${Math.round(analytics.avgSessionDurationMin)}m`}
          icon={<Flame className="w-4 h-4 text-orange-500" />}
          sub="target: ≤30m"
        />
      </div>

      {/* Phase */}
      {phase && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Current Phase</CardTitle>
          </CardHeader>
          <CardContent>
            <PhasePanel phase={phase} />
          </CardContent>
        </Card>
      )}

      {/* Today's Routine */}
      {todayRoutine && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Today&apos;s Routine</CardTitle>
              <Badge variant={(todayRoutine.workout_type as "push" | "pull" | "legs") ?? "secondary"}>
                {todayRoutine.workout_type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {todayRoutine.exercises.map((ex) => (
                <span key={ex.exercise_id} className="text-xs bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-full">
                  {ex.exercise_name}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">
                ~{todayRoutine.estimated_duration_minutes} min · {todayRoutine.exercises.length} exercises
                {todayRoutine.was_completed && (
                  <span className="ml-2 text-xs text-green-600 font-medium">✓ Completed</span>
                )}
              </span>
              <Link href="/today">
                <Button variant="ghost" size="sm" className="gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs">
                  {todayRoutine.was_completed ? "View" : "Start"} <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consistency + top lift quick view */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Consistency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Overall</span>
              <span className="font-semibold text-zinc-900">{analytics.consistency.overall_pct}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Current streak</span>
              <span className="font-semibold text-zinc-900">{analytics.consistency.current_streak} weeks</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Longest streak</span>
              <span className="font-semibold text-zinc-900">{analytics.consistency.longest_streak} weeks</span>
            </div>
            <Link href="/progress" className="block pt-1">
              <span className="text-xs text-indigo-600 hover:underline">View full analytics →</span>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Lifts (est. 1RM)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {analytics.topSets.slice(0, 3).map((ts) => (
              <div key={ts.exercise_id} className="flex justify-between text-sm">
                <span className="text-zinc-600 truncate mr-2">{ts.exercise_name}</span>
                <span className="font-medium text-zinc-900 shrink-0">~{ts.estimated_1rm} lbs</span>
              </div>
            ))}
            {analytics.topSets.length === 0 && (
              <p className="text-xs text-zinc-400">Log sessions to see your PRs here.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary preview */}
      {summary && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Weekly Summary</CardTitle>
              <span className="text-xs text-zinc-400">{formatShort(summary.week_start)} – {formatShort(summary.week_end)}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-zinc-700 space-y-1.5">
              {summary.summary_text.split("\n\n").slice(0, 2).map((p, i) => (
                <p key={i} dangerouslySetInnerHTML={{ __html: p.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
              ))}
            </div>
            <Link href="/coach">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs mt-1">
                Open AI Coach <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent sessions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Sessions</CardTitle>
            <Link href="/history" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sessions.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                  <span className="text-sm text-zinc-900 font-medium">{formatShort(s.date)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 capitalize">{s.source.replace("_", " ")}</span>
                  {s.duration_minutes && (
                    <span className="text-xs text-zinc-500">{s.duration_minutes}m</span>
                  )}
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-sm text-zinc-400 text-center py-4">
                No sessions yet. <Link href="/import" className="text-indigo-600 hover:underline">Import your logs</Link>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon, sub }: { label: string; value: string; icon: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-500 leading-tight">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  );
}
