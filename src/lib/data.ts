// ============================================================
// Data access layer — demo (in-memory store) or Supabase
// ============================================================
import {
  WorkoutSession,
  WorkoutSet,
  TrainingPhase,
  GeneratedRoutine,
  WeeklySummary,
  Equipment,
  Exercise,
  CanonicalExercise,
} from "@/types";
import { MOCK_EXERCISES, MOCK_EQUIPMENT } from "@/lib/mock-data";
import { DEFAULT_CANONICAL_EXERCISES } from "@/lib/canonical-exercises";
import { getSupabasePublicEnv } from "@/lib/supabase/config";

export interface InsertSessionWithSetsResult {
  inserted: boolean;
  skipped: boolean;
  sessionId: string;
  setsInserted: number;
  error?: string;
}

export const isDemo = () =>
  !getSupabasePublicEnv().isConfigured;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidUuid = (value: string) => UUID_REGEX.test(value);

function logSupabaseError(context: string, error: unknown) {
  const supabaseError =
    error && typeof error === "object"
      ? (error as {
          message?: unknown;
          code?: unknown;
          details?: unknown;
          hint?: unknown;
        })
      : null;

  console.error(`[data] ${context}`, {
    message: supabaseError?.message,
    code: supabaseError?.code,
    details: supabaseError?.details,
    hint: supabaseError?.hint,
    error,
  });
}

function toCanonicalName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mapExerciseStatus(notes?: string): Exercise["status"] {
  return notes?.includes("status:unreviewed") ? "unreviewed" : "active";
}

function toCanonicalSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------
export async function getSessions(userId: string): Promise<WorkoutSession[]> {
  if (isDemo()) {
    const { storeSessions } = await import("@/lib/store");
    return storeSessions();
  }
  if (!isValidUuid(userId)) {
    console.error("[data] getSessions invalid userId", userId);
    return [];
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) {
    logSupabaseError("getSessions failed", error);
    return [];
  }
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
  const validSessionIds = sessionIds.filter(isValidUuid);
  if (validSessionIds.length === 0) return [];
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sets")
    .select("*")
    .in("session_id", validSessionIds);
  if (error) {
    logSupabaseError("getSetsForSessions failed", error);
    return [];
  }
  return data ?? [];
}

export async function getAllSets(userId: string): Promise<WorkoutSet[]> {
  if (isDemo()) {
    const { storeSets } = await import("@/lib/store");
    return storeSets();
  }
  if (!isValidUuid(userId)) {
    console.error("[data] getAllSets invalid userId", userId);
    return [];
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: sessions, error: sessionsError } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", userId);
  if (sessionsError) {
    logSupabaseError("getAllSets session lookup failed", sessionsError);
    return [];
  }
  const ids = (sessions ?? []).map((s: { id: string }) => s.id);
  if (!ids.length) return [];
  const { data, error } = await supabase.from("workout_sets").select("*").in("session_id", ids);
  if (error) {
    logSupabaseError("getAllSets set lookup failed", error);
    return [];
  }
  return data ?? [];
}

