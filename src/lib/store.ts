// ============================================================
// In-memory mutable store — demo mode persistence
//
// Wraps mock seed data and allows mutations (import, logging).
// Data persists for the lifetime of the Node.js process and
// resets on server restart. In production, swap every function
// here for the equivalent Supabase query.
// ============================================================
import {
  WorkoutSession,
  WorkoutSet,
  TrainingPhase,
  GeneratedRoutine,
  WeeklySummary,
} from "@/types";
import {
  MOCK_SESSIONS,
  MOCK_SETS,
  MOCK_PHASES,
  MOCK_ACTIVE_PHASE,
  MOCK_LATEST_SUMMARY,
} from "@/lib/mock-data";

// ---- Mutable store (module-level, server-side only) ----
const store = {
  sessions: [...MOCK_SESSIONS] as WorkoutSession[],
  sets:     [...MOCK_SETS]     as WorkoutSet[],
  phases:   [...MOCK_PHASES]   as TrainingPhase[],
  routines: []                 as GeneratedRoutine[],
  summaries: [MOCK_LATEST_SUMMARY] as WeeklySummary[],
};

// ---- Sessions ----
export function storeSessions(): WorkoutSession[] {
  return [...store.sessions].sort((a, b) => b.date.localeCompare(a.date));
}

export function storeInsertSession(session: WorkoutSession): void {
  // Deduplicate by id
  store.sessions = store.sessions.filter((s) => s.id !== session.id);
  store.sessions.push(session);
}

// ---- Sets ----
export function storeSets(): WorkoutSet[] {
  return store.sets;
}

export function storeSetsForSessions(sessionIds: string[]): WorkoutSet[] {
  const ids = new Set(sessionIds);
  return store.sets.filter((s) => ids.has(s.session_id));
}

export function storeInsertSets(sets: WorkoutSet[]): void {
  const existingIds = new Set(store.sets.map((s) => s.id));
  store.sets.push(...sets.filter((s) => !existingIds.has(s.id)));
}

export function storeUpdateSet(id: string, patch: Partial<WorkoutSet>): void {
  const idx = store.sets.findIndex((s) => s.id === id);
  if (idx !== -1) store.sets[idx] = { ...store.sets[idx], ...patch };
}

// ---- Phases ----
export function storeActivePhase(): TrainingPhase | null {
  return store.phases.find((p) => p.is_active) ?? null;
}

export function storePhases(): TrainingPhase[] {
  return [...store.phases].sort((a, b) => b.start_date.localeCompare(a.start_date));
}

export function storeAdvancePhase(next: TrainingPhase): void {
  // Deactivate all current phases
  store.phases = store.phases.map((p) => ({ ...p, is_active: false }));
  store.phases.push(next);
}

// ---- Routines ----
export function storeTodayRoutine(userId: string): GeneratedRoutine | null {
  const today = new Date().toISOString().split("T")[0];
  return (
    store.routines
      .filter((r) => r.user_id === userId && r.date === today)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
  );
}

export function storeUpsertRoutine(routine: GeneratedRoutine): void {
  store.routines = store.routines.filter(
    (r) => !(r.user_id === routine.user_id && r.date === routine.date)
  );
  store.routines.push(routine);
}

export function storeMarkRoutineComplete(
  routineId: string,
  sessionId: string
): void {
  const idx = store.routines.findIndex((r) => r.id === routineId);
  if (idx !== -1) {
    store.routines[idx].was_completed = true;
    store.routines[idx].completed_session_id = sessionId;
  }
}

// ---- Summaries ----
export function storeLatestSummary(userId: string): WeeklySummary | null {
  return (
    store.summaries
      .filter((s) => s.user_id === userId)
      .sort((a, b) => b.week_start.localeCompare(a.week_start))[0] ?? null
  );
}

export function storeUpsertSummary(summary: WeeklySummary): void {
  store.summaries = store.summaries.filter(
    (s) => !(s.user_id === summary.user_id && s.week_start === summary.week_start)
  );
  store.summaries.push(summary);
}
