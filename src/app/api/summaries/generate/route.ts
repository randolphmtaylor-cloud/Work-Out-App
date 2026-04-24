import { NextResponse } from "next/server";
import { generateWeeklySummary } from "@/lib/ai/client";
import { getActivePhase, getSessions, getAllSets, saveSummary } from "@/lib/data";
import { MOCK_EXERCISES } from "@/lib/mock-data";
import { WeeklySummaryStats, WeeklySummary } from "@/types";

const DEMO_USER = "demo-user";

function isoWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { start: fmt(monday), end: fmt(sunday) };
}

export async function POST() {
  const [phase, sessions, allSets] = await Promise.all([
    getActivePhase(DEMO_USER),
    getSessions(DEMO_USER),
    getAllSets(DEMO_USER),
  ]);

  const { start, end } = isoWeekBounds();
  const weekSessions = sessions.filter((s) => s.date >= start && s.date <= end);
  const sessionIds = new Set(weekSessions.map((s) => s.id));
  const weekSets = allSets.filter((s) => sessionIds.has(s.session_id));

  const exerciseMap = new Map(MOCK_EXERCISES.map((e) => [e.id, e.name]));

  // Build top lifts: best set per exercise this week
  const topLiftMap = new Map<string, { weight: number; reps: number }>();
  for (const s of weekSets) {
    if (!s.exercise_id || s.is_warmup) continue;
    const existing = topLiftMap.get(s.exercise_id);
    const newVol = (s.weight_lbs ?? 0) * (s.reps ?? 0);
    const oldVol = existing ? existing.weight * existing.reps : 0;
    if (!existing || newVol > oldVol) {
      topLiftMap.set(s.exercise_id, { weight: s.weight_lbs ?? 0, reps: s.reps ?? 0 });
    }
  }

  const stats: WeeklySummaryStats = {
    sessions_completed: weekSessions.length,
    total_sets: weekSets.filter((s) => !s.is_warmup).length,
    total_volume_lbs: weekSets.reduce((sum, s) => sum + (s.weight_lbs ?? 0) * (s.reps ?? 0), 0),
    exercises_performed: [...new Set(weekSets.map((s) => exerciseMap.get(s.exercise_id ?? "") ?? "Unknown").filter(Boolean))],
    top_lifts: [...topLiftMap.entries()].slice(0, 4).map(([exId, { weight, reps }]) => ({
      exercise: exerciseMap.get(exId) ?? exId,
      best_set: weight > 0 ? `${weight}lbs × ${reps}` : `${reps} reps BW`,
    })),
    days_trained: weekSessions.map((s) => s.date),
  };

  const summaryText = await generateWeeklySummary(weekSessions, weekSets, phase, stats);

  const summary: WeeklySummary = {
    id: crypto.randomUUID(),
    user_id: DEMO_USER,
    week_start: start,
    week_end: end,
    summary_text: summaryText,
    stats,
    generated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  await saveSummary(summary);

  return NextResponse.json(summary);
}