export async function updateSet(id: string, patch: Partial<WorkoutSet>): Promise<void> {
  if (isDemo()) {
    const { storeUpdateSet } = await import("@/lib/store");
    storeUpdateSet(id, patch);
    return;
  }
  if (!isValidUuid(id)) {
    console.error("[data] updateSet invalid id", id);
    return;
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase.from("workout_sets").update(patch).eq("id", id);
  if (error) logSupabaseError("updateSet failed", error);
}

// ---------------------------------------------------------------
// Phases
// ---------------------------------------------------------------
export async function getActivePhase(userId: string): Promise<TrainingPhase | null> {
  if (isDemo()) {
    const { storeActivePhase } = await import("@/lib/store");
    return storeActivePhase();
  }
  if (!isValidUuid(userId)) {
    console.error("[data] getActivePhase invalid userId", userId);
    return null;
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_phases")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    logSupabaseError("getActivePhase failed", error);
    return null;
  }
  return data ?? null;
}

export async function getPhases(userId: string): Promise<TrainingPhase[]> {
  if (isDemo()) {
    const { storePhases } = await import("@/lib/store");
    return storePhases();
  }
  if (!isValidUuid(userId)) {
    console.error("[data] getPhases invalid userId", userId);
    return [];
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.from("training_phases").select("*").eq("user_id", userId).order("start_date", { ascending: false });
  if (error) {
    logSupabaseError("getPhases failed", error);
    return [];
  }
  return data ?? [];
}

export async function advancePhaseInStore(next: TrainingPhase): Promise<void> {
  if (isDemo()) {
    const { storeAdvancePhase } = await import("@/lib/store");
    storeAdvancePhase(next);
    return;
  }
  if (!isValidUuid(next.user_id)) {
    console.error("[data] advancePhaseInStore invalid userId", next.user_id);
    return;
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error: deactivateError } = await supabase
    .from("training_phases")
    .update({ is_active: false })
    .eq("user_id", next.user_id);
  if (deactivateError) {
    logSupabaseError("advancePhaseInStore deactivate failed", deactivateError);
    return;
  }
  const { error: insertError } = await supabase.from("training_phases").insert(next);
  if (insertError) logSupabaseError("advancePhaseInStore insert failed", insertError);
}

// ---------------------------------------------------------------
// Routines
// ---------------------------------------------------------------
export async function getTodayRoutine(userId: string): Promise<GeneratedRoutine | null> {
  if (isDemo()) {
    const { storeTodayRoutine } = await import("@/lib/store");
    return storeTodayRoutine(userId);
  }
  if (!isValidUuid(userId)) {
    console.error("[data] getTodayRoutine invalid userId", userId);
    return null;
  }
  const today = new Date().toISOString().split("T")[0];
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("generated_routines")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    logSupabaseError("getTodayRoutine failed", error);
    return null;
  }
  return data ?? null;
}

export async function saveGeneratedRoutine(routine: GeneratedRoutine): Promise<void> {
  if (isDemo()) {
    const { storeUpsertRoutine } = await import("@/lib/store");
    storeUpsertRoutine(routine);
    return;
  }
  if (!isValidUuid(routine.user_id)) {
    console.error("[data] saveGeneratedRoutine invalid userId", routine.user_id);
    return;
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase.from("generated_routines").upsert(routine);
  if (error) logSupabaseError("saveGeneratedRoutine failed", error);
}

export async function markRoutineComplete(routineId: string, sessionId: string): Promise<void> {
  if (isDemo()) {
    const { storeMarkRoutineComplete } = await import("@/lib/store");
    storeMarkRoutineComplete(routineId, sessionId);
    return;
  }
  if (!isValidUuid(routineId) || !isValidUuid(sessionId)) {
    console.error("[data] markRoutineComplete invalid ids", { routineId, sessionId });
    return;
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("generated_routines")
    .update({ was_completed: true, completed_session_id: sessionId })
    .eq("id", routineId);
  if (error) logSupabaseError("markRoutineComplete failed", error);
}

// ---------------------------------------------------------------
// Weekly Summary
// ---------------------------------------------------------------
export async function getLatestSummary(userId: string): Promise<WeeklySummary | null> {
  if (isDemo()) {
    const { storeLatestSummary } = await import("@/lib/store");
    return storeLatestSummary(userId);
  }
  if (!isValidUuid(userId)) {
    console.error("[data] getLatestSummary invalid userId", userId);
    return null;
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_summaries")
    .select("*")
    .eq("user_id", userId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    logSupabaseError("getLatestSummary failed", error);
    return null;
  }
  return data ?? null;
}

export async function saveSummary(summary: WeeklySummary): Promise<void> {
  if (isDemo()) {
    const { storeUpsertSummary } = await import("@/lib/store");
    storeUpsertSummary(summary);
    return;
  }
  if (!isValidUuid(summary.user_id)) {
    console.error("[data] saveSummary invalid userId", summary.user_id);
    return;
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase.from("weekly_summaries").upsert(summary);
  if (error) logSupabaseError("saveSummary failed", error);
}

// ---------------------------------------------------------------
// Exercises / Equipment
// ---------------------------------------------------------------
export async function getExercises(): Promise<Exercise[]> {
  if (isDemo()) {
    const { storeExercises } = await import("@/lib/store");
    return storeExercises();
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.from("exercise_definitions").select("*");
  if (error) {
    logSupabaseError("getExercises failed", error);
    return MOCK_EXERCISES;
  }
  return (data ?? MOCK_EXERCISES).map((exercise) => ({
    ...exercise,
    status: mapExerciseStatus(exercise.notes),
  }));
}

export async function getCanonicalExercises(): Promise<CanonicalExercise[]> {
  if (isDemo()) {
    const { storeCanonicalExercises } = await import("@/lib/store");
    return storeCanonicalExercises();
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.from("canonical_exercises").select("*").order("name");
  if (error) {
    logSupabaseError("getCanonicalExercises failed", error);
    return DEFAULT_CANONICAL_EXERCISES;
  }
  return data ?? DEFAULT_CANONICAL_EXERCISES;
}

export async function getUnreviewedExercises(): Promise<Exercise[]> {
  const exercises = await getExercises();
  return exercises.filter((exercise) => exercise.status === "unreviewed");
}

export async function getEquipment(): Promise<Equipment[]> {
  if (isDemo()) return MOCK_EQUIPMENT;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase.from("equipment").select("*");
  return data ?? MOCK_EQUIPMENT;
}

export async function createUnreviewedExercise(
  name: string,
  aliases: string[] = []
): Promise<{ exercise: Exercise; created: boolean }> {
  const existingExercises = await getExercises();
  const lower = name.trim().toLowerCase();
  const matched = existingExercises.find(
    (exercise) =>
      exercise.name.toLowerCase() === lower ||
      exercise.canonical_name.toLowerCase() === lower ||
      exercise.aliases.some((alias) => alias.toLowerCase() === lower)
  );
  if (matched) {
    return { exercise: matched, created: false };
  }

  const canonicalName = toCanonicalName(name);
  if (!canonicalName) {
    throw new Error("Invalid exercise name");
  }

  if (isDemo()) {
    const {
      storeFindExerciseByCanonical,
      storeFindExerciseByNameOrAlias,
      storeCreateUnreviewedExercise,
    } = await import("@/lib/store");
    const existingByName = storeFindExerciseByNameOrAlias(name);
    if (existingByName) {
      return { exercise: existingByName, created: false };
    }
    const existing = storeFindExerciseByCanonical(canonicalName);
    if (existing) {
      return { exercise: existing, created: false };
    }
    const exercise = storeCreateUnreviewedExercise(name, aliases);
    return { exercise, created: true };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("exercise_definitions")
    .select("*")
    .eq("canonical_name", canonicalName)
    .maybeSingle();
  if (existingError) {
    logSupabaseError("createUnreviewedExercise existing lookup failed", existingError);
  }
  if (existing) {
    return {
      exercise: {
        ...existing,
        status: mapExerciseStatus(existing.notes),
      },
      created: false,
    };
  }

  const payload = {
    id: crypto.randomUUID(),
    name,
    canonical_name: canonicalName,
    aliases: Array.from(new Set(aliases.map((a) => a.trim()).filter(Boolean))),
    muscle_groups: [],
    tags: [],
    notes: "status:unreviewed",
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("exercise_definitions")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    logSupabaseError("createUnreviewedExercise insert failed", error);
    return {
      exercise: {
        id: payload.id,
        name: payload.name,
        canonical_name: payload.canonical_name,
        aliases: payload.aliases,
        muscle_groups: [],
        tags: [],
        notes: payload.notes,
        status: "unreviewed",
        created_at: payload.created_at,
      },
      created: true,
    };
  }

  return {
    exercise: {
      ...data,
      status: "unreviewed",
    },
    created: true,
  };
}

// ---------------------------------------------------------------
// Insert session + sets
// ---------------------------------------------------------------
export async function insertSessionWithSets(
  session: WorkoutSession,
  sets: WorkoutSet[]
): Promise<void> {
  await insertSessionWithSetsIfNew(session, sets);
}

export async function insertSessionWithSetsIfNew(
  session: WorkoutSession,
  sets: WorkoutSet[]
): Promise<InsertSessionWithSetsResult> {
  if (isDemo()) {
    const { storeInsertSession, storeInsertSets, storeSessionExistsBySourceId } = await import("@/lib/store");
    if (session.source_id && storeSessionExistsBySourceId(session.user_id, session.source_id)) {
      return {
        inserted: false,
        skipped: true,
        sessionId: session.id,
        setsInserted: 0,
      };
    }
    storeInsertSession(session);
    storeInsertSets(sets);
    return {
      inserted: true,
      skipped: false,
      sessionId: session.id,
      setsInserted: sets.length,
    };
  }
  if (!isValidUuid(session.user_id)) {
    console.error("[data] insertSessionWithSets invalid userId", session.user_id);
    return {
      inserted: false,
      skipped: false,
      sessionId: session.id,
      setsInserted: 0,
      error: "Invalid user id",
    };
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  if (session.source_id) {
    const { data: existing, error: existingError } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("user_id", session.user_id)
      .eq("source_id", session.source_id)
      .maybeSingle();

    if (existingError) {
      logSupabaseError("insertSessionWithSets duplicate lookup failed", existingError);
    }

    if (existing) {
      return {
        inserted: false,
        skipped: true,
        sessionId: existing.id,
        setsInserted: 0,
      };
    }
  }

  const { error: sessionError } = await supabase.from("workout_sessions").insert(session);
  if (sessionError) {
    logSupabaseError("insertSessionWithSets session insert failed", sessionError);
    const code = typeof sessionError === "object" && sessionError && "code" in sessionError
      ? String(sessionError.code)
      : "";
    return {
      inserted: false,
      skipped: code === "23505",
      sessionId: session.id,
      setsInserted: 0,
      error: code === "23505" ? undefined : "Session insert failed",
    };
  }
  if (sets.length > 0) {
    const { error: setsError } = await supabase.from("workout_sets").insert(sets);
    if (setsError) {
      logSupabaseError("insertSessionWithSets sets insert failed", setsError);
      return {
        inserted: true,
        skipped: false,
        sessionId: session.id,
        setsInserted: 0,
        error: "Set insert failed",
      };
    }
  }
  return {
    inserted: true,
    skipped: false,
    sessionId: session.id,
    setsInserted: sets.length,
  };
}

export async function mapUnreviewedExerciseToCanonical(
  exerciseId: string,
  canonicalExerciseId: string
): Promise<{ remappedSets: number }> {
  if (isDemo()) {
    const { storeMapExerciseToCanonical } = await import("@/lib/store");
    return storeMapExerciseToCanonical(exerciseId, canonicalExerciseId);
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data: canonical, error: canonicalError } = await supabase
    .from("canonical_exercises")
    .select("*")
    .eq("id", canonicalExerciseId)
    .maybeSingle();
  if (canonicalError || !canonical) {
    logSupabaseError("mapUnreviewedExerciseToCanonical canonical lookup failed", canonicalError);
    return { remappedSets: 0 };
  }

  const targetSlug = toCanonicalSlug(canonical.name);
  let targetExerciseId = "";
  const { data: existingTarget, error: targetError } = await supabase
    .from("exercise_definitions")
    .select("*")
    .eq("canonical_name", targetSlug)
    .maybeSingle();
  if (targetError) {
    logSupabaseError("mapUnreviewedExerciseToCanonical target lookup failed", targetError);
  }

  if (existingTarget) {
    targetExerciseId = existingTarget.id;
  } else {
    const payload = {
      id: crypto.randomUUID(),
      name: canonical.name,
      canonical_name: targetSlug,
      aliases: [canonical.name],
      muscle_groups: [],
      tags: [],
      notes: "status:active",
      created_at: new Date().toISOString(),
    };
    const { data: created, error: createError } = await supabase
      .from("exercise_definitions")
      .insert(payload)
      .select("*")
      .single();
    if (createError || !created) {
      logSupabaseError("mapUnreviewedExerciseToCanonical target create failed", createError);
      return { remappedSets: 0 };
    }
    targetExerciseId = created.id;
  }

  const { data: setsToRemap, error: setsLookupError } = await supabase
    .from("workout_sets")
    .select("id")
    .eq("exercise_id", exerciseId);
  if (setsLookupError) {
    logSupabaseError("mapUnreviewedExerciseToCanonical set lookup failed", setsLookupError);
    return { remappedSets: 0 };
  }

  const { error: remapError } = await supabase
    .from("workout_sets")
    .update({ exercise_id: targetExerciseId })
    .eq("exercise_id", exerciseId);
  if (remapError) {
    logSupabaseError("mapUnreviewedExerciseToCanonical remap failed", remapError);
    return { remappedSets: 0 };
  }

  const mappingPayload = {
    id: crypto.randomUUID(),
    exercise_id: exerciseId,
    canonical_exercise_id: canonicalExerciseId,
    created_at: new Date().toISOString(),
  };
  const { error: mappingError } = await supabase
    .from("exercise_canonical_mappings")
    .upsert(mappingPayload, { onConflict: "exercise_id" });
  if (mappingError) {
    logSupabaseError("mapUnreviewedExerciseToCanonical mapping upsert failed", mappingError);
  }

  const { error: markError } = await supabase
    .from("exercise_definitions")
    .update({ notes: `status:mapped;canonical:${canonical.name}` })
    .eq("id", exerciseId);
  if (markError) {
    logSupabaseError("mapUnreviewedExerciseToCanonical source status update failed", markError);
  }

  return { remappedSets: (setsToRemap ?? []).length };
}
