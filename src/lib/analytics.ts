// ============================================================
// Analytics Engine
// Computes all training metrics from raw sessions + sets.
// Pure functions — no side effects, works over any data source.
// ============================================================
import { WorkoutSession, WorkoutSet } from "@/types";
import { MOCK_EXERCISES } from "@/lib/mock-data";

const exerciseMap = new Map(MOCK_EXERCISES.map((e) => [e.id, e]));

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
export interface TopSet {
  exercise_id: string;
  exercise_name: string;
  weight_lbs: number;
  reps: number;
  volume: number; // weight × reps
  date: string;
  estimated_1rm: number; // Brzycki formula
}

export interface ExerciseTrend {
  exercise_id: string;
  exercise_name: string;
  /** Chronological data points */
  points: Array<{
    date: string;
    top_weight: number;
    top_reps: number;
    total_volume: number;
    estimated_1rm: number;
  }>;
  /** Change in top weight over the window */
  weight_delta: number;
  /** "progressing" | "stalled" | "deloading" */
  trend: "progressing" | "stalled" | "deloading";
  weeks_since_pr: number;
}

export interface PlateauAlert {
  exercise_name: string;
  exercise_id: string;
  weeks_stalled: number;
  last_pr_date: string;
  last_pr_weight: number | null;
  last_pr_reps: number;
  recommendation: string;
}

export interface ConsistencyStats {
  /** ISO week label → session count */
  weeks: Array<{ week: string; label: string; sessions: number; target: number }>;
  overall_pct: number;
  current_streak: number;
  longest_streak: number;
}

export interface EquipmentFrequency {
  equipment_id: string | null;
  equipment_name: string;
  sessions: number;
  sets: number;
  pct_of_sessions: number;
}

export interface AnalyticsBundle {
  topSets: TopSet[];
  trends: ExerciseTrend[];
  plateaus: PlateauAlert[];
  consistency: ConsistencyStats;
  equipmentFrequency: EquipmentFrequency[];
  totalSessions: number;
  totalSets: number;
  totalVolumeLbs: number;
  avgSessionDurationMin: number;
  mostFrequentExercises: Array<{ name: string; sessions: number }>;
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
function brzycki1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps >= 37) return weight; // formula breaks down
  return Math.round(weight / (1.0278 - 0.0278 * reps));
}

function isoWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const thursday = new Date(d);
  thursday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${thursday.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function weekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------
// Core computation
// ---------------------------------------------------------------
export function computeAnalytics(
  sessions: WorkoutSession[],
  sets: WorkoutSet[]
): AnalyticsBundle {
  const totalSessions = sessions.length;
  const totalSets = sets.length;
  const totalVolumeLbs = sets.reduce(
    (sum, s) => sum + (s.weight_lbs ?? 0) * (s.reps ?? 0),
    0
  );
  const avgSessionDurationMin =
    sessions.reduce((sum, s) => sum + (s.duration_minutes ?? 28), 0) /
    Math.max(totalSessions, 1);

  // ---- Top Sets per exercise ----
  const topSetMap = new Map<string, TopSet>();
  for (const s of sets) {
    if (!s.exercise_id || s.is_warmup) continue;
    const ex = exerciseMap.get(s.exercise_id);
    if (!ex) continue;
    const weight = s.weight_lbs ?? 0;
    const reps = s.reps ?? 0;
    const volume = weight * reps;
    const est1rm = weight > 0 ? brzycki1RM(weight, reps) : reps; // BW: use reps as proxy
    const session = sessions.find((ses) => ses.id === s.session_id);
    const date = session?.date ?? "";

    const existing = topSetMap.get(s.exercise_id);
    if (!existing || est1rm > existing.estimated_1rm) {
      topSetMap.set(s.exercise_id, {
        exercise_id: s.exercise_id,
        exercise_name: ex.name,
        weight_lbs: weight,
        reps,
        volume,
        date,
        estimated_1rm: est1rm,
      });
    }
  }
  const topSets = [...topSetMap.values()].sort(
    (a, b) => b.estimated_1rm - a.estimated_1rm
  );

  // ---- Trends per exercise ----
  // Group sets by exercise → by session date
  const byExercise = new Map<string, Array<{ date: string; weight: number; reps: number }>>();
  for (const s of sets) {
    if (!s.exercise_id || s.is_warmup) continue;
    const session = sessions.find((ses) => ses.id === s.session_id);
    if (!session) continue;
    const arr = byExercise.get(s.exercise_id) ?? [];
    arr.push({ date: session.date, weight: s.weight_lbs ?? 0, reps: s.reps ?? 0 });
    byExercise.set(s.exercise_id, arr);
  }

  const trends: ExerciseTrend[] = [];
  for (const [exId, rawPoints] of byExercise.entries()) {
    const ex = exerciseMap.get(exId);
    if (!ex) continue;
    if (rawPoints.length < 2) continue;

    // Aggregate by date — take best set per day
    const byDate = new Map<string, { weight: number; reps: number }>();
    for (const p of rawPoints) {
      const existing = byDate.get(p.date);
      const est = brzycki1RM(p.weight, p.reps);
      const existingEst = existing ? brzycki1RM(existing.weight, existing.reps) : 0;
      if (!existing || est > existingEst) byDate.set(p.date, { weight: p.weight, reps: p.reps });
    }

    const points = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { weight, reps }]) => ({
        date,
        top_weight: weight,
        top_reps: reps,
        total_volume: rawPoints
          .filter((p) => p.date === date)
          .reduce((s, p) => s + p.weight * p.reps, 0),
        estimated_1rm: weight > 0 ? brzycki1RM(weight, reps) : reps,
      }));

    // Find all-time PR date
    let prPoint = points[0];
    for (const p of points) {
      if (p.estimated_1rm >= prPoint.estimated_1rm) prPoint = p;
    }

    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    const weightDelta = lastPoint.top_weight - firstPoint.top_weight;

    const daysSincePr = Math.round(
      (Date.now() - new Date(prPoint.date).getTime()) / 86400000
    );
    const weeksSincePr = Math.round(daysSincePr / 7);

    let trend: "progressing" | "stalled" | "deloading" = "progressing";
    if (weightDelta < 0) trend = "deloading";
    else if (weeksSincePr >= 3) trend = "stalled";

    trends.push({
      exercise_id: exId,
      exercise_name: ex.name,
      points,
      weight_delta: weightDelta,
      trend,
      weeks_since_pr: weeksSincePr,
    });
  }

  // ---- Plateau alerts ----
  const plateaus: PlateauAlert[] = trends
    .filter((t) => t.trend === "stalled" && t.weeks_since_pr >= 2)
    .map((t) => {
      const prPoint = t.points.reduce((best, p) =>
        p.estimated_1rm >= best.estimated_1rm ? p : best
      );
      const recommendations: Record<string, string> = {
        progressing: "",
        stalled: `Add a 4th set or increase load by 5 lbs next session. Consider technique check.`,
        deloading: `Weight has dropped — check recovery and nutrition. Deload intentional?`,
      };
      return {
        exercise_name: t.exercise_name,
        exercise_id: t.exercise_id,
        weeks_stalled: t.weeks_since_pr,
        last_pr_date: prPoint.date,
        last_pr_weight: prPoint.top_weight > 0 ? prPoint.top_weight : null,
        last_pr_reps: prPoint.top_reps,
        recommendation:
          t.trend === "stalled"
            ? recommendations.stalled
            : recommendations.deloading,
      };
    })
    .sort((a, b) => b.weeks_stalled - a.weeks_stalled);

  // ---- Consistency ----
  // Build last 10 weeks
  const weekSessions = new Map<string, number>();
  for (const s of sessions) {
    const wk = isoWeek(s.date);
    weekSessions.set(wk, (weekSessions.get(wk) ?? 0) + 1);
  }

  // Generate last 10 ISO weeks ending today
  const weeks: ConsistencyStats["weeks"] = [];
  for (let i = 9; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const wk = isoWeek(d.toISOString().split("T")[0]);
    const lbl = weekLabel(d.toISOString().split("T")[0]);
    weeks.push({ week: wk, label: lbl, sessions: weekSessions.get(wk) ?? 0, target: 3 });
  }

  const weeksWithAtLeastOne = weeks.filter((w) => w.sessions > 0).length;
  const overallPct = Math.round((weeksWithAtLeastOne / weeks.length) * 100);

  // Current streak: consecutive weeks (from most recent) with ≥1 session
  let currentStreak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].sessions > 0) currentStreak++;
    else break;
  }

  let longestStreak = 0;
  let runningStreak = 0;
  for (const w of weeks) {
    if (w.sessions > 0) { runningStreak++; longestStreak = Math.max(longestStreak, runningStreak); }
    else runningStreak = 0;
  }

  const consistency: ConsistencyStats = {
    weeks,
    overall_pct: overallPct,
    current_streak: currentStreak,
    longest_streak: longestStreak,
  };

  // ---- Equipment frequency ----
  const eqSetCount = new Map<string, number>();
  const eqSessionSet = new Map<string, Set<string>>();
  for (const s of sets) {
    const ex = s.exercise_id ? exerciseMap.get(s.exercise_id) : null;
    const eqId = ex?.equipment_id ?? "bodyweight";
    const eqName = ex?.equipment_id
      ? (MOCK_EXERCISES.find((e) => e.id === s.exercise_id)?.name ?? eqId)
      : "Bodyweight";
    eqSetCount.set(eqId, (eqSetCount.get(eqId) ?? 0) + 1);
    if (!eqSessionSet.has(eqId)) eqSessionSet.set(eqId, new Set());
    const sess = sessions.find((ses) => ses.id === s.session_id);
    if (sess) eqSessionSet.get(eqId)!.add(sess.id);
  }

  // Map equipment_id → equipment name via MOCK_EXERCISES
  const { MOCK_EQUIPMENT } = require("@/lib/mock-data");
  const eqNameMap = new Map(
    (MOCK_EQUIPMENT as Array<{ id: string; name: string }>).map((e) => [e.id, e.name])
  );

  const equipmentFrequency: EquipmentFrequency[] = [...eqSetCount.entries()]
    .map(([eqId, setCount]) => {
      const sessCount = eqSessionSet.get(eqId)?.size ?? 0;
      return {
        equipment_id: eqId,
        equipment_name: eqNameMap.get(eqId) ?? eqId,
        sessions: sessCount,
        sets: setCount,
        pct_of_sessions: totalSessions > 0 ? Math.round((sessCount / totalSessions) * 100) : 0,
      };
    })
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  // ---- Most frequent exercises ----
  const exSessionMap = new Map<string, Set<string>>();
  for (const s of sets) {
    if (!s.exercise_id) continue;
    if (!exSessionMap.has(s.exercise_id)) exSessionMap.set(s.exercise_id, new Set());
    const sess = sessions.find((ses) => ses.id === s.session_id);
    if (sess) exSessionMap.get(s.exercise_id)!.add(sess.id);
  }
  const mostFrequentExercises = [...exSessionMap.entries()]
    .map(([exId, sessSet]) => ({
      name: exerciseMap.get(exId)?.name ?? exId,
      sessions: sessSet.size,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 8);

  return {
    topSets,
    trends,
    plateaus,
    consistency,
    equipmentFrequency,
    totalSessions,
    totalSets,
    totalVolumeLbs,
    avgSessionDurationMin,
    mostFrequentExercises,
  };
}

// ---------------------------------------------------------------
// Build a compact text brief for the AI (used by coach + summary)
// ---------------------------------------------------------------
export function buildAnalyticsBrief(
  analytics: AnalyticsBundle,
  phase: { name: string; phase_type: string; rep_range_low: number; rep_range_high: number } | null
): string {
  const lines: string[] = [];

  if (phase) {
    lines.push(`Current Phase: ${phase.name} (${phase.rep_range_low}–${phase.rep_range_high} reps, ${phase.phase_type})`);
  }

  lines.push(`\nOverall: ${analytics.totalSessions} sessions · ${analytics.totalSets} sets · ${Math.round(analytics.totalVolumeLbs / 1000)}k lbs total volume`);
  lines.push(`Consistency: ${analytics.consistency.overall_pct}% weeks active · ${analytics.consistency.current_streak}-week current streak`);
  lines.push(`Avg session: ${Math.round(analytics.avgSessionDurationMin)} min`);

  if (analytics.topSets.length > 0) {
    lines.push(`\nAll-time PRs (estimated 1RM):`);
    for (const ts of analytics.topSets.slice(0, 6)) {
      const wt = ts.weight_lbs > 0 ? `${ts.weight_lbs}lbs × ${ts.reps}r` : `${ts.reps} reps BW`;
      lines.push(`  ${ts.exercise_name}: ${wt} → ~${ts.estimated_1rm}lb 1RM (${ts.date})`);
    }
  }

  if (analytics.plateaus.length > 0) {
    lines.push(`\nPlateaus / stalled lifts:`);
    for (const p of analytics.plateaus) {
      const wt = p.last_pr_weight ? `${p.last_pr_weight}lbs` : "BW";
      lines.push(`  ${p.exercise_name}: ${p.weeks_stalled} weeks stalled at ${wt} × ${p.last_pr_reps}r`);
    }
  }

  if (analytics.mostFrequentExercises.length > 0) {
    lines.push(`\nMost-used exercises: ${analytics.mostFrequentExercises.map((e) => `${e.name} (${e.sessions}×)`).join(", ")}`);
  }

  const progressing = analytics.trends.filter((t) => t.trend === "progressing");
  if (progressing.length > 0) {
    lines.push(`\nCurrently progressing: ${progressing.slice(0, 4).map((t) => `${t.exercise_name} (+${t.weight_delta}lbs)`).join(", ")}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------
// Build recent sessions text (for AI context)
// ---------------------------------------------------------------
export function buildSessionsText(
  sessions: WorkoutSession[],
  sets: WorkoutSet[],
  limit = 10
): string {
  const sorted = [...sessions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);

  return sorted
    .map((session) => {
      const sessionSets = sets.filter((s) => s.session_id === session.id);
      // Group by exercise
      const byEx = new Map<string, WorkoutSet[]>();
      for (const s of sessionSets) {
        if (!s.exercise_id) continue;
        const arr = byEx.get(s.exercise_id) ?? [];
        arr.push(s);
        byEx.set(s.exercise_id, arr);
      }
      const exLines = [...byEx.entries()].map(([exId, exSets]) => {
        const name = exerciseMap.get(exId)?.name ?? exId;
        const setsDesc = exSets
          .filter((s) => !s.is_warmup)
          .map((s) => (s.weight_lbs ? `${s.weight_lbs}lbs×${s.reps}` : `${s.reps}r BW`))
          .join(", ");
        return `  ${name}: ${setsDesc}`;
      });
      return `${session.date}${session.duration_minutes ? ` (${session.duration_minutes}m)` : ""}:\n${exLines.join("\n")}`;
    })
    .join("\n\n");
}
