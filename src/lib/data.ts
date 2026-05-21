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
  ImportBatch,
  LegacyImportPreview,
  ExerciseLibraryCategory,
  MuscleGroup,
  WorkoutTag,
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

function mapExerciseStatus(notes?: string, archivedAt?: string | null): Exercise["status"] {
  if (archivedAt) return "archived";
  if (notes?.includes("status:archived")) return "archived";
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

export async function getWorkoutSessionWithSets(
  userId: string,
  sessionId: string
): Promise<{ session: WorkoutSession; sets: WorkoutSet[] } | null> {
  if (isDemo()) {
    const { storeSessionById, storeSetsForSessions } = await import("@/lib/store");
    const session = storeSessionById(userId, sessionId);
    if (!session) return null;
    return { session, sets: storeSetsForSessions([sessionId]) };
  }
  if (!isValidUuid(userId) || !sessionId) {
    console.error("[data] getWorkoutSessionWithSets invalid ids", { userId, sessionId });
    return null;
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (sessionError) {
    logSupabaseError("getWorkoutSessionWithSets session lookup failed", sessionError);
    return null;
  }
  if (!session) return null;
  const { data: sets, error: setsError } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (setsError) {
    logSupabaseError("getWorkoutSessionWithSets sets lookup failed", setsError);
    return null;
  }
  return { session, sets: sets ?? [] };
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

export async function updateWorkoutSessionWithSets(
  userId: string,
  sessionPatch: Pick<WorkoutSession, "id" | "date" | "notes" | "workout_type" | "duration_minutes">,
  sets: WorkoutSet[]
): Promise<{ success: boolean; session?: WorkoutSession; sets?: WorkoutSet[]; error?: string }> {
  if (isDemo()) {
    const { storeSessionById, storeUpdateSessionWithSets } = await import("@/lib/store");
    const existing = storeSessionById(userId, sessionPatch.id);
    if (!existing) return { success: false, error: "Workout session not found." };
    const updated = storeUpdateSessionWithSets(userId, { ...existing, ...sessionPatch }, sets);
    return updated ? { success: true, session: updated, sets } : { success: false, error: "Workout update failed." };
  }
  if (!isValidUuid(userId) || !sessionPatch.id) {
    return { success: false, error: "Invalid workout session id." };
  }
  const existing = await getWorkoutSessionWithSets(userId, sessionPatch.id);
  if (!existing) return { success: false, error: "Workout session not found." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const sessionPayload = {
    date: sessionPatch.date,
    notes: sessionPatch.notes ?? null,
    workout_type: sessionPatch.workout_type ?? null,
    duration_minutes: sessionPatch.duration_minutes ?? null,
  };

  const { data: updatedSession, error: sessionError } = await supabase
    .from("workout_sessions")
    .update(sessionPayload)
    .eq("id", sessionPatch.id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (sessionError || !updatedSession) {
    logSupabaseError("updateWorkoutSessionWithSets session update failed", sessionError);
    return { success: false, error: sessionError?.message ?? "Workout update failed." };
  }

  const { error: deleteError } = await supabase.from("workout_sets").delete().eq("session_id", sessionPatch.id);
  if (deleteError) {
    logSupabaseError("updateWorkoutSessionWithSets set delete failed", deleteError);
    return { success: false, error: deleteError.message ?? "Could not replace workout sets." };
  }

  if (sets.length > 0) {
    const { error: insertError } = await supabase.from("workout_sets").insert(sets);
    if (insertError) {
      logSupabaseError("updateWorkoutSessionWithSets set insert failed", insertError);
      const { error: restoreSessionError } = await supabase
        .from("workout_sessions")
        .update({
          date: existing.session.date,
          notes: existing.session.notes ?? null,
          workout_type: existing.session.workout_type ?? null,
          duration_minutes: existing.session.duration_minutes ?? null,
        })
        .eq("id", existing.session.id)
        .eq("user_id", userId);
      if (restoreSessionError) logSupabaseError("updateWorkoutSessionWithSets session restore failed", restoreSessionError);
      if (existing.sets.length > 0) {
        const { error: restoreSetsError } = await supabase.from("workout_sets").insert(existing.sets);
        if (restoreSetsError) logSupabaseError("updateWorkoutSessionWithSets sets restore failed", restoreSetsError);
      }
      return { success: false, error: insertError.message ?? "Could not save workout sets. Your edits were not applied." };
    }
  }

  return { success: true, session: updatedSession, sets };
}

export async function deleteWorkoutSession(
  userId: string,
  sessionId: string
): Promise<{ success: boolean; sessions_deleted: number; sets_deleted: number; error?: string }> {
  if (isDemo()) {
    const { storeDeleteSession } = await import("@/lib/store");
    const deleted = storeDeleteSession(userId, sessionId);
    return deleted.sessions_deleted
      ? { success: true, ...deleted }
      : { success: false, sessions_deleted: 0, sets_deleted: 0, error: "Workout session not found." };
  }
  if (!isValidUuid(userId) || !sessionId) {
    return { success: false, sessions_deleted: 0, sets_deleted: 0, error: "Invalid workout session id." };
  }
  const existing = await getWorkoutSessionWithSets(userId, sessionId);
  if (!existing) {
    return { success: false, sessions_deleted: 0, sets_deleted: 0, error: "Workout session not found." };
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("id");
  if (error) {
    logSupabaseError("deleteWorkoutSession failed", error);
    return { success: false, sessions_deleted: 0, sets_deleted: 0, error: error.message ?? "Workout delete failed." };
  }
  return {
    success: true,
    sessions_deleted: data?.length ?? 0,
    sets_deleted: existing.sets.length,
  };
}

// ---------------------------------------------------------------
// Imports
// ---------------------------------------------------------------
export async function createImportBatch(
  userId: string,
  input: { source_file_name: string; workout_count: number; notes?: string; id?: string }
): Promise<ImportBatch | null> {
  const batch: ImportBatch = {
    id: input.id ?? crypto.randomUUID(),
    user_id: userId,
    created_at: new Date().toISOString(),
    source_file_name: input.source_file_name,
    workout_count: input.workout_count,
    notes: input.notes,
  };

  if (isDemo()) {
    const { storeCreateImportBatch } = await import("@/lib/store");
    return storeCreateImportBatch(batch);
  }
  if (!isValidUuid(userId)) {
    console.error("[data] createImportBatch invalid userId", userId);
    return null;
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.from("import_batches").insert(batch).select("*").single();
  if (error || !data) {
    logSupabaseError("createImportBatch failed", error);
    return null;
  }
  return data;
}

export async function getImportBatches(userId: string): Promise<ImportBatch[]> {
  if (isDemo()) {
    const { storeImportBatches } = await import("@/lib/store");
    return storeImportBatches(userId);
  }
  if (!isValidUuid(userId)) {
    console.error("[data] getImportBatches invalid userId", userId);
    return [];
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_import_batches");
  if (error) {
    logSupabaseError("getImportBatches failed", error);
    return [];
  }
  return (data ?? []) as ImportBatch[];
}

export async function updateImportBatch(
  userId: string,
  importId: string,
  patch: Pick<Partial<ImportBatch>, "source_file_name" | "notes" | "workout_count">
): Promise<ImportBatch | null> {
  if (isDemo()) {
    const { storeUpdateImportBatch } = await import("@/lib/store");
    return storeUpdateImportBatch(userId, importId, patch);
  }
  if (!isValidUuid(userId) || !isValidUuid(importId)) {
    console.error("[data] updateImportBatch invalid ids", { userId, importId });
    return null;
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_batches")
    .update(patch)
    .eq("id", importId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error || !data) {
    logSupabaseError("updateImportBatch failed", error);
    return null;
  }
  return data;
}

export async function undoImportBatch(
  userId: string,
  importId: string
): Promise<{ success: boolean; sessions_deleted: number; sets_deleted: number; error?: string }> {
  if (isDemo()) {
    const { storeUndoImportBatch } = await import("@/lib/store");
    return { success: true, ...storeUndoImportBatch(userId, importId) };
  }
  if (!isValidUuid(userId) || !isValidUuid(importId)) {
    return { success: false, sessions_deleted: 0, sets_deleted: 0, error: "Invalid import id" };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("undo_import_batch", { p_import_batch_id: importId });
  if (error) {
    logSupabaseError("undoImportBatch failed", error);
    return { success: false, sessions_deleted: 0, sets_deleted: 0, error: error.message ?? "Undo failed" };
  }
  const result = Array.isArray(data) ? data[0] : data;
  return {
    success: true,
    sessions_deleted: Number(result?.sessions_deleted ?? 0),
    sets_deleted: Number(result?.sets_deleted ?? 0),
  };
}

export async function undoAllImportBatches(
  userId: string
): Promise<{ success: boolean; batches_deleted: number; sessions_deleted: number; sets_deleted: number; error?: string }> {
  if (isDemo()) {
    const { storeUndoAllImportBatches } = await import("@/lib/store");
    return { success: true, ...storeUndoAllImportBatches(userId) };
  }
  if (!isValidUuid(userId)) {
    return { success: false, batches_deleted: 0, sessions_deleted: 0, sets_deleted: 0, error: "Invalid user id" };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_all_imported_history");
  if (error) {
    logSupabaseError("undoAllImportBatches failed", error);
    return { success: false, batches_deleted: 0, sessions_deleted: 0, sets_deleted: 0, error: error.message ?? "Delete all failed" };
  }
  const result = Array.isArray(data) ? data[0] : data;
  return {
    success: true,
    batches_deleted: Number(result?.batches_deleted ?? 0),
    sessions_deleted: Number(result?.sessions_deleted ?? 0),
    sets_deleted: Number(result?.sets_deleted ?? 0),
  };
}

export async function resetWorkoutHistory(
  userId: string
): Promise<{ success: boolean; sessions_deleted: number; sets_deleted: number; imports_deleted: number; summaries_deleted: number; routines_deleted: number; error?: string }> {
  if (isDemo()) {
    const { storeResetWorkoutHistory } = await import("@/lib/store");
    return { success: true, ...storeResetWorkoutHistory(userId) };
  }
  if (!isValidUuid(userId)) {
    return { success: false, sessions_deleted: 0, sets_deleted: 0, imports_deleted: 0, summaries_deleted: 0, routines_deleted: 0, error: "Invalid user id" };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reset_workout_history");
  if (error) {
    logSupabaseError("resetWorkoutHistory failed", error);
    return { success: false, sessions_deleted: 0, sets_deleted: 0, imports_deleted: 0, summaries_deleted: 0, routines_deleted: 0, error: error.message ?? "Reset failed" };
  }
  const result = Array.isArray(data) ? data[0] : data;
  return {
    success: true,
    sessions_deleted: Number(result?.sessions_deleted ?? 0),
    sets_deleted: Number(result?.sets_deleted ?? 0),
    imports_deleted: Number(result?.imports_deleted ?? 0),
    summaries_deleted: Number(result?.summaries_deleted ?? 0),
    routines_deleted: Number(result?.routines_deleted ?? 0),
  };
}

export async function getLegacyImportCandidateCount(userId: string): Promise<number> {
  return (await getLegacyImportPreview(userId)).found;
}

export async function getLegacyImportPreview(userId: string): Promise<LegacyImportPreview> {
  if (isDemo()) {
    const { storeLegacyImportPreview } = await import("@/lib/store");
    const preview = storeLegacyImportPreview(userId);
    console.log("[imports] legacy import dry run", preview);
    return preview;
  }
  if (!isValidUuid(userId)) return { found: 0, skipped: 0, candidates: [] };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("preview_legacy_import_candidates");
  if (error) {
    logSupabaseError("getLegacyImportPreview failed", error);
    return { found: 0, skipped: 0, candidates: [] };
  }
  const result = Array.isArray(data) ? data[0] : data;
  const preview = {
    found: Number(result?.found ?? 0),
    skipped: Number(result?.skipped ?? 0),
    candidates: Array.isArray(result?.candidates) ? result.candidates : [],
  };
  console.log("[imports] legacy import dry run", preview);
  return preview;
}

export async function assignLegacyImportBatch(
  userId: string
): Promise<{ success: boolean; import_batch_id?: string; workout_count: number; found?: number; tagged?: number; skipped?: number; error?: string }> {
  if (isDemo()) {
    const { storeAssignLegacyImport, storeLegacyImportPreview } = await import("@/lib/store");
    const preview = storeLegacyImportPreview(userId);
    const total = preview.found;
    console.log("[imports] legacy import backfill starting", {
      found: preview.found,
      skipped: preview.skipped,
    });
    if (total === 0) return { success: true, workout_count: 0, found: 0, tagged: 0, skipped: preview.skipped };
    const batch = storeAssignLegacyImport(userId, {
      id: crypto.randomUUID(),
      user_id: userId,
      created_at: new Date().toISOString(),
      source_file_name: "Legacy Import",
      workout_count: total,
      notes: "Generated for imported workouts that existed before import tracking.",
    });
    console.log("[imports] legacy import backfill complete", {
      found: preview.found,
      tagged: batch.workout_count,
      skipped: preview.skipped,
    });
    return {
      success: true,
      import_batch_id: batch.id,
      workout_count: batch.workout_count,
      found: preview.found,
      tagged: batch.workout_count,
      skipped: preview.skipped,
    };
  }
  if (!isValidUuid(userId)) {
    return { success: false, workout_count: 0, found: 0, tagged: 0, skipped: 0, error: "Invalid user id" };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("assign_legacy_import_batch");
  if (error) {
    logSupabaseError("assignLegacyImportBatch failed", error);
    return { success: false, workout_count: 0, error: error.message ?? "Legacy assignment failed" };
  }
  const result = Array.isArray(data) ? data[0] : data;
  console.log("[imports] legacy import backfill complete", {
    found: Number(result?.found ?? result?.workout_count ?? 0),
    tagged: Number(result?.tagged ?? result?.workout_count ?? 0),
    skipped: Number(result?.skipped ?? 0),
  });
  return {
    success: true,
    import_batch_id: result?.import_batch_id,
    workout_count: Number(result?.tagged ?? result?.workout_count ?? 0),
    found: Number(result?.found ?? result?.workout_count ?? 0),
    tagged: Number(result?.tagged ?? result?.workout_count ?? 0),
    skipped: Number(result?.skipped ?? 0),
  };
}

export async function deleteLegacyImportedHistory(
  userId: string
): Promise<{ success: boolean; import_batch_id?: string; sessions_deleted: number; sets_deleted: number; found: number; tagged: number; skipped: number; error?: string }> {
  const assigned = await assignLegacyImportBatch(userId);
  if (!assigned.success) {
    return {
      success: false,
      sessions_deleted: 0,
      sets_deleted: 0,
      found: 0,
      tagged: 0,
      skipped: 0,
      error: assigned.error ?? "Legacy assignment failed",
    };
  }

  if (!assigned.import_batch_id || assigned.workout_count === 0) {
    const preview = await getLegacyImportPreview(userId);
    return {
      success: true,
      sessions_deleted: 0,
      sets_deleted: 0,
      found: preview.found,
      tagged: 0,
      skipped: preview.skipped,
    };
  }

  const deleted = await undoImportBatch(userId, assigned.import_batch_id);
  if (!deleted.success) {
    return {
      success: false,
      import_batch_id: assigned.import_batch_id,
      sessions_deleted: 0,
      sets_deleted: 0,
      found: assigned.found ?? assigned.workout_count,
      tagged: assigned.tagged ?? assigned.workout_count,
      skipped: assigned.skipped ?? 0,
      error: deleted.error ?? "Legacy delete failed",
    };
  }

  console.log("[imports] legacy import delete complete", {
    found: assigned.workout_count,
    tagged: assigned.workout_count,
    skipped: 0,
    sessions_deleted: deleted.sessions_deleted,
    sets_deleted: deleted.sets_deleted,
  });

  return {
    success: true,
    import_batch_id: assigned.import_batch_id,
    sessions_deleted: deleted.sessions_deleted,
    sets_deleted: deleted.sets_deleted,
    found: assigned.found ?? assigned.workout_count,
    tagged: assigned.tagged ?? assigned.workout_count,
    skipped: assigned.skipped ?? 0,
  };
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

export async function createDefaultActivePhase(phase: TrainingPhase): Promise<TrainingPhase | null> {
  if (isDemo()) {
    const { storeAdvancePhase } = await import("@/lib/store");
    storeAdvancePhase(phase);
    return phase;
  }
  if (!isValidUuid(phase.user_id)) {
    console.error("[data] createDefaultActivePhase invalid userId", phase.user_id);
    return null;
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error: deactivateError } = await supabase
    .from("training_phases")
    .update({ is_active: false })
    .eq("user_id", phase.user_id);
  if (deactivateError) {
    logSupabaseError("createDefaultActivePhase deactivate failed", deactivateError);
    return null;
  }

  const { data, error: insertError } = await supabase
    .from("training_phases")
    .insert(phase)
    .select("*")
    .single();
  if (insertError || !data) {
    logSupabaseError("createDefaultActivePhase insert failed", insertError);
    return null;
  }
  return data;
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

export async function saveGeneratedRoutine(routine: GeneratedRoutine): Promise<{ saved: boolean; error?: string }> {
  if (isDemo()) {
    const { storeUpsertRoutine } = await import("@/lib/store");
    storeUpsertRoutine(routine);
    return { saved: true };
  }
  if (!isValidUuid(routine.user_id)) {
    console.error("[data] saveGeneratedRoutine invalid userId", routine.user_id);
    return { saved: false, error: "Invalid user id" };
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase.from("generated_routines").upsert(routine);
  if (error) {
    logSupabaseError("saveGeneratedRoutine failed", error);
    return { saved: false, error: error.message ?? "Routine save failed" };
  }
  return { saved: true };
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
  const equipment = await getEquipment();
  const equipmentById = new Map(equipment.map((item) => [item.id, item]));
  return (data ?? MOCK_EXERCISES).map((exercise) => ({
    ...exercise,
    status: mapExerciseStatus(exercise.notes, exercise.archived_at),
    library_category: exercise.library_category ?? "Strength",
    equipment: exercise.equipment_id ? equipmentById.get(exercise.equipment_id) : undefined,
  }));
}

function tagsForLibraryCategory(category: ExerciseLibraryCategory): WorkoutTag[] {
  switch (category) {
    case "Calisthenics":
      return ["home", "compound"];
    case "Home Workout":
      return ["home", "compound"];
    case "Running/Cardio":
      return ["core"];
    case "Warmup":
      return ["compound"];
    case "Recovery":
      return ["core"];
    case "Strength":
    default:
      return ["compound"];
  }
}

function normalizeAliases(value: string[] | string | undefined): string[] {
  const aliases = Array.isArray(value) ? value : (value ?? "").split(",");
  return Array.from(new Set(aliases.map((alias) => alias.trim()).filter(Boolean)));
}

function buildExerciseNotes(status: Exercise["status"], notes?: string) {
  const pieces = (notes ?? "")
    .split(";")
    .map((piece) => piece.trim())
    .filter((piece) => piece && !piece.startsWith("status:"));
  return [`status:${status ?? "active"}`, ...pieces].join(";");
}

export async function saveExerciseDefinition(input: {
  id?: string;
  name: string;
  aliases?: string[] | string;
  equipment_id?: string | null;
  status?: Exercise["status"];
  muscle_groups?: MuscleGroup[];
  tags?: WorkoutTag[];
  library_category?: ExerciseLibraryCategory;
  phase_order?: number;
  notes?: string;
}): Promise<{ success: boolean; exercise?: Exercise; duplicate?: Exercise; error?: string }> {
  const name = input.name.trim();
  const canonicalName = toCanonicalName(name);
  if (!name || !canonicalName) return { success: false, error: "Exercise name is required." };

  const libraryCategory = input.library_category ?? "Strength";
  const aliases = normalizeAliases(input.aliases);
  const tags = input.tags?.length ? input.tags : tagsForLibraryCategory(libraryCategory);
  const status = input.status ?? "active";

  if (isDemo()) {
    const { storeUpsertExercise } = await import("@/lib/store");
    const result = storeUpsertExercise({
      id: input.id,
      name,
      aliases,
      equipment_id: input.equipment_id ?? undefined,
      muscle_groups: input.muscle_groups ?? [],
      tags,
      library_category: libraryCategory,
      phase_order: input.phase_order,
      notes: buildExerciseNotes(status, input.notes),
    });
    if (result.duplicate) return { success: false, duplicate: result.duplicate, error: "An exercise with that name already exists." };
    return { success: true, exercise: result.exercise };
  }

  const existingExercises = await getExercises();
  const lower = name.toLowerCase();
  const duplicate = existingExercises.find(
    (exercise) =>
      exercise.id !== input.id &&
      (exercise.name.toLowerCase() === lower ||
        exercise.canonical_name === canonicalName ||
        exercise.aliases.some((alias) => alias.toLowerCase() === lower))
  );
  if (duplicate) {
    return { success: false, duplicate, error: "An exercise with that name already exists." };
  }

  const payload = {
    id: input.id ?? crypto.randomUUID(),
    name,
    canonical_name: canonicalName,
    aliases,
    equipment_id: input.equipment_id || null,
    muscle_groups: input.muscle_groups ?? [],
    tags,
    library_category: libraryCategory,
    phase_order: input.phase_order ?? 0,
    archived_at: status === "archived" ? new Date().toISOString() : null,
    notes: buildExerciseNotes(status, input.notes),
    created_at: new Date().toISOString(),
  };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const query = input.id
    ? supabase.from("exercise_definitions").update(payload).eq("id", input.id).select("*").single()
    : supabase.from("exercise_definitions").insert(payload).select("*").single();
  const { data, error } = await query;
  if (error || !data) {
    logSupabaseError("saveExerciseDefinition failed", error);
    return { success: false, error: error?.message ?? "Exercise save failed." };
  }
  const equipment = data.equipment_id ? (await getEquipment()).find((item) => item.id === data.equipment_id) : undefined;
  return {
    success: true,
    exercise: {
      ...data,
      status: mapExerciseStatus(data.notes, data.archived_at),
      library_category: data.library_category ?? "Strength",
      equipment,
    },
  };
}

export async function archiveExerciseDefinition(id: string): Promise<{ success: boolean; exercise?: Exercise; error?: string }> {
  if (isDemo()) {
    const { storeArchiveExercise } = await import("@/lib/store");
    const exercise = storeArchiveExercise(id);
    return exercise ? { success: true, exercise } : { success: false, error: "Exercise not found." };
  }

  const existing = (await getExercises()).find((exercise) => exercise.id === id);
  if (!existing) return { success: false, error: "Exercise not found." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercise_definitions")
    .update({
      archived_at: new Date().toISOString(),
      notes: buildExerciseNotes("archived", existing.notes),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    logSupabaseError("archiveExerciseDefinition failed", error);
    return { success: false, error: error?.message ?? "Archive failed." };
  }
  const equipment = data.equipment_id ? (await getEquipment()).find((item) => item.id === data.equipment_id) : undefined;
  return { success: true, exercise: { ...data, status: "archived", library_category: data.library_category ?? "Strength", equipment } };
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
  const result = await insertSessionWithSetsIfNew(session, sets);
  if (result.error) {
    throw new Error(result.error);
  }
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

  let { error: sessionError } = await supabase.from("workout_sessions").insert(session);
  if (sessionError && session.workout_type) {
    const message = "message" in sessionError ? String(sessionError.message ?? "") : "";
    if (message.includes("workout_type")) {
      console.warn("[data] workout_sessions.workout_type is missing; retrying session insert without that column. Apply migration 008 to store workout_type separately.");
      const { workout_type: _workoutType, ...sessionWithoutWorkoutType } = session;
      const retry = await supabase.from("workout_sessions").insert(sessionWithoutWorkoutType);
      sessionError = retry.error;
    }
  }
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
      error: code === "23505" ? undefined : sessionError.message ?? "Session insert failed",
    };
  }
  if (sets.length > 0) {
    const { error: setsError } = await supabase.from("workout_sets").insert(sets);
    if (setsError) {
      logSupabaseError("insertSessionWithSets sets insert failed", setsError);
      const { error: rollbackError } = await supabase
        .from("workout_sessions")
        .delete()
        .eq("id", session.id)
        .eq("user_id", session.user_id);
      if (rollbackError) logSupabaseError("insertSessionWithSets rollback failed", rollbackError);
      return {
        inserted: false,
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
