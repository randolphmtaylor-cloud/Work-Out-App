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
  Exercise,
  CanonicalExercise,
  ExerciseCanonicalMapping,
  ImportBatch,
  LegacyImportPreview,
  ExerciseLibraryCategory,
  MuscleGroup,
  WorkoutTag,
} from "@/types";
import {
  MOCK_SESSIONS,
  MOCK_SETS,
  MOCK_PHASES,
  MOCK_ACTIVE_PHASE,
  MOCK_LATEST_SUMMARY,
  MOCK_EXERCISES,
} from "@/lib/mock-data";
import { DEFAULT_CANONICAL_EXERCISES } from "@/lib/canonical-exercises";

// ---- Mutable store (module-level, server-side only) ----
const store = {
  sessions: [...MOCK_SESSIONS] as WorkoutSession[],
  sets:     [...MOCK_SETS]     as WorkoutSet[],
  phases:   [...MOCK_PHASES]   as TrainingPhase[],
  routines: []                 as GeneratedRoutine[],
  summaries: [MOCK_LATEST_SUMMARY] as WeeklySummary[],
  exercises: [...MOCK_EXERCISES] as Exercise[],
  canonicalExercises: [...DEFAULT_CANONICAL_EXERCISES] as CanonicalExercise[],
  canonicalMappings: [] as ExerciseCanonicalMapping[],
  imports: [] as ImportBatch[],
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

export function storeSessionExistsBySourceId(userId: string, sourceId: string): boolean {
  return store.sessions.some((s) => s.user_id === userId && s.source_id === sourceId);
}

export function storeSessionById(userId: string, sessionId: string): WorkoutSession | null {
  return store.sessions.find((session) => session.user_id === userId && session.id === sessionId) ?? null;
}

export function storeUpdateSessionWithSets(
  userId: string,
  session: WorkoutSession,
  sets: WorkoutSet[]
): WorkoutSession | null {
  const idx = store.sessions.findIndex((item) => item.user_id === userId && item.id === session.id);
  if (idx === -1) return null;
  store.sessions[idx] = { ...store.sessions[idx], ...session, user_id: userId };
  store.sets = store.sets.filter((set) => set.session_id !== session.id);
  store.sets.push(...sets);
  return store.sessions[idx];
}

export function storeDeleteSession(userId: string, sessionId: string): { sessions_deleted: number; sets_deleted: number } {
  const session = store.sessions.find((item) => item.user_id === userId && item.id === sessionId);
  if (!session) return { sessions_deleted: 0, sets_deleted: 0 };
  const setsDeleted = store.sets.filter((set) => set.session_id === sessionId).length;
  store.sets = store.sets.filter((set) => set.session_id !== sessionId);
  store.sessions = store.sessions.filter((item) => item.id !== sessionId);
  return { sessions_deleted: 1, sets_deleted: setsDeleted };
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
  const existingSourceIds = new Set(
    store.sets.map((s) => s.source_id).filter((sourceId): sourceId is string => Boolean(sourceId))
  );
  store.sets.push(
    ...sets.filter((s) => {
      if (existingIds.has(s.id)) return false;
      if (s.source_id && existingSourceIds.has(s.source_id)) return false;
      return true;
    })
  );
}

export function storeUpdateSet(id: string, patch: Partial<WorkoutSet>): void {
  const idx = store.sets.findIndex((s) => s.id === id);
  if (idx !== -1) store.sets[idx] = { ...store.sets[idx], ...patch };
}

// ---- Imports ----
export function storeCreateImportBatch(batch: ImportBatch): ImportBatch {
  store.imports = store.imports.filter((item) => item.id !== batch.id);
  store.imports.push(batch);
  return batch;
}

export function storeImportBatches(userId: string): ImportBatch[] {
  return store.imports
    .filter((item) => item.user_id === userId)
    .map((item) => {
      const sessions = store.sessions.filter((session) => session.import_batch_id === item.id);
      const sessionIds = new Set(sessions.map((session) => session.id));
      return {
        ...item,
        session_count: sessions.length,
        set_count: store.sets.filter((set) => sessionIds.has(set.session_id)).length,
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function storeUpdateImportBatch(
  userId: string,
  importId: string,
  patch: Pick<Partial<ImportBatch>, "source_file_name" | "notes" | "workout_count">
): ImportBatch | null {
  const idx = store.imports.findIndex((item) => item.user_id === userId && item.id === importId);
  if (idx === -1) return null;
  store.imports[idx] = { ...store.imports[idx], ...patch };
  return store.imports[idx];
}

export function storeUndoAllImportBatches(userId: string): {
  batches_deleted: number;
  sessions_deleted: number;
  sets_deleted: number;
} {
  const batchIds = new Set(store.imports.filter((item) => item.user_id === userId).map((item) => item.id));
  const sessionIds = new Set(
    store.sessions
      .filter((session) => session.user_id === userId && session.import_batch_id && batchIds.has(session.import_batch_id))
      .map((session) => session.id)
  );
  const setsDeleted = store.sets.filter((set) => sessionIds.has(set.session_id)).length;
  store.sets = store.sets.filter((set) => !sessionIds.has(set.session_id));
  store.sessions = store.sessions.filter((session) => !sessionIds.has(session.id));
  store.imports = store.imports.filter((item) => item.user_id !== userId);
  return {
    batches_deleted: batchIds.size,
    sessions_deleted: sessionIds.size,
    sets_deleted: setsDeleted,
  };
}

export function storeUndoImportBatch(userId: string, importId: string): { sessions_deleted: number; sets_deleted: number } {
  const sessionIds = new Set(
    store.sessions
      .filter((session) => session.user_id === userId && session.import_batch_id === importId)
      .map((session) => session.id)
  );
  const setsDeleted = store.sets.filter((set) => sessionIds.has(set.session_id)).length;
  store.sets = store.sets.filter((set) => !sessionIds.has(set.session_id));
  store.sessions = store.sessions.filter((session) => !sessionIds.has(session.id));
  store.imports = store.imports.filter((item) => !(item.user_id === userId && item.id === importId));
  return { sessions_deleted: sessionIds.size, sets_deleted: setsDeleted };
}

export function storeResetWorkoutHistory(userId: string): {
  sessions_deleted: number;
  sets_deleted: number;
  imports_deleted: number;
  summaries_deleted: number;
  routines_deleted: number;
} {
  const sessionIds = new Set(store.sessions.filter((session) => session.user_id === userId).map((session) => session.id));
  const setsDeleted = store.sets.filter((set) => sessionIds.has(set.session_id)).length;
  const summariesDeleted = store.summaries.filter((summary) => summary.user_id === userId).length;
  const routinesDeleted = store.routines.filter((routine) => routine.user_id === userId).length;
  const importsDeleted = store.imports.filter((item) => item.user_id === userId).length;

  store.sets = store.sets.filter((set) => !sessionIds.has(set.session_id));
  store.sessions = store.sessions.filter((session) => session.user_id !== userId);
  store.summaries = store.summaries.filter((summary) => summary.user_id !== userId);
  store.routines = store.routines.filter((routine) => routine.user_id !== userId);
  store.imports = store.imports.filter((item) => item.user_id !== userId);

  return {
    sessions_deleted: sessionIds.size,
    sets_deleted: setsDeleted,
    imports_deleted: importsDeleted,
    summaries_deleted: summariesDeleted,
    routines_deleted: routinesDeleted,
  };
}

function legacyImportReason(session: WorkoutSession): string | null {
  const reasons = [
    session.source.startsWith("import_") ? `source=${session.source}` : null,
    session.imported_at ? "imported_at" : null,
    session.import_batch ? "import_batch" : null,
    session.source_id ? "source_id" : null,
    session.notes?.toLowerCase().includes("import") ? "notes mention import" : null,
    session.raw_text?.toLowerCase().includes("import") ? "raw_text mention import" : null,
  ].filter((reason): reason is string => Boolean(reason));
  return reasons.length > 0 ? reasons.join(", ") : null;
}

export function storeLegacyImportPreview(userId: string): LegacyImportPreview {
  const untaggedSessions = store.sessions.filter(
    (session) => session.user_id === userId && !session.import_batch_id
  );
  const candidates = untaggedSessions
    .map((session) => ({ session, reason: legacyImportReason(session) }))
    .filter((item): item is { session: WorkoutSession; reason: string } => Boolean(item.reason));

  return {
    found: candidates.length,
    skipped: untaggedSessions.length - candidates.length,
    candidates: candidates.slice(0, 25).map(({ session, reason }) => ({
      id: session.id,
      date: session.date,
      source: session.source,
      notes: session.notes,
      reason,
    })),
  };
}

export function storeLegacyImportCandidateCount(userId: string): number {
  return storeLegacyImportPreview(userId).found;
}

export function storeAssignLegacyImport(userId: string, batch: ImportBatch): ImportBatch {
  const legacySessionIds = new Set<string>();
  store.sessions = store.sessions.map((session) => {
    const isLegacy =
      session.user_id === userId &&
      !session.import_batch_id &&
      Boolean(legacyImportReason(session));
    if (!isLegacy) return session;
    legacySessionIds.add(session.id);
    return { ...session, import_batch_id: batch.id };
  });
  store.sets = store.sets.map((set) =>
    legacySessionIds.has(set.session_id) && !set.import_batch_id ? { ...set, import_batch_id: batch.id } : set
  );
  return storeCreateImportBatch({ ...batch, workout_count: legacySessionIds.size });
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

// ---- Exercises ----
export function storeExercises(): Exercise[] {
  return [...store.exercises];
}

export function storeUpsertExercise(input: {
  id?: string;
  name: string;
  aliases: string[];
  equipment_id?: string | null;
  muscle_groups?: MuscleGroup[];
  tags: WorkoutTag[];
  library_category: ExerciseLibraryCategory;
  phase_order?: number;
  notes?: string;
}): { exercise: Exercise; created: boolean; duplicate?: Exercise } {
  const canonical = toCanonicalName(input.name);
  const lower = input.name.trim().toLowerCase();
  const duplicate = store.exercises.find(
    (exercise) =>
      exercise.id !== input.id &&
      (exercise.name.toLowerCase() === lower ||
        exercise.canonical_name === canonical ||
        exercise.aliases.some((alias) => alias.toLowerCase() === lower))
  );
  if (duplicate) {
    return { exercise: duplicate, created: false, duplicate };
  }

  const now = new Date().toISOString();
  if (input.id) {
    const idx = store.exercises.findIndex((exercise) => exercise.id === input.id);
    if (idx !== -1) {
      store.exercises[idx] = {
        ...store.exercises[idx],
        name: input.name,
        canonical_name: canonical,
        aliases: input.aliases,
        equipment_id: input.equipment_id ?? undefined,
        muscle_groups: input.muscle_groups ?? store.exercises[idx].muscle_groups,
        tags: input.tags,
        library_category: input.library_category,
        phase_order: input.phase_order,
        notes: input.notes,
        status: input.notes?.includes("status:archived")
          ? "archived"
          : input.notes?.includes("status:unreviewed")
            ? "unreviewed"
            : "active",
        archived_at: input.notes?.includes("status:archived") ? (store.exercises[idx].archived_at ?? now) : undefined,
      };
      return { exercise: store.exercises[idx], created: false };
    }
  }

  const created: Exercise = {
    id: crypto.randomUUID(),
    name: input.name,
    canonical_name: canonical,
    aliases: input.aliases,
    equipment_id: input.equipment_id ?? undefined,
    muscle_groups: input.muscle_groups ?? [],
    tags: input.tags,
    library_category: input.library_category,
    phase_order: input.phase_order,
    notes: input.notes ?? "status:active",
    status: "active",
    created_at: now,
  };
  store.exercises.push(created);
  return { exercise: created, created: true };
}

export function storeArchiveExercise(id: string): Exercise | null {
  const idx = store.exercises.findIndex((exercise) => exercise.id === id);
  if (idx === -1) return null;
  store.exercises[idx] = {
    ...store.exercises[idx],
    status: "archived",
    archived_at: new Date().toISOString(),
    notes: mergeStatusNote(store.exercises[idx].notes, "archived"),
  };
  return store.exercises[idx];
}

export function storeFindExerciseByCanonical(canonicalName: string): Exercise | null {
  return store.exercises.find((e) => e.canonical_name === canonicalName) ?? null;
}

export function storeFindExerciseByNameOrAlias(name: string): Exercise | null {
  const lower = name.trim().toLowerCase();
  return (
    store.exercises.find(
      (e) =>
        e.name.toLowerCase() === lower ||
        e.canonical_name.toLowerCase() === lower ||
        e.aliases.some((a) => a.toLowerCase() === lower)
    ) ?? null
  );
}

export function storeCreateUnreviewedExercise(name: string, aliases: string[]): Exercise {
  const canonical = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const existing = storeFindExerciseByCanonical(canonical);
  if (existing) return existing;

  const created: Exercise = {
    id: crypto.randomUUID(),
    name,
    canonical_name: canonical,
    aliases: Array.from(new Set(aliases.map((a) => a.trim()).filter(Boolean))),
    muscle_groups: [],
    tags: [],
    notes: "status:unreviewed",
    status: "unreviewed",
    created_at: new Date().toISOString(),
  };

  store.exercises.push(created);
  return created;
}

export function storeUnreviewedExercises(): Exercise[] {
  return store.exercises.filter((e) => e.status === "unreviewed" || e.notes?.includes("status:unreviewed"));
}

// ---- Canonical exercises / mappings ----
export function storeCanonicalExercises(): CanonicalExercise[] {
  return [...store.canonicalExercises];
}

export function storeCanonicalMappings(): ExerciseCanonicalMapping[] {
  return [...store.canonicalMappings];
}

function toCanonicalName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function mergeStatusNote(notes: string | undefined, status: Exercise["status"]) {
  const pieces = (notes ?? "")
    .split(";")
    .map((piece) => piece.trim())
    .filter((piece) => piece && !piece.startsWith("status:"));
  return [`status:${status}`, ...pieces].join(";");
}

function ensureExerciseForCanonical(canonical: CanonicalExercise): Exercise {
  const existing =
    store.exercises.find((e) => e.name.toLowerCase() === canonical.name.toLowerCase()) ??
    store.exercises.find((e) => e.canonical_name === toCanonicalName(canonical.name));
  if (existing) return existing;

  const created: Exercise = {
    id: crypto.randomUUID(),
    name: canonical.name,
    canonical_name: toCanonicalName(canonical.name),
    aliases: [canonical.name],
    muscle_groups: [],
    tags: [canonical.category === "other" ? "compound" : canonical.category],
    created_at: new Date().toISOString(),
    status: "active",
  };
  store.exercises.push(created);
  return created;
}

export function storeMapExerciseToCanonical(
  exerciseId: string,
  canonicalExerciseId: string
): { remappedSets: number } {
  const canonical = store.canonicalExercises.find((c) => c.id === canonicalExerciseId);
  if (!canonical) return { remappedSets: 0 };
  const source = store.exercises.find((e) => e.id === exerciseId);
  if (!source) return { remappedSets: 0 };

  const canonicalExercise = ensureExerciseForCanonical(canonical);
  if (source.id === canonicalExercise.id) {
    return { remappedSets: 0 };
  }

  let remappedSets = 0;
  store.sets = store.sets.map((set) => {
    if (set.exercise_id === source.id) {
      remappedSets += 1;
      return { ...set, exercise_id: canonicalExercise.id };
    }
    return set;
  });

  store.canonicalMappings = [
    ...store.canonicalMappings.filter((m) => m.exercise_id !== source.id),
    {
      id: crypto.randomUUID(),
      exercise_id: source.id,
      canonical_exercise_id: canonicalExerciseId,
      created_at: new Date().toISOString(),
    },
  ];

  source.notes = `status:mapped;canonical:${canonical.name}`;
  source.status = "active";
  source.aliases = Array.from(new Set([...source.aliases, source.name]));

  return { remappedSets };
}
