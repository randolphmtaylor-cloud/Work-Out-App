import { TrendingUp, AlertTriangle, Zap, BarChart3, Trophy, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getSessions, getAllSets } from "@/lib/data";
import { computeAnalytics } from "@/lib/analytics";
import { ConsistencyChart } from "@/components/progress/consistency-chart";
import { TrendChart } from "@/components/progress/trend-chart";
import { EquipmentUsageChart } from "@/components/progress/equipment-usage-chart";
import { TopSetsTable } from "@/components/progress/top-sets-table";
import { VolumeChart } from "@/components/progress/volume-chart";

const DEMO_USER = "demo-user";

export default async function ProgressPage() {
  const [sessions, sets] = await Promise.all([
    getSessions(DEMO_USER),
    getAllSets(DEMO_USER),
  ]);

  const analytics = computeAnalytics(sessions, sets);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Progress</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {analytics.totalSessions} sessions · {analytics.totalSets} sets · {Math.round(analytics.totalVolumeLbs / 1000)}k lbs total volume
        </p>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Total Sessions" value={analytics.totalSessions.toString()} />
        <StatBox label="Avg / Week" value={(analytics.totalSessions / Math.max(analytics.consistency.weeks.length, 1)).toFixed(1)} />
        <StatBox label="Consistency" value={`${analytics.consistency.overall_pct}%`} />
        <StatBox label="Current Streak" value={`${analytics.consistency.current_streak}w`} sub="consecutive weeks" />
      </div>

      {/* Consistency */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <CardTitle className="text-base">Weekly Consistency</CardTitle>
            <span className="ml-auto text-xs text-zinc-400">
              {analytics.consistency.longest_streak}w longest streak
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <ConsistencyChart data={analytics.consistency.weeks} />
        </CardContent>
      </Card>

      {/* Volume over time */}
      {sessions.length >= 3 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-600" />
              <CardTitle className="text-base">Weekly Volume</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <VolumeChart sessions={sessions} sets={sets} />
          </CardContent>
        </Card>
      )}

      {/* Top Sets (PRs) */}
      {analytics.topSets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-base">All-Time Top Sets</CardTitle>
              <span className="ml-auto text-xs text-zinc-400">by est. 1RM</span>
            </div>
          </CardHeader>
          <CardContent>
            <TopSetsTable topSets={analytics.topSets} />
          </CardContent>
        </Card>
      )}

      {/* Lift progression charts */}
      {analytics.trends.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            Lift Progression
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.trends
              .filter((t) => t.points.length >= 2)
              .slice(0, 6)
              .map((trend) => (
                <Card key={trend.exercise_id}>
                  <CardHeader className="pb-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">{trend.exercise_name}</CardTitle>
                      <Badge
                        variant={
                          trend.trend === "progressing" ? "success"
                          : trend.trend === "stalled" ? "warning"
                          : "destructive"
                        }
                        className="text-xs"
                      >
                        {trend.trend === "progressing"
                          ? `+${trend.weight_delta}lbs`
                          : trend.trend === "stalled"
                          ? `${trend.weeks_since_pr}w stalled`
                          : "deloading"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <TrendChart trend={trend} />
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Plateau alerts */}
      {analytics.plateaus.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-base">Plateau Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.plateaus.map((p, i) => (
              <div key={p.exercise_id}>
                {i > 0 && <Separator className="mb-3" />}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-zinc-900">{p.exercise_name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Last PR: {p.last_pr_date}
                      {p.last_pr_weight ? ` · ${p.last_pr_weight}lbs × ${p.last_pr_reps}` : ` · ${p.last_pr_reps}r BW`}
                    </p>
                    <p className="text-xs text-amber-800 bg-amber-100 rounded px-2 py-1 mt-1.5 inline-block">
                      {p.recommendation}
                    </p>
                  </div>
                  <Badge variant="warning" className="shrink-0">{p.weeks_stalled}w stalled</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Equipment usage */}
      {analytics.equipmentFrequency.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600" />
              <CardTitle className="text-base">Equipment Usage</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <EquipmentUsageChart data={analytics.equipmentFrequency} totalSessions={analytics.totalSessions} />
          </CardContent>
        </Card>
      )}

      {/* Most frequent exercises */}
      {analytics.mostFrequentExercises.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Exercise Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.mostFrequentExercises.map((ex) => (
                <div key={ex.name} className="flex items-center gap-3">
                  <span className="text-sm text-zinc-700 w-48 truncate shrink-0">{ex.name}</span>
                  <div className="flex-1 bg-zinc-100 rounded-full h-2">
                    <div
                      className="bg-indigo-400 h-2 rounded-full"
                      style={{ width: `${Math.min((ex.sessions / analytics.totalSessions) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400 w-12 text-right shrink-0">{ex.sessions}× ({Math.round((ex.sessions / analytics.totalSessions) * 100)}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-2xl font-bold text-zinc-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  );
}
