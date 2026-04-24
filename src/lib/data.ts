// ============================================================
// Data access layer — demo (in-memory store) or Supabase
// ============================================================
import {
  WorkoutSession,
  WorkoutSet,
  TrainingPhase,
  GeneratedRoutine,
  WeeklySummary,
  Exercise,
  Equipment,
} from "@/types";
import { MOCK_EXERCISES, MOCK_EQUIPMENT } from "@/lib/mock-data";

export const isDemo = () =>
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

// ---------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------
export async function getSessions(userId: string): Promise<WorkoutSession[]> {
  if (isDemo()) {
    const { storeSessions } = await import("@/lib/store");
    return storeSessions();
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getRecentSessions(userId: string, limit = 10): Promise<WorkoutSession[]> {
  const all = await getSessions(userId);
  return all.slice(0, limit);
}

// ---------------------------------------------------------------
// Sets
// ---------------------------------------------------------------
export async function getSetsForSessions(sessionIds: string[]): Promise<WorkoutSet[]> {
  if (isDemo()) {
    const { storeSetsForSessions } = await import("@/lib/store");
    return storeSetsForSessions(sessionIds);
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sets")
    .select("*")
    .in("session_id", sessionIds);
  if (error) throw error;
  return data ?? [];
}

export async function getAllSets(userId: string): Promise<WorkoutSet[]> {
  if (isDemo()) {
    const { storeSets } = await import("@/lib/store");
    return storeSets();
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: sessions } = await supabase.from("workout_sessions").select("id").eq("user_id", userId);
  const ids = (sessions ?? []).map((s: { id: string }) => s.id);
  if (!ids.length) return [];
  const { data, error } = await supabase.from("workout_sets").select("*").in("session_id", ids);
  if (error) throw error;
  return data ?? [];
}

export async function updateSet(id: string, patch: Partial<WorkoutSet>): Promise<void> {
  if (isDemo()) {
    const { storeUpdateSet } = await import("@/lib/store");
    storeUpdateSet(id, patch);
    return;
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.from("workout_sets").update(patch).eq("id", id);
}

// ---------------------------------------------------------------
// Phases
// ---------------------------------------------------------------
export async function getActivePhase(userId: string): Promise<TrainingPhase | null> {
  if (isDemo()) {
    const { storeActivePhase } = await import("@/lib/store");
    return storeActivePhase();
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase.from("training_phases").select("*").eq("user_id", userId).eq("is_active", true).single();
  return data ?? null;
}

export async function getPhases(userId: string): Promise<TrainingPhase[]> {
  if (isDemo()) {
    const { storePhases } = await import("@/lib/store");
    return storePhases();
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.from("training_phases").select("*").eq("user_id", userId).order("start_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function advancePhaseInStore(next: TrainingPhase): Promise<void> {
  if (isDemo()) {
    const { storeAdvancePhase } = await import("@/lib/store");
    storeAdvancePhase(next);
    return;
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.from("training_phases").update({ is_active: false }).eq("user_id", next.user_id);
  await supabase.from("training_phases").insert(next);
}

// ---------------------------------------------------------------
// Routines
// ---------------------------------------------------------------
export async function getTodayRoutine(userId: string): Promise<GeneratedRoutine | null> {
  if (isDemo()) {
    const { storeTodayRoutine } = await import("@/lib/store");
    return storeTodayRoutine(userId);
  }
  const today = new Date().toISOString().split("T")[0];
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase
    .from("generated_routines")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data ?? null;
}

export async function saveGeneratedRoutine(routine: GeneratedRoutine): Promise<void> {
  if (isDemo()) {
    const { storeUpsertRoutine } = await import("@/lib/store");
    storeUpsertRoutine(routine);
    return;
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.from("generated_routines").upsert(routine);
}

export async function markRoutineComplete(routineId: string, sessionId: string): Promise<void> {
  if (isDemo()) {
    const { storeMarkRoutineComplete } = await import("@/lib/store");
    storeMarkRoutineComplete(routineId, sessionId);
    return;
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.from("generated_routines").update({ was_completed: true, completed_session_id: sessionId }).eq("id", routineId);
}

// ---------------------------------------------------------------
// Weekly Summary
// ---------------------------------------------------------------
export async function getLatestSummary(userId: string): Promise<WeeklySummary | null> {
  if (isDemo()) {
    const { storeLatestSummary } = await import("@/lib/store");
    return storeLatestSummary(userId);
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase.from("weekly_summaries").select("*").eq("user_id", userId).order("week_start", { ascending: false }).limit(1).single();
  return data ?? null;
}

export async function saveSummary(summary: WeeklySummary): Promise<void> {
  if (isDemo()) {
    const { storeUpsertSummary } = await import("@/lib/store");
    storeUpsertSummary(summary);
    return;
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.from("weekly_summaries").upsert(summary);
}

// ---------------------------------------------------------------
// Exercises / Equipment
// ---------------------------------------------------------------
export async function getExercises(): Promise<Exercise[]> {
  if (isDemo()) return MOCK_EXERCISES;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase.from("exercise_definitions").select("*");
  return data ?? MOCK_EXERCISES;
}

export async function getEquipment(): Promise<Equipment[]> {
  if (isDemo()) return MOCK_EQUIPMENT;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase.from("equipment").select("*");
  return data ?? MOCK_EQUIPMENT;
}

// ---------------------------------------------------------------
// Insert session + sets
// ---------------------------------------------------------------
export async function insertSessionWithSets(
  session: WorkoutSession,
  sets: WorkoutSet[]
): Promise<void> {
  if (isDemo()) {
    const { storeInsertSession, storeInsertSets } = await import("@/lib/store");
    storeInsertSession(session);
    storeInsertSets(sets);
    return;
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error: sessionError } = await supabase.from("workout_sessions").insert(session);
  if (sessionError) throw sessionError;
  if (sets.length > 0) {
    const { error: setsError } = await supabase.from("workout_sets").insert(sets);
    if (setsError) throw setsError;
  }
}
